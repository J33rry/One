import { z } from "zod";

export const addContactSchema = z.object({
    contactId: z.string().uuid(),
});

export const updateContactSchema = z.object({
    status: z.enum(["accepted", "rejected"]),
});
