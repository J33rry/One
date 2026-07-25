import { broadcastToChat } from "../connectionRegistry.js";

export async function handleTypingEvent(ws, event) {
    const { type, payload } = event;
    const userId = ws.userId;

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
