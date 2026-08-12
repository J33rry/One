import { WebSocketServer } from "ws";
import {
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

const HEARTBEAT_INTERVAL = 30_000;

export function setupWebSocketGateway(httpServer, sessionMiddleware) {
    const wss = new WebSocketServer({ noServer: true });

    // Authenticate on HTTP upgrade by running session middleware on the
    // raw upgrade request. The session cookie is parsed from the headers,
    // verified against the Redis store, and attached to request.session.
    httpServer.on("upgrade", (request, socket, head) => {
        sessionMiddleware(request, {}, () => {
            if (!request.session?.userId) {
                console.error("[WS] Upgrade failed: No session userId found. Headers:", request.headers);
                socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
                socket.destroy();
                return;
            }

            wss.handleUpgrade(request, socket, head, (ws) => {
                wss.emit("connection", ws, request);
            });
        });
    });

    wss.on("connection", (ws, request) => {
        const userId = request.session.userId;
        ws.userId = userId;
        ws.isAlive = true;

        const wasAlreadyOnline = isOnline(userId);
        addConnection(userId, ws);

        // Send initial presence sync with all online users to this socket
        ws.send(
            JSON.stringify({
                type: "presence:sync",
                payload: { onlineUserIds: getOnlineUserIds() },
            })
        );

        // Notify contacts & chat peers of online status if user just came online
        if (!wasAlreadyOnline) {
            handlePresenceEvent(userId, "online");
        }

        ws.on("pong", () => {
            ws.isAlive = true;
        });

        ws.on("message", async (raw) => {
            try {
                const event = JSON.parse(raw.toString());

                // Route events to the appropriate handler by type prefix
                const [domain] = event.type.split(":");

                switch (domain) {
                    case "message":
                        await handleMessageEvent(ws, event);
                        break;
                    case "typing":
                        await handleTypingEvent(ws, event);
                        break;
                    case "call":
                        await handleCallEvent(ws, event);
                        break;
                    default:
                        ws.send(
                            JSON.stringify({
                                type: "error",
                                payload: { message: `Unknown event domain: ${domain}` },
                            }),
                        );
                }
            } catch (err) {
                ws.send(
                    JSON.stringify({
                        type: "error",
                        payload: { message: "Invalid message format" },
                    }),
                );
            }
        });

        ws.on("close", async () => {
            removeConnection(userId, ws);
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

    // Heartbeat: detect broken connections
    const interval = setInterval(() => {
        for (const ws of wss.clients) {
            if (!ws.isAlive) {
                removeConnection(ws.userId, ws);
                return ws.terminate();
            }
            ws.isAlive = false;
            ws.ping();
        }
    }, HEARTBEAT_INTERVAL);

    wss.on("close", () => clearInterval(interval));

    return wss;
}
