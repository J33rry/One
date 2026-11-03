import { Router } from "express";
import * as ctrl from "./messages.controller.js";
import { requireAuth } from "../../middleware/requireAuth.js";

const router = Router();

router.use(requireAuth());

// No :chatId to guard with requireChatParticipant — the chat_participants
// join inside searchMessages is what scopes results to the caller's chats.
router.get("/messages", ctrl.searchAll);

export default router;
