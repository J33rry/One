import { z } from "zod";

export const uploadMediaSchema = z.object({
    chatId: z.string().uuid().optional(),
});
