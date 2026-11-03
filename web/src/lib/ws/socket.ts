import { io, type Socket } from "socket.io-client";

type WSCallback = (payload: unknown) => void;

const SOCKET_PATH = "/ws";

class SocketClient {
    private socket: Socket | null = null;

    // The socket is created on first use rather than at module load so that
    // nothing touches the browser-only socket.io runtime during SSR.
    private get instance(): Socket {
        if (this.socket) return this.socket;

        const url =
            process.env.NEXT_PUBLIC_WEBSOCKET_URL || "http://localhost:3002";

        this.socket = io(url, {
            path: SOCKET_PATH,
            // Sends the session cookie on the handshake (cross-origin in dev).
            withCredentials: true,
            autoConnect: false,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 30000,
        });

        this.socket.on("connect", () => console.log("[WS] Connected"));
        this.socket.on("disconnect", (reason) =>
            console.log("[WS] Disconnected:", reason),
        );
        this.socket.on("connect_error", (error) =>
            console.error("[WS] Error", error.message),
        );

        return this.socket;
    }

    public connect() {
        this.instance.connect();
    }

    public disconnect() {
        this.socket?.disconnect();
    }

    // Emits made while offline are buffered by socket.io and flushed on connect.
    public send(type: string, payload: unknown = {}) {
        this.instance.emit(type, payload);
    }

    public on(event: string, callback: WSCallback) {
        this.instance.on(event, callback);
        return () => this.off(event, callback);
    }

    public off(event: string, callback: WSCallback) {
        this.socket?.off(event, callback);
    }
}

export const socketClient = new SocketClient();
