import { db } from "../../db/index.js";
import { users } from "../../db/schema/index.js";
import { eq, ilike, and, isNull } from "drizzle-orm";

const publicColumns = {
    id: users.id,
    username: users.username,
    displayName: users.displayName,
    avatarUrl: users.avatarUrl,
    bio: users.bio,
    createdAt: users.createdAt,
};

export async function findById(id) {
    const [user] = await db
        .select(publicColumns)
        .from(users)
        .where(and(eq(users.id, id), isNull(users.deletedAt)))
        .limit(1);
    return user;
}

export async function findMeById(id) {
    const [user] = await db
        .select({
            ...publicColumns,
            email: users.email,
            passkeyEnrolled: users.passkeyEnrolled,
        })
        .from(users)
        .where(and(eq(users.id, id), isNull(users.deletedAt)))
        .limit(1);
    return user;
}

export async function updateProfile(id, data) {
    const [user] = await db
        .update(users)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(users.id, id))
        .returning(publicColumns);
    return user;
}

export async function searchByUsername(query, limit = 20) {
    return db
        .select(publicColumns)
        .from(users)
        .where(and(ilike(users.username, `%${query}%`), isNull(users.deletedAt)))
        .limit(limit);
}
