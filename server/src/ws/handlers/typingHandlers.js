import { broadcastToChat } from "../connectionRegistry.js";

export async function handleTypingEvent(socket, type, payload) {
    const userId = socket.data.userId;

    // typing:start and typing:stop are ephemeral — no persistence,
    // just fan out to other chat participants
    if (type === "typing:start" || type === "typing:stop") {
        broadcastToChat(
            payload.chatId,
            { type, payload: { chatId: payload.chatId, userId } },
            userId,
        );
    }
}
