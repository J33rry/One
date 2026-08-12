import { broadcastToChat } from "../connectionRegistry.js";
import * as messagesService from "../../modules/messages/messages.service.js";

export async function handleMessageEvent(ws, event) {
    const { type, payload } = event;
    const userId = ws.userId;

    switch (type) {
        case "message:new": {
            const message = await messagesService.sendMessage(
                payload.chatId,
                userId,
                payload,
            );
            broadcastToChat(payload.chatId, { type: "message:new", payload: message }, userId);
            ws.send(JSON.stringify({ type: "message:new:ack", payload: message }));
            break;
        }

        case "message:edit": {
            const message = await messagesService.editMessage(
                payload.messageId,
                userId,
                payload.content,
            );
            broadcastToChat(payload.chatId, { type: "message:edit", payload: message }, userId);
            break;
        }

        case "message:delete": {
            await messagesService.deleteMessage(payload.messageId, userId);
            broadcastToChat(payload.chatId, {
                type: "message:delete",
                payload: { id: payload.messageId, chatId: payload.chatId },
            }, userId);
            break;
        }

        case "message:reaction": {
            if (payload.action === "add") {
                await messagesService.addReaction(
                    payload.messageId,
                    userId,
                    payload.reaction,
                );
            } else {
                await messagesService.removeReaction(
                    payload.messageId,
                    userId,
                    payload.reaction,
                );
            }
            broadcastToChat(payload.chatId, {
                type: "message:reaction",
                payload: { ...payload, userId },
            }, userId);
            break;
        }

        case "message:status": {
            if (payload.status === "read") {
                await messagesService.markRead(
                    payload.chatId,
                    payload.messageIds,
                    userId,
                );
            }
            broadcastToChat(payload.chatId, {
                type: "message:status",
                payload: { ...payload, userId },
            }, userId);
            break;
        }
    }
}
