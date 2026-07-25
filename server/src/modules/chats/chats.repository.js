import { db } from "../../db/index.js";
import {
    chats,
    chatParticipants,
    messages,
    users,
} from "../../db/schema/index.js";
import { eq, and, desc, sql, inArray } from "drizzle-orm";

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

export async function findUserChats(userId) {
    // Get chats with last message preview
    const userChats = await db
        .select({
            chat: chats,
            role: chatParticipants.role,
        })
        .from(chatParticipants)
        .innerJoin(chats, eq(chats.id, chatParticipants.chatId))
        .where(eq(chatParticipants.userId, userId))
        .orderBy(desc(chats.updatedAt));

    return userChats;
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
