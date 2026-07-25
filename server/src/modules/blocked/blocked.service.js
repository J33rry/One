import { AppError } from "../../lib/AppError.js";
import * as repo from "./blocked.repository.js";
import * as contactsRepo from "../contacts/contacts.repository.js";

export async function listBlocked(userId) {
    return repo.findBlockedByUser(userId);
}

export async function blockUser(userId, blockedUserId) {
    if (userId === blockedUserId) {
        throw new AppError(400, "Cannot block yourself", "SELF_BLOCK");
    }

    const existing = await repo.findBlock(userId, blockedUserId);
    if (existing) {
        throw new AppError(409, "User already blocked", "ALREADY_BLOCKED");
    }

    const block = await repo.createBlock(userId, blockedUserId);

    // Mark any existing contact relationship as "blocked"
    const contact = await contactsRepo.findContactPair(userId, blockedUserId);
    if (contact) {
        await contactsRepo.updateContactStatus(contact.id, "blocked");
    }
    const reverse = await contactsRepo.findContactPair(blockedUserId, userId);
    if (reverse) {
        await contactsRepo.updateContactStatus(reverse.id, "blocked");
    }

    return block;
}

export async function unblockUser(userId, blockedUserId) {
    const existing = await repo.findBlock(userId, blockedUserId);
    if (!existing) {
        throw new AppError(404, "Block not found", "NOT_FOUND");
    }

    await repo.deleteBlock(userId, blockedUserId);

    // Restore contact relationship to "accepted" if it existed before
    const contact = await contactsRepo.findContactPair(userId, blockedUserId);
    if (contact && contact.status === "blocked") {
        await contactsRepo.updateContactStatus(contact.id, "accepted");
    }
    const reverse = await contactsRepo.findContactPair(blockedUserId, userId);
    if (reverse && reverse.status === "blocked") {
        await contactsRepo.updateContactStatus(reverse.id, "accepted");
    }
}
