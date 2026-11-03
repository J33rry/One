import { db } from "../../db/index.js";
import {
    chatFolders,
    chatFolderItems,
    chatParticipants,
} from "../../db/schema/index.js";
import { eq, and, asc, sql, inArray } from "drizzle-orm";

export async function findUserFolders(userId) {
    return db
        .select()
        .from(chatFolders)
        .where(eq(chatFolders.userId, userId))
        .orderBy(asc(chatFolders.position), asc(chatFolders.createdAt));
}

export async function findFolderById(folderId) {
    const [folder] = await db
        .select()
        .from(chatFolders)
        .where(eq(chatFolders.id, folderId))
        .limit(1);
    return folder;
}

export async function createFolder(userId, { name, icon, position }) {
    const [folder] = await db
        .insert(chatFolders)
        .values({ userId, name, icon, position: position ?? 0 })
        .returning();
    return folder;
}

export async function updateFolder(folderId, patch) {
    const [folder] = await db
        .update(chatFolders)
        .set({ ...patch, updatedAt: new Date() })
        .where(eq(chatFolders.id, folderId))
        .returning();
    return folder;
}

export async function deleteFolder(folderId) {
    await db.delete(chatFolders).where(eq(chatFolders.id, folderId));
}

export async function addChatToFolder(folderId, chatId) {
    const [item] = await db
        .insert(chatFolderItems)
        .values({ folderId, chatId })
        .onConflictDoNothing()
        .returning();
    return item;
}

export async function removeChatFromFolder(folderId, chatId) {
    await db
        .delete(chatFolderItems)
        .where(
            and(
                eq(chatFolderItems.folderId, folderId),
                eq(chatFolderItems.chatId, chatId),
            ),
        );
}

export async function findChatIdsInFolder(folderId) {
    const rows = await db
        .select({ chatId: chatFolderItems.chatId })
        .from(chatFolderItems)
        .where(eq(chatFolderItems.folderId, folderId));
    return rows.map((r) => r.chatId);
}

/** Which folders each of the given chats belongs to, for the chat list. */
export async function findFolderIdsForChats(userId, chatIds) {
    if (chatIds.length === 0) return new Map();

    const rows = await db
        .select({
            chatId: chatFolderItems.chatId,
            folderId: chatFolderItems.folderId,
        })
        .from(chatFolderItems)
        .innerJoin(chatFolders, eq(chatFolders.id, chatFolderItems.folderId))
        .where(
            and(
                eq(chatFolders.userId, userId),
                inArray(chatFolderItems.chatId, chatIds),
            ),
        );

    const byChat = new Map();
    for (const r of rows) {
        if (!byChat.has(r.chatId)) byChat.set(r.chatId, []);
        byChat.get(r.chatId).push(r.folderId);
    }
    return byChat;
}

/**
 * Unread totals per folder, in one grouped query. Mirrors the unread rule in
 * chats.repository (own messages excluded, archived chats excluded).
 */
export async function findFolderUnreadCounts(userId) {
    const result = await db.execute(sql`
        SELECT f.id AS folder_id, COUNT(m.id)::int AS unread_count
        FROM chat_folders f
        LEFT JOIN chat_folder_items fi ON fi.folder_id = f.id
        LEFT JOIN chat_participants cp
          ON cp.chat_id = fi.chat_id
         AND cp.user_id = ${userId}
         AND cp.archived_at IS NULL
        LEFT JOIN messages m
          ON m.chat_id = cp.chat_id
         AND m.sender_id <> cp.user_id
         AND m.is_deleted = false
         AND m.created_at > COALESCE(cp.last_read_at, cp.joined_at)
        WHERE f.user_id = ${userId}
        GROUP BY f.id
    `);
    return new Map(result.rows.map((r) => [r.folder_id, r.unread_count]));
}

/** Guard: the caller must actually be in the chat they're filing. */
export async function isChatParticipant(chatId, userId) {
    const [row] = await db
        .select({ id: chatParticipants.id })
        .from(chatParticipants)
        .where(
            and(
                eq(chatParticipants.chatId, chatId),
                eq(chatParticipants.userId, userId),
            ),
        )
        .limit(1);
    return !!row;
}
