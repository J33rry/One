import argon2 from "argon2";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { OAuth2Client } from "google-auth-library";

import { env } from "../../config/env.js";
import { AppError } from "../../lib/AppError.js";
import { sendPasswordResetEmail } from "../../lib/email.js";
import * as repo from "./auth.repository.js";

const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

function sanitizeUser(user) {
    const { passwordHash, passwordResetNonce, ...safe } = user;
    return safe;
}

// ── Registration ──

export async function register({ username, displayName, email, password }) {
    const existing = await repo.findUserByEmail(email);
    if (existing) {
        throw new AppError(409, "Email already registered", "EMAIL_TAKEN");
    }

    const passwordHash = await argon2.hash(password);

    const user = await repo.createUser({
        username,
        displayName,
        email,
        passwordHash,
    });

    return sanitizeUser(user);
}

// ── Password Login ──

export async function loginWithPassword({ email, password }) {
    const user = await repo.findUserByEmail(email);
    // Constant-time-ish: always verify even if user doesn't exist
    if (!user || !user.passwordHash) {
        await argon2.hash(password); // burn time to prevent timing oracle
        throw new AppError(401, "Invalid credentials", "INVALID_CREDENTIALS");
    }

    const valid = await argon2.verify(user.passwordHash, password);
    if (!valid) {
        throw new AppError(401, "Invalid credentials", "INVALID_CREDENTIALS");
    }

    return sanitizeUser(user);
}

// ── Google Login ──

export async function loginWithGoogle(idToken) {
    let payload;
    try {
        const ticket = await googleClient.verifyIdToken({
            idToken,
            audience: env.GOOGLE_CLIENT_ID,
        });
        payload = ticket.getPayload();
    } catch (error) {
        throw new AppError(401, "Invalid Google ID token", "GOOGLE_AUTH_FAILED");
    }

    if (!payload || !payload.email) {
        throw new AppError(401, "Could not get email from Google", "GOOGLE_AUTH_FAILED");
    }

    const email = payload.email;
    let user = await repo.findUserByEmail(email);

    if (!user) {
        // Auto-register the user if they don't exist
        const baseUsername = email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "");
        let username = baseUsername;
        let counter = 1;
        // Basic unique username generation
        while (true) {
            try {
                user = await repo.createUser({
                    username,
                    displayName: payload.name || baseUsername,
                    email,
                    avatarUrl: payload.picture,
                });
                break;
            } catch (e) {
                // If unique constraint failed on username, try another
                if (e.code === '23505' && e.constraint === 'users_username_unique') {
                    username = `${baseUsername}${counter++}`;
                } else {
                    throw e;
                }
            }
        }
    }

    return sanitizeUser(user);
}

// ── Password Change ──

export async function changePassword(userId, currentPassword, newPassword) {
    const user = await repo.findUserById(userId);

    if (user.passwordHash) {
        const valid = await argon2.verify(user.passwordHash, currentPassword);
        if (!valid) {
            throw new AppError(400, "Current password is incorrect", "INVALID_PASSWORD");
        }
    }

    const newHash = await argon2.hash(newPassword);
    await repo.updateUser(userId, { passwordHash: newHash });
}

// ── Forgot Password ──

export async function forgotPassword(email) {
    const user = await repo.findUserByEmail(email);
    // Don't reveal whether the email exists
    if (!user) return;

    const nonce = crypto.randomUUID();
    await repo.updateUser(user.id, { passwordResetNonce: nonce });

    const resetToken = jwt.sign(
        { purpose: "password_reset", userId: user.id, nonce },
        env.JWT_SECRET,
        { expiresIn: "15m" },
    );

    const resetLink = `${origin}/reset-password?token=${resetToken}`;
    await sendPasswordResetEmail(user.email, resetLink);
}

export async function resetPassword(resetToken, newPassword) {
    let payload;
    try {
        payload = jwt.verify(resetToken, env.JWT_SECRET);
    } catch {
        throw new AppError(400, "Invalid or expired reset token", "RESET_TOKEN_INVALID");
    }

    if (payload.purpose !== "password_reset") {
        throw new AppError(400, "Invalid token purpose", "RESET_TOKEN_INVALID");
    }

    const user = await repo.findUserById(payload.userId);
    if (!user || user.passwordResetNonce !== payload.nonce) {
        throw new AppError(400, "Reset token already used or invalid", "RESET_TOKEN_INVALID");
    }

    const newHash = await argon2.hash(newPassword);
    await repo.updateUser(user.id, {
        passwordHash: newHash,
        passwordResetNonce: null,
    });
}
