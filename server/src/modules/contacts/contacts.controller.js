import { asyncHandler } from "../../lib/asyncHandler.js";
import * as contactsService from "./contacts.service.js";
import * as v from "./contacts.validation.js";

export const listContacts = asyncHandler(async (req, res) => {
    const contacts = await contactsService.listContacts(req.user.id);
    res.json({ contacts });
});

export const addContact = asyncHandler(async (req, res) => {
    const { contactId } = v.addContactSchema.parse(req.body);
    const contact = await contactsService.addContact(req.user.id, contactId);
    res.status(201).json({ contact });
});

export const updateContact = asyncHandler(async (req, res) => {
    const { status } = v.updateContactSchema.parse(req.body);
    const contact = await contactsService.updateContact(
        req.user.id,
        req.params.contactId,
        status,
    );
    res.json({ contact });
});

export const removeContact = asyncHandler(async (req, res) => {
    await contactsService.removeContact(req.user.id, req.params.contactId);
    res.status(204).end();
});
