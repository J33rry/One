import { Router } from "express";
import * as ctrl from "./folders.controller.js";
import { requireAuth } from "../../middleware/requireAuth.js";
import { requireFolderOwner } from "../../middleware/folderAccess.js";

const router = Router();

router.use(requireAuth());

router.get("/", ctrl.listFolders);
router.post("/", ctrl.createFolder);

router.patch("/:folderId", requireFolderOwner, ctrl.updateFolder);
router.delete("/:folderId", requireFolderOwner, ctrl.deleteFolder);

router.get("/:folderId/chats", requireFolderOwner, ctrl.listFolderChats);
router.post("/:folderId/chats", requireFolderOwner, ctrl.addChatToFolder);
router.delete(
    "/:folderId/chats/:chatId",
    requireFolderOwner,
    ctrl.removeChatFromFolder,
);

export default router;
