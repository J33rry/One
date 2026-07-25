import { z } from "zod";

export const blockUserSchema = z.object({
    blockedUserId: z.string().uuid(),
});
