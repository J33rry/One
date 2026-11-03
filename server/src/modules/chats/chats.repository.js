import { db } from "../../db/index.js";
import {
    chats,
    chatParticipants,
    messages,
    media,
    users,
} from "../../db/schema/index.js";
import {
    eq,
    and,
    or,
    lt,
    desc,
    sql,
    inArray,
    isNull,
    isNotNull,
} from "drizzle-orm";

export async function createChat(data) {
    const [chat] = await db.insert(chats).values(data).returning();
    return chat;
}

export async function findChatById(id) {
    const [chat] = await db
        .select()
        .from(chats)
        .where(eq(chats.id, id))
        .limit(1);
    return chat;
}

export async function updateChat(id, data) {
    const [chat] = await db
        .update(chats)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(chats.id, id))
        .returning();
    return chat;
}

/**
 * `archived`: true → only archived, false → only non-archived,
 * undefined → every chat regardless (used by presence fan-out).
 */
export async function findUserChats(userId, { archived } = {}) {
    const archivedFilter =
        archived === undefined
            ? undefined
            : archived
              ? isNotNull(chatParticipants.archivedAt)
              : isNull(chatParticipants.archivedAt);

    // Pinned first, then most recently active.
    const userChats = await db
        .select({
            chat: chats,
            role: chatParticipants.role,
            lastReadAt: chatParticipants.lastReadAt,
            pinnedAt: chatParticipants.pinnedAt,
            archivedAt: chatParticipants.archivedAt,
            isMuted: chatParticipants.isMuted,
        })
        .from(chatParticipants)
        .innerJoin(chats, eq(chats.id, chatParticipants.chatId))
        .where(and(eq(chatParticipants.userId, userId), archivedFilter))
        .orderBy(
            sql`${chatParticipants.pinnedAt} DESC NULLS LAST`,
            desc(chats.updatedAt),
        );

    return userChats;
}

// One aggregate for every chat the user is in, so the chat list stays flat.
// Returns both the unread total and how many of those mention the user.
export async function findUnreadCountsForUser(userId) {
    const result = await db.execute(sql`
        SELECT cp.chat_id AS chat_id,
               COUNT(m.id)::int AS unread_count,
               COUNT(mm.message_id)::int AS mention_count
        FROM chat_participants cp
        LEFT JOIN messages m
          ON m.chat_id = cp.chat_id
         AND m.sender_id <> cp.user_id
         AND m.is_deleted = false
         AND m.created_at > COALESCE(cp.last_read_at, cp.joined_at)
        LEFT JOIN message_mentions mm
          ON mm.message_id = m.id
         AND mm.user_id = cp.user_id
        WHERE cp.user_id = ${userId}
        GROUP BY cp.chat_id
    `);
    return new Map(
        result.rows.map((r) => [
            r.chat_id,
            { unread: r.unread_count, mentions: r.mention_count },
        ]),
    );
}

// Batched sibling of findChatParticipants, to keep listChats off an N+1.
export async function findChatParticipantsForChats(chatIds) {
    if (chatIds.length === 0) return [];
    return db
        .select({
            id: chatParticipants.id,
            chatId: chatParticipants.chatId,
            userId: chatParticipants.userId,
            role: chatParticipants.role,
            joinedAt: chatParticipants.joinedAt,
            username: users.username,
            displayName: users.displayName,
            avatarUrl: users.avatarUrl,
            lastSeenAt: users.lastSeenAt,
        })
        .from(chatParticipants)
        .innerJoin(users, eq(users.id, chatParticipants.userId))
        .where(inArray(chatParticipants.chatId, chatIds));
}

// Guarded so an out-of-order ack can never rewind the badge.
export async function advanceLastReadAt(chatId, userId, readAt = new Date()) {
    await db
        .update(chatParticipants)
        .set({ lastReadAt: readAt })
        .where(
            and(
                eq(chatParticipants.chatId, chatId),
                eq(chatParticipants.userId, userId),
                or(
                    isNull(chatParticipants.lastReadAt),
                    lt(chatParticipants.lastReadAt, readAt),
                ),
            ),
        );
}

// --- Shared media & links -------------------------------------------------

const MEDIA_KINDS = ["image", "video", "audio", "file"];

export async function findChatMedia(chatId, { kind, before, limit = 30 }) {
    const conditions = [
        eq(messages.chatId, chatId),
        eq(messages.isDeleted, false),
        isNotNull(messages.mediaId),
        kind ? eq(messages.type, kind) : inArray(messages.type, MEDIA_KINDS),
    ];

    if (before) {
        const [cursor] = await db
            .select({ createdAt: messages.createdAt })
            .from(messages)
            .where(eq(messages.id, before))
            .limit(1);
        if (cursor) conditions.push(lt(messages.createdAt, cursor.createdAt));
    }

    return db
        .select({
            messageId: messages.id,
            type: messages.type,
            createdAt: messages.createdAt,
            senderId: messages.senderId,
            senderUsername: users.username,
            senderDisplayName: users.displayName,
            mediaId: media.id,
            url: media.storageId,
            fileName: media.fileName,
            mimeType: media.mimeType,
            fileSize: media.fileSize,
        })
        .from(messages)
        .innerJoin(media, eq(media.id, messages.mediaId))
        .innerJoin(users, eq(users.id, messages.senderId))
        .where(and(...conditions))
        .orderBy(desc(messages.createdAt))
        .limit(limit);
}

// Links are not stored separately — they're extracted from message text.
// A dedicated table only becomes worthwhile if we add link previews.
export async function findChatLinks(chatId, { before, limit = 30 }) {
    const conditions = [
        eq(messages.chatId, chatId),
        eq(messages.isDeleted, false),
        sql`${messages.content} ~* 'https?://'`,
    ];

    if (before) {
        const [cursor] = await db
            .select({ createdAt: messages.createdAt })
            .from(messages)
            .where(eq(messages.id, before))
            .limit(1);
        if (cursor) conditions.push(lt(messages.createdAt, cursor.createdAt));
    }

    return db
        .select({
            messageId: messages.id,
            content: messages.content,
            createdAt: messages.createdAt,
            senderId: messages.senderId,
            senderUsername: users.username,
            senderDisplayName: users.displayName,
        })
        .from(messages)
        .innerJoin(users, eq(users.id, messages.senderId))
        .where(and(...conditions))
        .orderBy(desc(messages.createdAt))
        .limit(limit);
}

// One grouped query so all five tabs render from a single request.
export async function countChatMediaByKind(chatId) {
    const result = await db.execute(sql`
        SELECT m.type AS kind, COUNT(*)::int AS count
        FROM messages m
        WHERE m.chat_id = ${chatId}
          AND m.is_deleted = false
          AND m.media_id IS NOT NULL
        GROUP BY m.type
        UNION ALL
        SELECT 'link' AS kind, COUNT(*)::int AS count
        FROM messages m
        WHERE m.chat_id = ${chatId}
          AND m.is_deleted = false
          AND m.content ~* 'https?://'
    `);

    const counts = { image: 0, video: 0, audio: 0, file: 0, link: 0 };
    for (const row of result.rows) {
        if (row.kind in counts) counts[row.kind] = row.count;
    }
    return counts;
}

export async function updateParticipantPreferences(chatId, userId, prefs) {
    const [row] = await db
        .update(chatParticipants)
        .set(prefs)
        .where(
            and(
                eq(chatParticipants.chatId, chatId),
                eq(chatParticipants.userId, userId),
            ),
        )
        .returning();
    return row;
}

export async function findDmBetween(userA, userB) {
    // Find an existing DM chat between two users
    const result = await db.execute(sql`
        SELECT c.id FROM chats c
        WHERE c.type = 'dm'
        AND EXISTS (
            SELECT 1 FROM chat_participants cp1
            WHERE cp1.chat_id = c.id AND cp1.user_id = ${userA}
        )
        AND EXISTS (
            SELECT 1 FROM chat_participants cp2
            WHERE cp2.chat_id = c.id AND cp2.user_id = ${userB}
        )
        LIMIT 1
    `);
    return result.rows[0]?.id || null;
}

export async function addParticipant(chatId, userId, role = "member") {
    const [participant] = await db
        .insert(chatParticipants)
        .values({ chatId, userId, role })
        .returning();
    return participant;
}

export async function findParticipant(chatId, userId) {
    const [p] = await db
        .select()
        .from(chatParticipants)
        .where(
            and(
                eq(chatParticipants.chatId, chatId),
                eq(chatParticipants.userId, userId),
            ),
        )
        .limit(1);
    return p;
}

export async function findChatParticipants(chatId) {
    return db
        .select({
            id: chatParticipants.id,
            userId: chatParticipants.userId,
            role: chatParticipants.role,
            joinedAt: chatParticipants.joinedAt,
            username: users.username,
            displayName: users.displayName,
            avatarUrl: users.avatarUrl,
            lastSeenAt: users.lastSeenAt,
        })
        .from(chatParticipants)
        .innerJoin(users, eq(users.id, chatParticipants.userId))
        .where(eq(chatParticipants.chatId, chatId));
}

export async function getChatParticipantUserIds(chatId) {
    const rows = await db
        .select({ userId: chatParticipants.userId })
        .from(chatParticipants)
        .where(eq(chatParticipants.chatId, chatId));
    return rows.map((r) => r.userId);
}

export async function updateParticipantRole(chatId, userId, role) {
    const [p] = await db
        .update(chatParticipants)
        .set({ role })
        .where(
            and(
                eq(chatParticipants.chatId, chatId),
                eq(chatParticipants.userId, userId),
            ),
        )
        .returning();
    return p;
}

export async function removeParticipant(chatId, userId) {
    await db
        .delete(chatParticipants)
        .where(
            and(
                eq(chatParticipants.chatId, chatId),
                eq(chatParticipants.userId, userId),
            ),
        );
}

export async function countParticipants(chatId) {
    const [result] = await db
        .select({ count: sql`count(*)::int` })
        .from(chatParticipants)
        .where(eq(chatParticipants.chatId, chatId));
    return result.count;
}

export async function findOldestNonAdminParticipant(chatId) {
    const [p] = await db
        .select()
        .from(chatParticipants)
        .where(eq(chatParticipants.chatId, chatId))
        .orderBy(chatParticipants.joinedAt)
        .limit(1);
    return p;
}

export async function deleteChat(chatId) {
    await db.delete(chats).where(eq(chats.id, chatId));
}
