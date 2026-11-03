import { z } from "zod";

export const createChatSchema = z.object({
    type: z.enum(["dm", "group"]),
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional(),
    participantIds: z.array(z.string().uuid()).min(1),
});

export const updateChatSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).nullable().optional(),
    avatarUrl: z.string().url().nullable().optional(),
});

export const addParticipantsSchema = z.object({
    userIds: z.array(z.string().uuid()).min(1),
});

export const updateParticipantSchema = z.object({
    role: z.enum(["admin", "member"]),
});

// Per-user chat state. One endpoint for all of it, so adding another flag
// later does not mean adding another route.
export const chatPreferencesSchema = z
    .object({
        pinned: z.boolean().optional(),
        archived: z.boolean().optional(),
        muted: z.boolean().optional(),
    })
    .refine((v) => Object.keys(v).length > 0, {
        message: "At least one preference must be provided",
    });

export const chatMediaQuerySchema = z.object({
    kind: z.enum(["image", "video", "audio", "file", "link"]).optional(),
    before: z.string().uuid().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(30),
});

export const listChatsQuerySchema = z.object({
    archived: z
        .enum(["true", "false"])
        .optional()
        .transform((v) => v === "true"),
});
