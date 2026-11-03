import { AppError } from "../../lib/AppError.js";
import * as repo from "./chats.repository.js";
import { isBlocked, findBlocksBetween } from "../blocked/blocked.repository.js";
import { broadcastToChat, broadcastToUser } from "../../ws/connectionRegistry.js";
import { findLatestMessagesForChats } from "../messages/messages.repository.js";
import { findFolderIdsForChats } from "../folders/folders.repository.js";

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

export async function listChats(userId, { archived = false } = {}) {
    // Always an explicit boolean here: the repository treats `undefined` as
    // "every chat", which is what the presence fan-out wants, not the list.
    const userChats = await repo.findUserChats(userId, { archived: !!archived });
    if (userChats.length === 0) return [];

    const chatIds = userChats.map(({ chat }) => chat.id);

    // A handful of flat queries for the whole list, rather than ~4 per chat.
    const [participantRows, latestByChat, unreadByChat, folderIdsByChat] =
        await Promise.all([
            repo.findChatParticipantsForChats(chatIds),
            findLatestMessagesForChats(chatIds),
            repo.findUnreadCountsForUser(userId),
            findFolderIdsForChats(userId, chatIds),
        ]);

    const participantsByChat = new Map();
    for (const p of participantRows) {
        if (!participantsByChat.has(p.chatId)) participantsByChat.set(p.chatId, []);
        participantsByChat.get(p.chatId).push(p);
    }

    // Resolve blocking for every DM counterpart at once.
    const dmOtherUserIds = userChats
        .filter(({ chat }) => chat.type === "dm")
        .map(({ chat }) =>
            (participantsByChat.get(chat.id) || []).find(p => p.userId !== userId)?.userId,
        )
        .filter(Boolean);
    const blockedWith = await findBlocksBetween(userId, dmOtherUserIds);

    return userChats.map(({ chat, role, lastReadAt, pinnedAt, archivedAt, isMuted }) => {
        const rawParticipants = participantsByChat.get(chat.id) || [];
        const otherUserId =
            chat.type === "dm"
                ? rawParticipants.find(p => p.userId !== userId)?.userId
                : null;

        return {
            ...chat,
            myRole: role,
            isBlocked: otherUserId ? blockedWith.has(otherUserId) : false,
            participants: mapParticipants(rawParticipants),
            latestMessage: latestByChat.get(chat.id) || null,
            unreadCount: unreadByChat.get(chat.id)?.unread || 0,
            mentionCount: unreadByChat.get(chat.id)?.mentions || 0,
            folderIds: folderIdsByChat.get(chat.id) || [],
            lastReadAt,
            pinnedAt,
            archivedAt,
            isMuted,
        };
    });
}

const URL_RE = /https?:\/\/[^\s<>"')]+/gi;

export async function listChatMedia(chatId, { kind, before, limit }) {
    if (kind === "link") {
        const rows = await repo.findChatLinks(chatId, { before, limit });
        // One message can carry several links; flatten them into entries.
        const items = [];
        for (const row of rows) {
            const urls = row.content?.match(URL_RE) || [];
            for (const [i, url] of urls.entries()) {
                let host = null;
                try {
                    host = new URL(url).host;
                } catch {
                    // Keep the raw URL even if it doesn't parse.
                }
                items.push({
                    id: `${row.messageId}:${i}`,
                    messageId: row.messageId,
                    url,
                    host,
                    createdAt: row.createdAt,
                    sender: {
                        id: row.senderId,
                        username: row.senderUsername,
                        displayName: row.senderDisplayName,
                    },
                });
            }
        }
        return items;
    }

    const rows = await repo.findChatMedia(chatId, { kind, before, limit });
    return rows.map((r) => ({
        id: r.mediaId,
        messageId: r.messageId,
        type: r.type,
        url: r.url,
        fileName: r.fileName,
        mimeType: r.mimeType,
        // bigint is not JSON-serialisable.
        fileSize: r.fileSize == null ? null : Number(r.fileSize),
        createdAt: r.createdAt,
        sender: {
            id: r.senderId,
            username: r.senderUsername,
            displayName: r.senderDisplayName,
        },
    }));
}

export async function getChatMediaCounts(chatId) {
    return repo.countChatMediaByKind(chatId);
}

export async function updateMyChatPreferences(chatId, userId, { pinned, archived, muted }) {
    const now = new Date();
    const patch = {};
    if (pinned !== undefined) patch.pinnedAt = pinned ? now : null;
    if (archived !== undefined) patch.archivedAt = archived ? now : null;
    if (muted !== undefined) patch.isMuted = muted;

    const row = await repo.updateParticipantPreferences(chatId, userId, patch);
    if (!row) throw new AppError(404, "Chat participant not found", "NOT_FOUND");

    broadcastToUser(userId, {
        type: "chat:preferences",
        payload: {
            chatId,
            pinnedAt: row.pinnedAt,
            archivedAt: row.archivedAt,
            isMuted: row.isMuted,
        },
    });

    return row;
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
