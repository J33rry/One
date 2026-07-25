import { AppError } from "../../lib/AppError.js";
import * as repo from "./users.repository.js";

export async function getProfile(userId) {
    const user = await repo.findById(userId);
    if (!user) throw new AppError(404, "User not found", "NOT_FOUND");
    return user;
}

export async function getMe(userId) {
    const user = await repo.findMeById(userId);
    if (!user) throw new AppError(404, "User not found", "NOT_FOUND");
    return user;
}

export async function updateProfile(userId, data) {
    return repo.updateProfile(userId, data);
}

export async function searchUsers(query) {
    return repo.searchByUsername(query);
}
