import { Router } from "express";
import * as ctrl from "./blocked.controller.js";
import { requireAuth } from "../../middleware/requireAuth.js";

const router = Router();

router.use(requireAuth());

router.get("/", ctrl.listBlocked);
router.post("/", ctrl.blockUser);
router.delete("/:blockedUserId", ctrl.unblockUser);

export default router;
