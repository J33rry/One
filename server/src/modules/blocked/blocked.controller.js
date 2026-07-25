import { asyncHandler } from "../../lib/asyncHandler.js";
import * as blockedService from "./blocked.service.js";
import * as v from "./blocked.validation.js";

export const listBlocked = asyncHandler(async (req, res) => {
    const blocked = await blockedService.listBlocked(req.user.id);
    res.json({ blocked });
});

export const blockUser = asyncHandler(async (req, res) => {
    const { blockedUserId } = v.blockUserSchema.parse(req.body);
    const block = await blockedService.blockUser(req.user.id, blockedUserId);
    res.status(201).json({ block });
});

export const unblockUser = asyncHandler(async (req, res) => {
    await blockedService.unblockUser(req.user.id, req.params.blockedUserId);
    res.status(204).end();
});
