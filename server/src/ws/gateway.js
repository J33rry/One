import { Server } from "socket.io";
import { env } from "../config/env.js";
import {
    setIoServer,
    addConnection,
    removeConnection,
    isOnline,
    getOnlineUserIds,
} from "./connectionRegistry.js";
import { handleMessageEvent } from "./handlers/messageHandlers.js";
import { handleTypingEvent } from "./handlers/typingHandlers.js";
import { handleCallEvent } from "./handlers/callHandlers.js";
import { handlePresenceEvent } from "./handlers/presenceHandlers.js";
import { updateLastSeen } from "../modules/users/users.repository.js";

export const SOCKET_PATH = "/ws";

// Inbound events the client is allowed to emit, grouped by the handler that
// owns them. Socket.IO has no notion of an "unknown event", so this allowlist
// is what keeps the surface explicit.
const EVENT_ROUTES = [
    [
        handleMessageEvent,
        [
            "message:new",
            "message:edit",
            "message:delete",
            "message:reaction",
            "message:status",
        ],
    ],
    [handleTypingEvent, ["typing:start", "typing:stop"]],
    [
        handleCallEvent,
        [
            "call:incoming",
            "call:participant-joined",
            "call:participant-left",
            "call:ended",
            "call:rejected",
        ],
    ],
];

export function setupWebSocketGateway(httpServer, sessionMiddleware) {
    const io = new Server(httpServer, {
        path: SOCKET_PATH,
        cors: { origin: env.CORS_ORIGIN, credentials: true },
    });

    setIoServer(io);

    // Run the express session middleware on every engine request so the
    // session cookie is parsed from the headers and verified against the
    // Redis store, exposing it as socket.request.session.
    io.engine.use(sessionMiddleware);

    io.use((socket, next) => {
        if (!socket.request.session?.userId) {
            console.error(
                "[WS] Handshake rejected: no session userId. Headers:",
                socket.request.headers,
            );
            next(new Error("Unauthorized"));
            return;
        }
        next();
    });

    io.on("connection", (socket) => {
        const userId = socket.request.session.userId;
        socket.data.userId = userId;

        const wasAlreadyOnline = isOnline(userId);
        addConnection(userId, socket);

        // Send initial presence sync with all online users to this socket
        socket.emit("presence:sync", { onlineUserIds: getOnlineUserIds() });

        // Notify contacts & chat peers of online status if user just came online
        if (!wasAlreadyOnline) {
            handlePresenceEvent(userId, "online");
        }

        for (const [handler, events] of EVENT_ROUTES) {
            for (const event of events) {
                socket.on(event, async (payload) => {
                    try {
                        await handler(socket, event, payload ?? {});
                    } catch (err) {
                        console.error(`[WS] Error handling ${event}:`, err);
                        socket.emit("error", {
                            message: `Failed to process ${event}`,
                        });
                    }
                });
            }
        }

        socket.on("disconnect", async () => {
            removeConnection(userId, socket);
            if (!isOnline(userId)) {
                try {
                    const lastSeenAt = await updateLastSeen(userId);
                    handlePresenceEvent(userId, "offline", lastSeenAt);
                } catch (e) {
                    handlePresenceEvent(userId, "offline");
                }
            }
        });
    });

    return io;
}
