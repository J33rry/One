import { db } from "../../db/index.js";
import { users, passkeys } from "../../db/schema/index.js";
import { eq, and, sql } from "drizzle-orm";

export async function createUser(data) {
    const [user] = await db.insert(users).values(data).returning();
    return user;
}

export async function findUserByEmail(email) {
    const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
    return user;
}

export async function findUserById(id) {
    const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);
    return user;
}

export async function updateUser(id, data) {
    const [user] = await db
        .update(users)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(users.id, id))
        .returning();
    return user;
}

export async function createPasskey(data) {
    const [passkey] = await db.insert(passkeys).values(data).returning();
    return passkey;
}

export async function findPasskeysByUserId(userId) {
    return db
        .select()
        .from(passkeys)
        .where(eq(passkeys.userId, userId));
}

export async function findPasskeyByCredentialId(credentialIdBuffer) {
    const [passkey] = await db
        .select()
        .from(passkeys)
        .where(eq(passkeys.credentialId, credentialIdBuffer))
        .limit(1);
    return passkey;
}

export async function findPasskeyById(id) {
    const [passkey] = await db
        .select()
        .from(passkeys)
        .where(eq(passkeys.id, id))
        .limit(1);
    return passkey;
}

export async function updatePasskey(id, data) {
    const [passkey] = await db
        .update(passkeys)
        .set(data)
        .where(eq(passkeys.id, id))
        .returning();
    return passkey;
}

export async function deletePasskey(id) {
    await db.delete(passkeys).where(eq(passkeys.id, id));
}

export async function countPasskeysByUserId(userId) {
    const [result] = await db
        .select({ count: sql`count(*)::int` })
        .from(passkeys)
        .where(eq(passkeys.userId, userId));
    return result.count;
}

export async function findUserByResetNonce(nonce) {
    const [user] = await db
        .select()
        .from(users)
        .where(eq(users.passwordResetNonce, nonce))
        .limit(1);
    return user;
}
