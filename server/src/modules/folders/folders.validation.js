import { z } from "zod";

export const createFolderSchema = z.object({
    name: z.string().trim().min(1).max(50),
    icon: z.string().max(30).nullable().optional(),
    position: z.number().int().min(0).max(999).optional(),
});

export const updateFolderSchema = z
    .object({
        name: z.string().trim().min(1).max(50).optional(),
        icon: z.string().max(30).nullable().optional(),
        position: z.number().int().min(0).max(999).optional(),
    })
    .refine((v) => Object.keys(v).length > 0, {
        message: "At least one field must be provided",
    });

export const addChatSchema = z.object({
    chatId: z.string().uuid(),
});
