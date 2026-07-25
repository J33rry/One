import { z } from "zod";

export const updateProfileSchema = z.object({
    displayName: z.string().min(1).max(100).optional(),
    bio: z.string().max(255).optional(),
    avatarUrl: z.string().url().nullable().optional(),
});

export const searchUsersSchema = z.object({
    q: z.string().min(1).max(30),
});
