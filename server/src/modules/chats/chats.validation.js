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
