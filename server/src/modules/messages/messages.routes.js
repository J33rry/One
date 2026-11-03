import { Router } from "express";
import * as ctrl from "./messages.controller.js";
import { requireAuth } from "../../middleware/requireAuth.js";
import { requireChatParticipant } from "../../middleware/chatAccess.js";

const router = Router();

router.use(requireAuth());

router.get("/:chatId/messages", requireChatParticipant, ctrl.getMessages);
router.post("/:chatId/messages", requireChatParticipant, ctrl.sendMessage);
router.patch(
    "/:chatId/messages/:messageId",
    requireChatParticipant,
    ctrl.editMessage,
);
router.delete(
    "/:chatId/messages/:messageId",
    requireChatParticipant,
    ctrl.deleteMessage,
);

// Reactions
router.post(
    "/:chatId/messages/:messageId/reactions",
    requireChatParticipant,
    ctrl.addReaction,
);
router.delete(
    "/:chatId/messages/:messageId/reactions",
    requireChatParticipant,
    ctrl.removeReaction,
);

// Bulk mark read
router.post("/:chatId/messages/read", requireChatParticipant, ctrl.markRead);

export default router;
