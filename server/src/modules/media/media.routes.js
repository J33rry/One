import { Router } from "express";
import multer from "multer";
import * as ctrl from "./media.controller.js";
import { requireAuth } from "../../middleware/requireAuth.js";

const router = Router();

router.use(requireAuth());

router.get("/signature", ctrl.getUploadSignature);
router.post("/", ctrl.saveMediaMetadata);
router.get("/:mediaId", ctrl.downloadMedia);

export default router;
