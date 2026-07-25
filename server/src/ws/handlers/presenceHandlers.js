import { broadcastToUser, isOnline } from "../connectionRegistry.js";
import { findUserContacts } from "../../modules/contacts/contacts.repository.js";

// Notify a user's accepted contacts about their presence change.
// Only contacts who are themselves online will receive the event.
export async function handlePresenceEvent(userId, status) {
    const contacts = await findUserContacts(userId);

    for (const contact of contacts) {
        if (contact.status !== "accepted") continue;

        broadcastToUser(contact.contactId, {
            type: `presence:${status}`,
            payload: { userId },
        });
    }
}
