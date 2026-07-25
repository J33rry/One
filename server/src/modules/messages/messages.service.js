import { AppError } from "../../lib/AppError.js";
import * as repo from "./messages.repository.js";
import { isBlocked } from "../blocked/blocked.repository.js";
import { findChatById, getChatParticipantUserIds } from "../chats/chats.repository.js";

export async function getMessages(chatId, pagination) {
    return repo.findMessages(chatId, pagination);
}

export async function sendMessage(chatId, senderId, data) {
    const chat = await findChatById(chatId);

    if (chat.type === "dm") {
        const participantIds = await getChatParticipantUserIds(chatId);
        const otherUserId = participantIds.find(id => id !== senderId);
        if (otherUserId) {
            const senderBlockedOther = await isBlocked(senderId, otherUserId);
            if (senderBlockedOther) throw new AppError(403, "You have blocked this user", "BLOCKED");
            const otherBlockedSender = await isBlocked(otherUserId, senderId);
            if (otherBlockedSender) throw new AppError(403, "You are blocked by this user", "BLOCKED");
        }
    }

    return repo.createMessage({
        chatId,
        senderId,
        type: data.type,
        content: data.content,
        mediaId: data.mediaId || null,
        replyToMessageId: data.replyToMessageId || null,
    });
}

export async function editMessage(messageId, userId, content) {
    const message = await repo.findMessageById(messageId);
    if (!message) throw new AppError(404, "Message not found", "NOT_FOUND");
    if (message.senderId !== userId) {
        throw new AppError(403, "Can only edit your own messages", "FORBIDDEN");
    }
    if (message.isDeleted) {
        throw new AppError(400, "Cannot edit a deleted message", "MESSAGE_DELETED");
    }

    return repo.updateMessage(messageId, { content, isEdited: true });
}

export async function deleteMessage(messageId, userId) {
    const message = await repo.findMessageById(messageId);
    if (!message) throw new AppError(404, "Message not found", "NOT_FOUND");
    if (message.senderId !== userId) {
        throw new AppError(403, "Can only delete your own messages", "FORBIDDEN");
    }

    return repo.softDeleteMessage(messageId);
}

export async function addReaction(messageId, userId, reaction) {
    const message = await repo.findMessageById(messageId);
    if (!message) throw new AppError(404, "Message not found", "NOT_FOUND");

    return repo.upsertReaction(messageId, userId, reaction);
}

export async function removeReaction(messageId, userId, reaction) {
    await repo.removeReaction(messageId, userId, reaction);
}

export async function markRead(chatId, messageIds, userId) {
    await repo.markRead(messageIds, userId);
}
