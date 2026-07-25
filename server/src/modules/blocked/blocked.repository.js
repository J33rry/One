import { db } from "../../db/index.js";
import { blockedUsers, users } from "../../db/schema/index.js";
import { eq, and } from "drizzle-orm";

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
