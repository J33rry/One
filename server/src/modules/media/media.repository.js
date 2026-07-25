import { db } from "../../db/index.js";
import { media, messages, chatParticipants } from "../../db/schema/index.js";
import { eq, and, sql } from "drizzle-orm";

export async function createMedia(data) {
    const [m] = await db.insert(media).values(data).returning();
    return m;
}

export async function findMediaById(id) {
    const [m] = await db
        .select()
        .from(media)
        .where(eq(media.id, id))
        .limit(1);
    return m;
}

// Check if a user has access to media through chat participation:
// the media must be referenced by a message in a chat the user belongs to,
// OR the user is the uploader.
export async function canUserAccessMedia(mediaId, userId) {
    const m = await findMediaById(mediaId);
    if (!m) return false;

    if (m.uploaderId === userId) return true;

    const [access] = await db.execute(sql`
        SELECT 1 FROM messages msg
        JOIN chat_participants cp ON cp.chat_id = msg.chat_id AND cp.user_id = ${userId}
        WHERE msg.media_id = ${mediaId}
        LIMIT 1
    `);

    return !!access;
}
