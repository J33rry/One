import { db } from "../../db/index.js";
import { calls, callParticipants, users } from "../../db/schema/index.js";
import { eq, and, isNull, desc, sql } from "drizzle-orm";

export async function createCall(data) {
    const [call] = await db.insert(calls).values(data).returning();
    return call;
}

export async function findCallById(id) {
    const [call] = await db
        .select()
        .from(calls)
        .where(eq(calls.id, id))
        .limit(1);
    return call;
}

export async function endCall(id) {
    const [call] = await db
        .update(calls)
        .set({ endedAt: new Date() })
        .where(eq(calls.id, id))
        .returning();

    // Mark all active participants as left
    await db
        .update(callParticipants)
        .set({ leftAt: new Date() })
        .where(
            and(
                eq(callParticipants.callId, id),
                isNull(callParticipants.leftAt),
            ),
        );

    return call;
}

export async function addCallParticipant(callId, userId) {
    const [p] = await db
        .insert(callParticipants)
        .values({ callId, userId, joinedAt: new Date() })
        .returning();
    return p;
}

export async function leaveCall(callId, userId) {
    // Mark the most recent (active) participation record as left
    const [p] = await db
        .update(callParticipants)
        .set({ leftAt: new Date() })
        .where(
            and(
                eq(callParticipants.callId, callId),
                eq(callParticipants.userId, userId),
                isNull(callParticipants.leftAt),
            ),
        )
        .returning();
    return p;
}

export async function findCallParticipants(callId) {
    return db
        .select({
            id: callParticipants.id,
            userId: callParticipants.userId,
            joinedAt: callParticipants.joinedAt,
            leftAt: callParticipants.leftAt,
            username: users.username,
            displayName: users.displayName,
        })
        .from(callParticipants)
        .innerJoin(users, eq(users.id, callParticipants.userId))
        .where(eq(callParticipants.callId, callId));
}

export async function findActiveParticipantCount(callId) {
    const [result] = await db
        .select({ count: sql`count(*)::int` })
        .from(callParticipants)
        .where(
            and(
                eq(callParticipants.callId, callId),
                isNull(callParticipants.leftAt),
            ),
        );
    return result.count;
}

export async function findChatCallHistory(chatId) {
    return db
        .select({
            id: calls.id,
            chatId: calls.chatId,
            initiatorId: calls.initiatorId,
            roomName: calls.roomName,
            type: calls.type,
            startedAt: calls.startedAt,
            endedAt: calls.endedAt,
            initiatorUsername: users.username,
            initiatorDisplayName: users.displayName,
            initiatorAvatarUrl: users.avatarUrl,
        })
        .from(calls)
        .innerJoin(users, eq(users.id, calls.initiatorId))
        .where(eq(calls.chatId, chatId))
        .orderBy(desc(calls.startedAt));
}

export async function findUserCallHistory(userId) {
    // A user's call history is all calls where the user was a participant, OR the call was in a chat the user is part of.
    // For simplicity, we can fetch all calls where the user is a chat participant.
    const { chatParticipants } = await import("../../db/schema/chatParticipants.js");
    const { chats } = await import("../../db/schema/chats.js");
    
    return db
        .select({
            id: calls.id,
            chatId: calls.chatId,
            initiatorId: calls.initiatorId,
            roomName: calls.roomName,
            type: calls.type,
            startedAt: calls.startedAt,
            endedAt: calls.endedAt,
            initiatorUsername: users.username,
            initiatorDisplayName: users.displayName,
            initiatorAvatarUrl: users.avatarUrl,
            chatType: chats.type,
            chatName: chats.name,
        })
        .from(calls)
        .innerJoin(users, eq(users.id, calls.initiatorId))
        .innerJoin(chats, eq(chats.id, calls.chatId))
        .innerJoin(chatParticipants, eq(chatParticipants.chatId, calls.chatId))
        .where(eq(chatParticipants.userId, userId))
        .orderBy(desc(calls.startedAt));
}
