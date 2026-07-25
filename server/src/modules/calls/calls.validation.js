import { z } from "zod";

export const initiateCallSchema = z.object({
    type: z.enum(["audio", "video"]),
});
