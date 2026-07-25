import { asyncHandler } from "../../lib/asyncHandler.js";
import * as usersService from "./users.service.js";
import * as v from "./users.validation.js";

export const getMe = asyncHandler(async (req, res) => {
    const user = await usersService.getMe(req.user.id);
    res.json({ user });
});

export const updateMe = asyncHandler(async (req, res) => {
    const body = v.updateProfileSchema.parse(req.body);
    const user = await usersService.updateProfile(req.user.id, body);
    res.json({ user });
});

export const getUser = asyncHandler(async (req, res) => {
    const user = await usersService.getProfile(req.params.userId);
    res.json({ user });
});

export const searchUsers = asyncHandler(async (req, res) => {
    const { q } = v.searchUsersSchema.parse(req.query);
    const users = await usersService.searchUsers(q);
    res.json({ users });
});
