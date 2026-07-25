import { Router } from "express";
import * as ctrl from "./chats.controller.js";
import { requireAuth } from "../../middleware/requireAuth.js";
import {
    requireChatParticipant,
    requireChatAdmin,
} from "../../middleware/chatAccess.js";

const router = Router();

router.use(requireAuth());

router.get("/", ctrl.listChats);
router.post("/", ctrl.createChat);

router.get("/:chatId", requireChatParticipant, ctrl.getChat);
router.patch("/:chatId", requireChatAdmin, ctrl.updateChat);
router.delete("/:chatId", requireChatAdmin, ctrl.deleteChat);

router.post("/:chatId/participants", requireChatAdmin, ctrl.addParticipants);
router.patch(
    "/:chatId/participants/:userId",
    requireChatAdmin,
    ctrl.updateParticipant,
);
router.delete(
    "/:chatId/participants/:userId",
    requireChatParticipant,
    ctrl.removeParticipant,
);

export default router;
