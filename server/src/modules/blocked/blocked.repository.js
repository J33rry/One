import { db } from "../../db/index.js";
import { blockedUsers, users } from "../../db/schema/index.js";
import { eq, and, or, inArray } from "drizzle-orm";

export async function findBlockedByUser(userId) {
    return db
        .select({
            id: blockedUsers.id,
            blockedUserId: blockedUsers.blockedUserId,
            createdAt: blockedUsers.createdAt,
            username: users.username,
            displayName: users.displayName,
            avatarUrl: users.avatarUrl,
        })
        .from(blockedUsers)
        .innerJoin(users, eq(users.id, blockedUsers.blockedUserId))
        .where(eq(blockedUsers.userId, userId));
}

export async function findBlock(userId, blockedUserId) {
    const [block] = await db
        .select()
        .from(blockedUsers)
        .where(
            and(
                eq(blockedUsers.userId, userId),
                eq(blockedUsers.blockedUserId, blockedUserId),
            ),
        )
        .limit(1);
    return block;
}

export async function isBlocked(userA, userB) {
    const [block] = await db
        .select()
        .from(blockedUsers)
        .where(
            and(
                eq(blockedUsers.userId, userA),
                eq(blockedUsers.blockedUserId, userB),
            ),
        )
        .limit(1);
    return !!block;
}

// Every block between `userId` and the given users, in either direction, in one
// query — replaces the 2-per-chat isBlocked calls the chat list used to make.
export async function findBlocksBetween(userId, otherUserIds) {
    if (otherUserIds.length === 0) return new Set();

    const rows = await db
        .select({
            userId: blockedUsers.userId,
            blockedUserId: blockedUsers.blockedUserId,
        })
        .from(blockedUsers)
        .where(
            or(
                and(
                    eq(blockedUsers.userId, userId),
                    inArray(blockedUsers.blockedUserId, otherUserIds),
                ),
                and(
                    eq(blockedUsers.blockedUserId, userId),
                    inArray(blockedUsers.userId, otherUserIds),
                ),
            ),
        );

    // Set of the *other* party in each blocking relationship.
    return new Set(
        rows.map((r) => (r.userId === userId ? r.blockedUserId : r.userId)),
    );
}

export async function createBlock(userId, blockedUserId) {
    const [block] = await db
        .insert(blockedUsers)
        .values({ userId, blockedUserId })
        .returning();
    return block;
}

export async function deleteBlock(userId, blockedUserId) {
    await db
        .delete(blockedUsers)
        .where(
            and(
                eq(blockedUsers.userId, userId),
                eq(blockedUsers.blockedUserId, blockedUserId),
            ),
        );
}
