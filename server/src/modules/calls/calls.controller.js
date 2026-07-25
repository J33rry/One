import { asyncHandler } from "../../lib/asyncHandler.js";
import * as callsService from "./calls.service.js";
import * as v from "./calls.validation.js";
import { broadcastToChat } from "../../ws/connectionRegistry.js";

export const initiateCall = asyncHandler(async (req, res) => {
    const { type } = v.initiateCallSchema.parse(req.body);
    const { call, token, livekitUrl } = await callsService.initiateCall(
        req.params.chatId,
        req.user.id,
        req.user.displayName || req.user.username,
        type,
    );

    broadcastToChat(req.params.chatId, {
        type: "call:incoming",
        payload: {
            callId: call.id,
            chatId: call.chatId,
            type: call.type,
            roomName: call.roomName,
            initiator: {
                id: req.user.id,
                username: req.user.username,
                displayName: req.user.displayName,
                avatarUrl: req.user.avatarUrl,
            },
        },
    }, req.user.id);

    res.status(201).json({ call, token, livekitUrl });
});

export const joinCall = asyncHandler(async (req, res) => {
    const { participant, token, livekitUrl, chatId } = await callsService.joinCall(
        req.params.callId,
        req.user.id,
        req.user.displayName || req.user.username,
    );

    broadcastToChat(chatId, {
        type: "call:participant-joined",
        payload: {
            callId: req.params.callId,
            userId: req.user.id,
            username: req.user.username,
            displayName: req.user.displayName,
        },
    }, req.user.id);

    res.json({ participant, token, livekitUrl });
});

export const leaveCall = asyncHandler(async (req, res) => {
    const participant = await callsService.leaveCall(
        req.params.callId,
        req.user.id,
    );
    res.json({ participant });
});

export const endCall = asyncHandler(async (req, res) => {
    const call = await callsService.endCall(req.params.callId, req.user.id);

    broadcastToChat(call.chatId, {
        type: "call:ended",
        payload: { callId: call.id },
    }, null);

    res.json({ call });
});

export const getCallParticipants = asyncHandler(async (req, res) => {
    const participants = await callsService.getCallParticipants(
        req.params.callId,
    );
    res.json({ participants });
});

export const getChatCallHistory = asyncHandler(async (req, res) => {
    const rawCalls = await callsService.getChatCallHistory(req.params.chatId);
    const calls = rawCalls.map(formatCallResponse);
    res.json({ calls });
});

export const getUserCallHistory = asyncHandler(async (req, res) => {
    const rawCalls = await callsService.getUserCallHistory(req.user.id);
    const calls = rawCalls.map(formatCallResponse);
    res.json({ calls });
});

function formatCallResponse(call) {
    const formatted = { ...call };
    formatted.initiator = {
        id: call.initiatorId,
        username: call.initiatorUsername,
        displayName: call.initiatorDisplayName,
        avatarUrl: call.initiatorAvatarUrl,
    };
    delete formatted.initiatorUsername;
    delete formatted.initiatorDisplayName;
    delete formatted.initiatorAvatarUrl;
    return formatted;
}

export const getCallToken = asyncHandler(async (req, res) => {
    const { token, livekitUrl } = await callsService.generateToken(
        req.params.callId,
        req.user.id,
        req.user.displayName || req.user.username,
    );
    res.json({ token, livekitUrl });
});
