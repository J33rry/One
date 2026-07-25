import crypto from "node:crypto";
import { AppError } from "../../lib/AppError.js";
import { createLiveKitToken, roomService } from "../../lib/livekit.js";
import { env } from "../../config/env.js";
import * as repo from "./calls.repository.js";
import { isBlocked } from "../blocked/blocked.repository.js";
import { findChatById, getChatParticipantUserIds } from "../chats/chats.repository.js";

export async function initiateCall(chatId, initiatorId, initiatorName, type) {
    const chat = await findChatById(chatId);
    
    if (chat.type === "dm") {
        const participantIds = await getChatParticipantUserIds(chatId);
        const otherUserId = participantIds.find(id => id !== initiatorId);
        if (otherUserId) {
            const senderBlockedOther = await isBlocked(initiatorId, otherUserId);
            if (senderBlockedOther) throw new AppError(403, "You have blocked this user", "BLOCKED");
            const otherBlockedSender = await isBlocked(otherUserId, initiatorId);
            if (otherBlockedSender) throw new AppError(403, "You are blocked by this user", "BLOCKED");
        }
    }
    const roomName = `call-${crypto.randomUUID()}`;

    const call = await repo.createCall({
        chatId,
        initiatorId,
        roomName,
        type,
    });

    await repo.addCallParticipant(call.id, initiatorId);

    // Generate a LiveKit token so the initiator can immediately join the room
    const token = await createLiveKitToken(roomName, initiatorId, initiatorName);

    return { call, token, livekitUrl: env.LIVEKIT_URL };
}

export async function joinCall(callId, userId, displayName) {
    const call = await repo.findCallById(callId);
    if (!call) throw new AppError(404, "Call not found", "NOT_FOUND");
    if (call.endedAt) throw new AppError(400, "Call has ended", "CALL_ENDED");

    const participant = await repo.addCallParticipant(callId, userId);

    // Generate a LiveKit token for the joining participant
    const token = await createLiveKitToken(call.roomName, userId, displayName);

    return { participant, token, livekitUrl: env.LIVEKIT_URL, chatId: call.chatId };
}

export async function leaveCall(callId, userId) {
    const call = await repo.findCallById(callId);
    if (!call) throw new AppError(404, "Call not found", "NOT_FOUND");

    const participant = await repo.leaveCall(callId, userId);

    // Auto-end call if no active participants remain
    const activeCount = await repo.findActiveParticipantCount(callId);
    if (activeCount === 0 && !call.endedAt) {
        await repo.endCall(callId);
        // Clean up the LiveKit room
        try {
            await roomService.deleteRoom(call.roomName);
        } catch {
            // Room may already be gone — that's fine
        }
    }

    return participant;
}

export async function endCall(callId, userId) {
    const call = await repo.findCallById(callId);
    if (!call) throw new AppError(404, "Call not found", "NOT_FOUND");
    if (call.endedAt) throw new AppError(400, "Call already ended", "CALL_ENDED");

    const ended = await repo.endCall(callId);

    // Force-close the LiveKit room, disconnecting all participants
    try {
        await roomService.deleteRoom(call.roomName);
    } catch {
        // Room may already be gone — that's fine
    }

    return ended;
}

export async function getCallParticipants(callId) {
    return repo.findCallParticipants(callId);
}

export async function getChatCallHistory(chatId) {
    return repo.findChatCallHistory(chatId);
}

export async function getUserCallHistory(userId) {
    return repo.findUserCallHistory(userId);
}

export async function generateToken(callId, userId, displayName) {
    const call = await repo.findCallById(callId);
    if (!call) throw new AppError(404, "Call not found", "NOT_FOUND");
    if (call.endedAt) throw new AppError(400, "Call has ended", "CALL_ENDED");

    const token = await createLiveKitToken(call.roomName, userId, displayName);
    return { token, livekitUrl: env.LIVEKIT_URL };
}
