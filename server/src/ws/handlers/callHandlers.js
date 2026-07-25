import { broadcastToChat, broadcastToUser } from "../connectionRegistry.js";
import { findCallById } from "../../modules/calls/calls.repository.js";

export async function handleCallEvent(ws, event) {
    const { type, payload } = event;
    const userId = ws.userId;

    switch (type) {
        case "call:incoming": {
            // Handled via REST initiation; this is for signaling if needed
            break;
        }

        case "call:participant-joined": {
            const call = await findCallById(payload.callId);
            if (!call) return;
            broadcastToChat(
                call.chatId,
                { type: "call:participant-joined", payload: { callId: call.id, userId } },
                userId,
            );
            break;
        }

        case "call:participant-left": {
            const call = await findCallById(payload.callId);
            if (!call) return;
            broadcastToChat(
                call.chatId,
                { type: "call:participant-left", payload: { callId: call.id, userId } },
                userId,
            );
            break;
        }

        case "call:ended": {
            const call = await findCallById(payload.callId);
            if (!call) return;
            broadcastToChat(
                call.chatId,
                { type: "call:ended", payload: { callId: call.id } },
                null,
            );
            break;
        }

        case "call:rejected": {
            // When a user declines an incoming call, notify the caller
            const call = await findCallById(payload.callId);
            if (!call) return;
            broadcastToUser(call.initiatorId, {
                type: "call:rejected",
                payload: { callId: call.id, userId },
            });
            break;
        }
    }
}
