import { z } from "zod";

export const registerSchema = z.object({
    username: z
        .string()
        .min(3)
        .max(30)
        .regex(/^[a-zA-Z0-9_]+$/, "Username must be alphanumeric or underscores"),
    displayName: z.string().min(1).max(100),
    email: z.string().email().max(255),
    password: z.string().min(8).max(128),
});

export const loginPasswordSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
});

export const passkeyVerifySchema = z.object({
    credential: z.any(),
});

export const passkeyRenameSchema = z.object({
    deviceName: z.string().min(1).max(100),
});

export const passwordChangeSchema = z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8).max(128),
});

export const forgotPasswordSchema = z.object({
    email: z.string().email(),
});

export const resetWebauthnOptionsSchema = z.object({
    resetToken: z.string().min(1),
});

export const resetWebauthnVerifySchema = z.object({
    mfaToken: z.string().min(1),
    credential: z.any(),
    newPassword: z.string().min(8).max(128),
});
