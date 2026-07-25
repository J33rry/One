import { Router } from "express";
import * as ctrl from "./contacts.controller.js";
import { requireAuth } from "../../middleware/requireAuth.js";

const router = Router();

router.use(requireAuth());

router.get("/", ctrl.listContacts);
router.post("/", ctrl.addContact);
router.patch("/:contactId", ctrl.updateContact);
router.delete("/:contactId", ctrl.removeContact);

export default router;
