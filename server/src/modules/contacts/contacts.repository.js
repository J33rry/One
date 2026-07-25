import { db } from "../../db/index.js";
import { contacts, blockedUsers, users } from "../../db/schema/index.js";
import { eq, and, or, ne, notInArray, sql, isNull } from "drizzle-orm";

export async function findUserContacts(userId) {
    // Exclude contacts where either party has blocked the other
    const blockedIds = db
        .select({ id: blockedUsers.blockedUserId })
        .from(blockedUsers)
        .where(eq(blockedUsers.userId, userId));

    const blockedByIds = db
        .select({ id: blockedUsers.userId })
        .from(blockedUsers)
        .where(eq(blockedUsers.blockedUserId, userId));

    return db
        .select({
            id: contacts.id,
            userId: contacts.userId,
            contactId: contacts.contactId,
            status: contacts.status,
            createdAt: contacts.createdAt,
            contactUsername: users.username,
            contactDisplayName: users.displayName,
            contactAvatarUrl: users.avatarUrl,
        })
        .from(contacts)
        .innerJoin(
            users,
            sql`${users.id} = CASE WHEN ${contacts.userId} = ${userId} THEN ${contacts.contactId} ELSE ${contacts.userId} END`
        )
        .where(
            and(
                or(eq(contacts.userId, userId), eq(contacts.contactId, userId)),
                ne(contacts.status, "blocked"),
                notInArray(
                    sql`CASE WHEN ${contacts.userId} = ${userId} THEN ${contacts.contactId} ELSE ${contacts.userId} END`,
                    blockedIds
                ),
                notInArray(
                    sql`CASE WHEN ${contacts.userId} = ${userId} THEN ${contacts.contactId} ELSE ${contacts.userId} END`,
                    blockedByIds
                ),
            ),
        );
}

export async function findContactPair(userId, contactId) {
    const [contact] = await db
        .select()
        .from(contacts)
        .where(
            and(eq(contacts.userId, userId), eq(contacts.contactId, contactId)),
        )
        .limit(1);
    return contact;
}

export async function findContactById(id) {
    const [contact] = await db
        .select()
        .from(contacts)
        .where(eq(contacts.id, id))
        .limit(1);
    return contact;
}

export async function createContact(data) {
    const [contact] = await db.insert(contacts).values(data).returning();
    return contact;
}

export async function updateContactStatus(id, status) {
    const [contact] = await db
        .update(contacts)
        .set({ status, updatedAt: new Date() })
        .where(eq(contacts.id, id))
        .returning();
    return contact;
}

export async function deleteContact(id) {
    await db.delete(contacts).where(eq(contacts.id, id));
}

export async function updateContactStatusByPair(userId, contactId, status) {
    await db
        .update(contacts)
        .set({ status, updatedAt: new Date() })
        .where(
            and(
                eq(contacts.userId, userId),
                eq(contacts.contactId, contactId),
            ),
        );
}
