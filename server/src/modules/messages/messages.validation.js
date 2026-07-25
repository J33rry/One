import { z } from "zod";

export const sendMessageSchema = z.object({
    type: z.enum(["text", "image", "video", "audio", "file"]).default("text"),
    content: z.string().max(4096).optional(),
    mediaId: z.string().uuid().optional(),
    replyToMessageId: z.string().uuid().optional(),
});

export const editMessageSchema = z.object({
    content: z.string().min(1).max(4096),
});

export const addReactionSchema = z.object({
    reaction: z.string().min(1).max(10),
});

export const removeReactionSchema = z.object({
    reaction: z.string().min(1).max(10),
});

export const markReadSchema = z.object({
    messageIds: z.array(z.string().uuid()).min(1).max(100),
});

export const paginationSchema = z.object({
    before: z.string().uuid().optional(),
    limit: z.coerce.number().min(1).max(100).default(50),
});
