import { Router } from "express";
import * as ctrl from "./calls.controller.js";
import { requireAuth } from "../../middleware/requireAuth.js";
import { requireChatParticipant } from "../../middleware/chatAccess.js";
import { requireCallAccess } from "../../middleware/callAccess.js";

const router = Router();

router.use(requireAuth());

// Global call history
router.get("/calls", ctrl.getUserCallHistory);

// Chat-scoped call routes
router.post("/chats/:chatId/calls", requireChatParticipant, ctrl.initiateCall);
router.get(
    "/chats/:chatId/calls",
    requireChatParticipant,
    ctrl.getChatCallHistory,
);

// Call-scoped routes (all require the user to be a participant of the call's chat)
router.post("/calls/:callId/join", requireCallAccess, ctrl.joinCall);
router.post("/calls/:callId/leave", requireCallAccess, ctrl.leaveCall);
router.post("/calls/:callId/end", requireCallAccess, ctrl.endCall);
router.get("/calls/:callId/participants", requireCallAccess, ctrl.getCallParticipants);
router.post("/calls/:callId/token", requireCallAccess, ctrl.getCallToken);

export default router;
