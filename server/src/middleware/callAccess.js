import { AppError } from "../lib/AppError.js";
import { db } from "../db/index.js";
import { calls, chatParticipants } from "../db/schema/index.js";
import { eq, and } from "drizzle-orm";

/**
 * Middleware that verifies the authenticated user is a participant
 * of the chat that a call belongs to. Attaches `req.call` for downstream use.
 */
export async function requireCallAccess(req, _res, next) {
    const { callId } = req.params;

    // 1. Find the call
    const [call] = await db
        .select()
        .from(calls)
        .where(eq(calls.id, callId))
        .limit(1);

    if (!call) {
        throw new AppError(404, "Call not found", "NOT_FOUND");
    }

    // 2. Verify the user belongs to the call's chat
    const [participant] = await db
        .select()
        .from(chatParticipants)
        .where(
            and(
                eq(chatParticipants.chatId, call.chatId),
                eq(chatParticipants.userId, req.user.id),
            ),
        )
        .limit(1);

    if (!participant) {
        throw new AppError(403, "You are not a participant of this call's chat", "NOT_PARTICIPANT");
    }

    req.call = call;
    next();
}
