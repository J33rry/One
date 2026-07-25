import { getChatParticipantUserIds } from "../modules/chats/chats.repository.js";

// In-memory connection registry: userId → Set<WebSocket>
// Supports multi-device: one user can have multiple active sockets.
//
// For horizontal scaling (multiple server instances), replace this with
// Redis pub/sub: publish events to a channel per userId, and each server
// instance subscribes to channels for its connected users. This module
// becomes a thin adapter that publishes to Redis instead of sending
// directly, and a subscriber loop delivers to local sockets.

const connections = new Map();

export function addConnection(userId, ws) {
    if (!connections.has(userId)) {
        connections.set(userId, new Set());
    }
    connections.get(userId).add(ws);
}

export function removeConnection(userId, ws) {
    const sockets = connections.get(userId);
    if (!sockets) return;
    sockets.delete(ws);
    if (sockets.size === 0) connections.delete(userId);
}

export function getConnections(userId) {
    return connections.get(userId) || new Set();
}

export function isOnline(userId) {
    return connections.has(userId) && connections.get(userId).size > 0;
}

export function broadcastToUser(userId, event) {
    const sockets = getConnections(userId);
    const data = JSON.stringify(event);
    for (const ws of sockets) {
        if (ws.readyState === 1) ws.send(data);
    }
}

// Fan-out to all participants of a chat except the sender.
// Fetches participant list from DB so it's always current.
export async function broadcastToChat(chatId, event, excludeUserId) {
    const participantIds = await getChatParticipantUserIds(chatId);
    const data = JSON.stringify(event);

    for (const userId of participantIds) {
        if (userId === excludeUserId) continue;
        const sockets = getConnections(userId);
        for (const ws of sockets) {
            if (ws.readyState === 1) ws.send(data);
        }
    }
}

export function getOnlineUserIds() {
    return [...connections.keys()];
}
