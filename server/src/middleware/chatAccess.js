import { AppError } from "../lib/AppError.js";
import { db } from "../db/index.js";
import { chatParticipants } from "../db/schema/index.js";
import { eq, and } from "drizzle-orm";

export async function requireChatParticipant(req, _res, next) {
    const { chatId } = req.params;

    const [participant] = await db
        .select()
        .from(chatParticipants)
        .where(
            and(
                eq(chatParticipants.chatId, chatId),
                eq(chatParticipants.userId, req.user.id),
            ),
        )
        .limit(1);

    if (!participant) {
        throw new AppError(403, "You are not a participant of this chat", "NOT_PARTICIPANT");
    }

    req.chatParticipant = participant;
    next();
}

export async function requireChatAdmin(req, _res, next) {
    const { chatId } = req.params;

    const [participant] = await db
        .select()
        .from(chatParticipants)
        .where(
            and(
                eq(chatParticipants.chatId, chatId),
                eq(chatParticipants.userId, req.user.id),
            ),
        )
        .limit(1);

    if (!participant) {
        throw new AppError(403, "You are not a participant of this chat", "NOT_PARTICIPANT");
    }

    if (participant.role !== "admin") {
        throw new AppError(403, "Admin privileges required", "NOT_ADMIN");
    }

    req.chatParticipant = participant;
    next();
}
