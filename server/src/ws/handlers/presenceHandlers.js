import { broadcastToUser } from "../connectionRegistry.js";
import { findUserContacts } from "../../modules/contacts/contacts.repository.js";
import { findUserChats, getChatParticipantUserIds } from "../../modules/chats/chats.repository.js";

// Notify a user's accepted contacts and chat peers about their presence change.
export async function handlePresenceEvent(userId, status, lastSeenAt = null) {
    const recipientIds = new Set();

    // 1. Add accepted contacts
    try {
        const contacts = await findUserContacts(userId);
        for (const contact of contacts) {
            if (contact.status === "accepted") {
                recipientIds.add(contact.contactId);
            }
        }
    } catch (err) {
        console.error("[WS] Error fetching contacts for presence:", err);
    }

    // 2. Add participants of all chats the user is in
    try {
        const userChats = await findUserChats(userId);
        for (const { chat } of userChats) {
            const participantIds = await getChatParticipantUserIds(chat.id);
            for (const pId of participantIds) {
                if (pId !== userId) {
                    recipientIds.add(pId);
                }
            }
        }
    } catch (err) {
        console.error("[WS] Error fetching chat participants for presence:", err);
    }

    const event = {
        type: `presence:${status}`,
        payload: { userId, lastSeenAt },
    };

    for (const recipientId of recipientIds) {
        broadcastToUser(recipientId, event);
    }
}

