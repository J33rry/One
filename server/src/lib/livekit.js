import { AccessToken, RoomServiceClient } from "livekit-server-sdk";
import { env } from "../config/env.js";

/**
 * Generate a LiveKit access token for a user joining a room.
 *
 * @param {string} roomName  – the LiveKit room name (already stored on the call record)
 * @param {string} identity  – unique user id
 * @param {string} name      – display name shown to other participants
 * @returns {Promise<string>} signed JWT
 */
export async function createLiveKitToken(roomName, identity, name) {
    const at = new AccessToken(env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET, {
        identity,
        name,
        ttl: "2h",
    });

    at.addGrant({
        roomJoin: true,
        room: roomName,
        canPublish: true,
        canSubscribe: true,
    });

    return at.toJwt();
}

/**
 * RoomServiceClient instance for server-side room management
 * (list rooms, delete rooms, remove participants, etc.)
 */
export const roomService = new RoomServiceClient(
    env.LIVEKIT_URL,
    env.LIVEKIT_API_KEY,
    env.LIVEKIT_API_SECRET,
);
