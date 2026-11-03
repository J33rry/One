import { db } from "../../db/index.js";
import {
    messages,
    messageReactions,
    messageStatus,
    messageMentions,
    users,
    media,
} from "../../db/schema/index.js";
import { eq, and, lt, desc, inArray, sql } from "drizzle-orm";

export async function createMessage(data) {
    const [message] = await db.insert(messages).values(data).returning();
    
    if (message.mediaId) {
        const [m] = await db.select().from(media).where(eq(media.id, message.mediaId)).limit(1);
        if (m) {
            message.mediaUrl = m.storageId;
            message.mediaFileName = m.fileName;
            message.mediaMimeType = m.mimeType;
        }
    }
    
    // Include sender details for the WS payload
    const [u] = await db.select().from(users).where(eq(users.id, message.senderId)).limit(1);
    if (u) {
        message.senderUsername = u.username;
        message.senderDisplayName = u.displayName;
        message.senderAvatarUrl = u.avatarUrl;
    }
    
    return message;
}

export async function findMessageById(id) {
    const [message] = await db
        .select()
        .from(messages)
        .where(eq(messages.id, id))
        .limit(1);
    return message;
}

export async function findMessages(chatId, { before, limit }) {
    const conditions = [eq(messages.chatId, chatId)];

    if (before) {
        // Cursor-based pagination: get messages created before the cursor message
        const [cursorMsg] = await db
            .select({ createdAt: messages.createdAt })
            .from(messages)
            .where(eq(messages.id, before))
            .limit(1);

        if (cursorMsg) {
            conditions.push(lt(messages.createdAt, cursorMsg.createdAt));
        }
    }
    const fetchedMessages = await db
        .select({
            id: messages.id,
            chatId: messages.chatId,
            senderId: messages.senderId,
            replyToMessageId: messages.replyToMessageId,
            type: messages.type,
            content: messages.content,
            mediaId: messages.mediaId,
            isEdited: messages.isEdited,
            isDeleted: messages.isDeleted,
            createdAt: messages.createdAt,
            updatedAt: messages.updatedAt,
            senderUsername: users.username,
            senderDisplayName: users.displayName,
            senderAvatarUrl: users.avatarUrl,
            mediaUrl: media.storageId,
            mediaFileName: media.fileName,
            mediaMimeType: media.mimeType,
        })
        .from(messages)
        .innerJoin(users, eq(users.id, messages.senderId))
        .leftJoin(media, eq(media.id, messages.mediaId))
        .where(and(...conditions))
        .orderBy(desc(messages.createdAt))
        .limit(limit);

    if (fetchedMessages.length === 0) return fetchedMessages;

    const messageIds = fetchedMessages.map(m => m.id);

    const reactions = await db
        .select()
        .from(messageReactions)
        .where(inArray(messageReactions.messageId, messageIds));
        
    const reactionsByMsg = new Map();
    reactions.forEach(r => {
        if (!reactionsByMsg.has(r.messageId)) reactionsByMsg.set(r.messageId, []);
        reactionsByMsg.get(r.messageId).push(r);
    });

    const statuses = await db
        .select()
        .from(messageStatus)
        .where(inArray(messageStatus.messageId, messageIds));
        
    const statusByMsg = new Map();
    statuses.forEach(s => {
        if (!statusByMsg.has(s.messageId)) statusByMsg.set(s.messageId, []);
        statusByMsg.get(s.messageId).push(s);
    });

    const mentionsByMsg = await findMentionsForMessages(messageIds);

    return fetchedMessages.map(m => ({
        ...m,
        reactions: reactionsByMsg.get(m.id) || [],
        status: statusByMsg.get(m.id) || [],
        mentions: mentionsByMsg.get(m.id) || [],
    }));
}

export async function updateMessage(id, data) {
    const [message] = await db
        .update(messages)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(messages.id, id))
        .returning();
    return message;
}

export async function softDeleteMessage(id) {
    return updateMessage(id, { isDeleted: true, content: null });
}

// Reactions

export async function upsertReaction(messageId, userId, reaction) {
    const [existing] = await db
        .select()
        .from(messageReactions)
        .where(
            and(
                eq(messageReactions.messageId, messageId),
                eq(messageReactions.userId, userId),
                eq(messageReactions.reaction, reaction),
            ),
        )
        .limit(1);

    if (existing) return existing;

    const [r] = await db
        .insert(messageReactions)
        .values({ messageId, userId, reaction })
        .returning();
    return r;
}

export async function removeReaction(messageId, userId, reaction) {
    await db
        .delete(messageReactions)
        .where(
            and(
                eq(messageReactions.messageId, messageId),
                eq(messageReactions.userId, userId),
                eq(messageReactions.reaction, reaction),
            ),
        );
}


// Message status


export async function markRead(messageIds, userId) {
    const now = new Date();

    for (const messageId of messageIds) {
        await db
            .insert(messageStatus)
            .values({ messageId, userId, deliveredAt: now, readAt: now })
            .onConflictDoUpdate({
                target: [messageStatus.messageId, messageStatus.userId],
                set: { readAt: sql`COALESCE(message_status.read_at, EXCLUDED.read_at)` },
            });
    }
}


export async function findLatestMessageForChat(chatId) {
    const [msg] = await db
        .select({
            id: messages.id,
            chatId: messages.chatId,
            senderId: messages.senderId,
            content: messages.content,
            type: messages.type,
            isDeleted: messages.isDeleted,
            createdAt: messages.createdAt,
            senderUsername: users.username,
            senderDisplayName: users.displayName,
        })
        .from(messages)
        .leftJoin(users, eq(users.id, messages.senderId))
        .where(eq(messages.chatId, chatId))
        .orderBy(desc(messages.createdAt))
        .limit(1);
    return msg || null;
}

// --- Search ---------------------------------------------------------------

/**
 * Full-text search over messages.
 *
 * The chat_participants join IS the authorization: results can only come from
 * chats the caller is currently in, and `created_at >= cp.joined_at` hides
 * history from before they joined, matching the unread rule.
 *
 * websearch_to_tsquery (not to_tsquery) because the latter throws on raw user
 * input containing &, : or !.
 *
 * ts_headline uses « » sentinels rather than HTML, so the client can split in
 * JS and never needs dangerouslySetInnerHTML.
 */
export async function searchMessages({ userId, chatId = null, query, before = null, limit = 25 }) {
    const result = await db.execute(sql`
        SELECT m.id, m.chat_id, m.sender_id, m.content, m.type,
               m.created_at,
               c.name AS chat_name, c.type AS chat_type,
               u.username AS sender_username,
               u.display_name AS sender_display_name,
               u.avatar_url AS sender_avatar_url,
               ts_headline('english', m.content, q.query,
                   'StartSel=«,StopSel=»,MaxFragments=1,MaxWords=18,MinWords=5'
               ) AS snippet
        FROM websearch_to_tsquery('english', ${query}) AS q(query)
        JOIN messages m ON m.search_vector @@ q.query
        JOIN chat_participants cp
          ON cp.chat_id = m.chat_id AND cp.user_id = ${userId}
        JOIN chats c ON c.id = m.chat_id
        JOIN users u ON u.id = m.sender_id
        WHERE m.is_deleted = false
          AND m.created_at >= cp.joined_at
          AND (${chatId}::uuid IS NULL OR m.chat_id = ${chatId}::uuid)
          AND (
                ${before}::timestamptz IS NULL
                OR m.created_at < ${before}::timestamptz
              )
        ORDER BY m.created_at DESC
        LIMIT ${limit}
    `);

    return result.rows.map((r) => ({
        id: r.id,
        chatId: r.chat_id,
        chatName: r.chat_name,
        chatType: r.chat_type,
        content: r.content,
        snippet: r.snippet,
        type: r.type,
        createdAt: r.created_at,
        sender: {
            id: r.sender_id,
            username: r.sender_username,
            displayName: r.sender_display_name,
            avatarUrl: r.sender_avatar_url,
        },
    }));
}

// --- Mentions -------------------------------------------------------------

export async function replaceMentions(messageId, userIds) {
    await db
        .delete(messageMentions)
        .where(eq(messageMentions.messageId, messageId));

    if (userIds.length === 0) return;

    await db
        .insert(messageMentions)
        .values(userIds.map((userId) => ({ messageId, userId })))
        .onConflictDoNothing();
}

export async function findMentionsForMessages(messageIds) {
    if (messageIds.length === 0) return new Map();

    const rows = await db
        .select({
            messageId: messageMentions.messageId,
            userId: messageMentions.userId,
            username: users.username,
            displayName: users.displayName,
        })
        .from(messageMentions)
        .innerJoin(users, eq(users.id, messageMentions.userId))
        .where(inArray(messageMentions.messageId, messageIds));

    const byMessage = new Map();
    for (const r of rows) {
        if (!byMessage.has(r.messageId)) byMessage.set(r.messageId, []);
        byMessage.get(r.messageId).push({
            userId: r.userId,
            username: r.username,
            displayName: r.displayName,
        });
    }
    return byMessage;
}

// Batched sibling of the above: one DISTINCT ON instead of one query per chat.
export async function findLatestMessagesForChats(chatIds) {
    if (chatIds.length === 0) return new Map();

    const result = await db.execute(sql`
        SELECT DISTINCT ON (m.chat_id)
            m.id, m.chat_id, m.sender_id, m.content, m.type,
            m.is_deleted, m.created_at,
            u.username AS sender_username,
            u.display_name AS sender_display_name
        FROM messages m
        LEFT JOIN users u ON u.id = m.sender_id
        WHERE m.chat_id IN (${sql.join(
            chatIds.map((id) => sql`${id}::uuid`),
            sql`, `,
        )})
        ORDER BY m.chat_id, m.created_at DESC
    `);

    return new Map(
        result.rows.map((r) => [
            r.chat_id,
            {
                id: r.id,
                chatId: r.chat_id,
                senderId: r.sender_id,
                content: r.content,
                type: r.type,
                isDeleted: r.is_deleted,
                createdAt: r.created_at,
                senderUsername: r.sender_username,
                senderDisplayName: r.sender_display_name,
            },
        ]),
    );
}
