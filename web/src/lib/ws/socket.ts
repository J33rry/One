type WSCallback = (payload: unknown) => void;

class SocketClient {
    private ws: WebSocket | null = null;
    private url: string;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectTimeout = 1000;
    private listeners: Map<string, Set<WSCallback>> = new Map();
    private isIntentionalClose = false;

    constructor() {
        // Determine WS URL based on API URL
        const apiUrl =
            process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";
        this.url = apiUrl.replace(/^http/, "ws") + "/ws";
    }

    public connect() {
        if (
            this.ws &&
            (this.ws.readyState === WebSocket.CONNECTING ||
                this.ws.readyState === WebSocket.OPEN)
        ) {
            return;
        }

        this.isIntentionalClose = false;
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
            console.log("[WS] Connected");
            this.reconnectAttempts = 0;
            this.reconnectTimeout = 1000;
        };

        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data && data.type) {
                    this.emit(data.type, data.payload);
                }
            } catch (e) {
                console.error("[WS] Failed to parse message", e);
            }
        };

        this.ws.onclose = () => {
            console.log("[WS] Disconnected");
            this.ws = null;
            if (!this.isIntentionalClose) {
                this.attemptReconnect();
            }
        };

        this.ws.onerror = (error) => {
            console.error("[WS] Error", error);
        };
    }

    private attemptReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.log("[WS] Max reconnect attempts reached");
            return;
        }

        console.log(`[WS] Reconnecting in ${this.reconnectTimeout}ms...`);
        setTimeout(() => {
            this.reconnectAttempts++;
            this.reconnectTimeout = Math.min(this.reconnectTimeout * 2, 30000); // max 30s backoff
            this.connect();
        }, this.reconnectTimeout);
    }

    public disconnect() {
        this.isIntentionalClose = true;
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    public send(type: string, payload: unknown = {}) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type, payload }));
        } else {
            console.warn("[WS] Cannot send message, socket not open");
        }
    }

    public on(event: string, callback: WSCallback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)?.add(callback);
        return () => this.off(event, callback);
    }

    public off(event: string, callback: WSCallback) {
        this.listeners.get(event)?.delete(callback);
    }

    private emit(event: string, payload: unknown) {
        this.listeners.get(event)?.forEach((cb) => cb(payload));
    }
}

export const socketClient = new SocketClient();
