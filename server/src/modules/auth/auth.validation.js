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

export const loginGoogleSchema = z.object({
    idToken: z.string().min(1),
});

export const passwordChangeSchema = z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8).max(128),
});

export const forgotPasswordSchema = z.object({
    email: z.string().email(),
});

export const resetPasswordSchema = z.object({
    resetToken: z.string().min(1),
    newPassword: z.string().min(8).max(128),
});
