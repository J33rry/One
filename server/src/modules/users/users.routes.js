import { Router } from "express";
import * as ctrl from "./users.controller.js";
import { requireAuth } from "../../middleware/requireAuth.js";

const router = Router();

router.use(requireAuth());

router.get("/me", ctrl.getMe);
router.patch("/me", ctrl.updateMe);
router.get("/search", ctrl.searchUsers);
router.get("/:userId", ctrl.getUser);

export default router;
