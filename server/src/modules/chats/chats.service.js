import { AppError } from "../../lib/AppError.js";
import * as repo from "./chats.repository.js";
import { isBlocked } from "../blocked/blocked.repository.js";
import { broadcastToChat, broadcastToUser } from "../../ws/connectionRegistry.js";
import { findLatestMessageForChat } from "../messages/messages.repository.js";

function mapParticipants(rawParticipants) {
    return rawParticipants.map(p => ({
        id: p.id,
        userId: p.userId,
        chatId: p.chatId,
        role: p.role,
        joinedAt: p.joinedAt,
        user: {
            id: p.userId,
            username: p.username,
            displayName: p.displayName,
            avatarUrl: p.avatarUrl,
            lastSeenAt: p.lastSeenAt,
        }
    }));
}

export async function listChats(userId) {
    const userChats = await repo.findUserChats(userId);
    const chats = await Promise.all(userChats.map(async ({ chat, role }) => {
        const rawParticipants = await repo.findChatParticipants(chat.id);
        const latestMessage = await findLatestMessageForChat(chat.id);
        
        let blocked = false;
        if (chat.type === "dm") {
            const otherParticipant = rawParticipants.find(p => p.userId !== userId);
            if (otherParticipant) {
                blocked = await isBlocked(userId, otherParticipant.userId) || await isBlocked(otherParticipant.userId, userId);
            }
        }
        
        return {
            ...chat,
            myRole: role,
            isBlocked: blocked,
            participants: mapParticipants(rawParticipants),
            latestMessage,
        };
    }));
    return chats;
}

export async function createChat(userId, { type, name, description, participantIds }) {
    if (type === "dm") {
        if (participantIds.length !== 1) {
            throw new AppError(400, "DM requires exactly one other participant", "INVALID_DM");
        }

        const otherUserId = participantIds[0];

        // Check blocking in either direction
        if (await isBlocked(userId, otherUserId) || await isBlocked(otherUserId, userId)) {
            throw new AppError(403, "Cannot create DM with this user", "BLOCKED");
        }

        // Check for existing DM
        const existingDmId = await repo.findDmBetween(userId, otherUserId);
        if (existingDmId) {
            const chat = await repo.findChatById(existingDmId);
            return chat;
        }

        const chat = await repo.createChat({ type: "dm", createdBy: userId });
        await repo.addParticipant(chat.id, userId, "member");
        await repo.addParticipant(chat.id, otherUserId, "member");
        
        broadcastToUser(otherUserId, { type: "chat:new", payload: { chatId: chat.id } });
        
        return chat;
    }

    // Group chat
    const chat = await repo.createChat({ type: "group", name, description, createdBy: userId });
    await repo.addParticipant(chat.id, userId, "admin");
    for (const pId of participantIds) {
        await repo.addParticipant(chat.id, pId, "member");
        broadcastToUser(pId, { type: "chat:new", payload: { chatId: chat.id } });
    }
    return chat;
}

export async function getChat(chatId, userId) {
    const chat = await repo.findChatById(chatId);
    if (!chat) throw new AppError(404, "Chat not found", "NOT_FOUND");

    const rawParticipants = await repo.findChatParticipants(chatId);
    
    let blocked = false;
    if (chat.type === "dm") {
        const otherParticipant = rawParticipants.find(p => p.userId !== userId);
        if (otherParticipant) {
            blocked = await isBlocked(userId, otherParticipant.userId) || await isBlocked(otherParticipant.userId, userId);
        }
    }
    
    return { ...chat, isBlocked: blocked, participants: mapParticipants(rawParticipants) };
}

export async function updateChat(chatId, data) {
    const chat = await repo.updateChat(chatId, data);
    broadcastToChat(chatId, { type: "chat:updated", payload: { chatId } });
    return chat;
}

export async function deleteChat(chatId, userId) {
    const chat = await repo.findChatById(chatId);
    if (!chat) throw new AppError(404, "Chat not found", "NOT_FOUND");
    if (chat.type === "dm") throw new AppError(400, "Cannot delete a DM", "INVALID_ACTION");

    const requester = await repo.findParticipant(chatId, userId);
    if (!requester || requester.role !== "admin") {
        throw new AppError(403, "Admin privileges required", "NOT_ADMIN");
    }

    const participantIds = await repo.getChatParticipantUserIds(chatId);
    await repo.deleteChat(chatId);

    for (const pId of participantIds) {
        broadcastToUser(pId, { type: "chat:deleted", payload: { chatId } });
    }
}

export async function addParticipants(chatId, userIds) {
    const chat = await repo.findChatById(chatId);
    if (chat.type === "dm") {
        throw new AppError(400, "Cannot add participants to a DM", "DM_NO_ADD");
    }

    const added = [];
    for (const userId of userIds) {
        const existing = await repo.findParticipant(chatId, userId);
        if (!existing) {
            const p = await repo.addParticipant(chatId, userId, "member");
            added.push(p);
            broadcastToUser(userId, { type: "chat:new", payload: { chatId } });
        }
    }
    
    if (added.length > 0) {
        broadcastToChat(chatId, { type: "chat:updated", payload: { chatId } });
    }
    return added;
}

export async function updateParticipantRole(chatId, userId, role) {
    const participant = await repo.findParticipant(chatId, userId);
    if (!participant) {
        throw new AppError(404, "Participant not found", "NOT_FOUND");
    }
    const updated = await repo.updateParticipantRole(chatId, userId, role);
    broadcastToChat(chatId, { type: "chat:updated", payload: { chatId } });
    return updated;
}

export async function removeParticipant(chatId, userId, requestingUserId) {
    const chat = await repo.findChatById(chatId);

    // Self-removal (leaving) is always allowed
    if (userId !== requestingUserId) {
        // Removing someone else requires admin
        const requester = await repo.findParticipant(chatId, requestingUserId);
        if (!requester || requester.role !== "admin") {
            throw new AppError(403, "Admin privileges required", "NOT_ADMIN");
        }
    }

    const participantCount = await repo.countParticipants(chatId);

    // If the user leaving is an admin and there are other participants,
    // promote the oldest remaining member before they leave
    if (userId === requestingUserId && participantCount > 1) {
        const participants = await repo.findChatParticipants(chatId);
        const admins = participants.filter(
            (p) => p.role === "admin" && p.userId !== userId,
        );

        if (admins.length === 0 && chat.type === "group") {
            const oldest = await repo.findOldestNonAdminParticipant(chatId);
            if (oldest && oldest.userId !== userId) {
                await repo.updateParticipantRole(chatId, oldest.userId, "admin");
            }
        }
    }

    await repo.removeParticipant(chatId, userId);
    broadcastToUser(userId, { type: "chat:deleted", payload: { chatId } });
    broadcastToChat(chatId, { type: "chat:updated", payload: { chatId } });
}

export async function getChatParticipantUserIds(chatId) {
    return repo.getChatParticipantUserIds(chatId);
}
