import argon2 from "argon2";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import {
    generateRegistrationOptions,
    verifyRegistrationResponse,
    generateAuthenticationOptions,
    verifyAuthenticationResponse,
} from "@simplewebauthn/server";

import { env } from "../../config/env.js";
import { rpName, rpID, origin } from "../../config/webauthn.js";
import { AppError } from "../../lib/AppError.js";
import { sendPasswordResetEmail } from "../../lib/email.js";
import * as repo from "./auth.repository.js";

function signMfaToken(payload, expiresIn = "5m") {
    return jwt.sign({ ...payload, purpose: "mfa" }, env.JWT_SECRET, { expiresIn });
}

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
        passkeyEnrolled: false,
    });

    return sanitizeUser(user);
}

// ── Passkey Registration (first enrollment + additional keys) ──

export async function generateRegOptions(user) {
    const existingPasskeys = await repo.findPasskeysByUserId(user.id);

    const options = await generateRegistrationOptions({
        rpName,
        rpID,
        userName: user.username,
        userID: new TextEncoder().encode(user.id),
        attestationType: "none",
        excludeCredentials: existingPasskeys.map((pk) => ({
            id: pk.credentialId.toString("base64url"),
            transports: pk.transports || undefined,
        })),
        authenticatorSelection: {
            residentKey: "preferred",
            userVerification: "preferred",
        },
    });

    return options;
}

export async function verifyRegResponse(user, credential, expectedChallenge) {
    const verification = await verifyRegistrationResponse({
        response: credential,
        expectedChallenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
    });

    if (!verification.verified || !verification.registrationInfo) {
        throw new AppError(400, "Passkey registration failed", "WEBAUTHN_VERIFICATION_FAILED");
    }

    const { credential: cred, credentialDeviceType, credentialBackedUp } =
        verification.registrationInfo;

    const passkey = await repo.createPasskey({
        userId: user.id,
        credentialId: Buffer.from(cred.id, "base64url"),
        publicKey: Buffer.from(cred.publicKey),
        signCount: BigInt(cred.counter),
        transports: cred.transports || null,
        deviceName: credentialDeviceType === "multiDevice" ? "Multi-device key" : "Single-device key",
    });

    if (!user.passkeyEnrolled) {
        await repo.updateUser(user.id, { passkeyEnrolled: true });
    }

    return passkey;
}

// ── Password Login (step 1 → mfa_token) ──

export async function loginWithPassword({ email, password }) {
    const user = await repo.findUserByEmail(email);
    // Constant-time-ish: always verify even if user doesn't exist
    if (!user) {
        await argon2.hash(password); // burn time to prevent timing oracle
        throw new AppError(401, "Invalid credentials", "INVALID_CREDENTIALS");
    }

    const valid = await argon2.verify(user.passwordHash, password);
    if (!valid) {
        throw new AppError(401, "Invalid credentials", "INVALID_CREDENTIALS");
    }

    const passkeyCount = await repo.countPasskeysByUserId(user.id);
    if (passkeyCount === 0) {
        throw new AppError(
            403,
            "No passkeys enrolled. Contact support.",
            "NO_PASSKEYS",
        );
    }

    const mfaToken = signMfaToken({ userId: user.id });
    return { mfaToken };
}

// ── WebAuthn Authentication (step 2 of login) ──

export async function generateAuthOptions(userId) {
    const userPasskeys = await repo.findPasskeysByUserId(userId);

    const options = await generateAuthenticationOptions({
        rpID,
        allowCredentials: userPasskeys.map((pk) => ({
            id: pk.credentialId.toString("base64url"),
            transports: pk.transports || undefined,
        })),
        userVerification: "preferred",
    });

    // Embed challenge in a new mfa_token so verification is stateless
    const mfaToken = jwt.sign(
        { purpose: "mfa", userId, challenge: options.challenge },
        env.JWT_SECRET,
        { expiresIn: "5m" },
    );

    return { options, mfaToken };
}

export async function verifyAuth(userId, credential, expectedChallenge) {
    const credIdBuffer = Buffer.from(credential.id, "base64url");
    const passkey = await repo.findPasskeyByCredentialId(credIdBuffer);

    if (!passkey || passkey.userId !== userId) {
        throw new AppError(401, "Passkey not found", "WEBAUTHN_VERIFICATION_FAILED");
    }

    const verification = await verifyAuthenticationResponse({
        response: credential,
        expectedChallenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        credential: {
            id: passkey.credentialId.toString("base64url"),
            publicKey: new Uint8Array(passkey.publicKey),
            counter: Number(passkey.signCount),
            transports: passkey.transports || undefined,
        },
    });

    if (!verification.verified) {
        throw new AppError(401, "WebAuthn verification failed", "WEBAUTHN_VERIFICATION_FAILED");
    }

    // Anti-replay: the authenticator's counter must strictly increase.
    // A counter that goes backward suggests a cloned authenticator.
    const newCount = verification.authenticationInfo.newCounter;
    if (newCount > 0 && newCount <= Number(passkey.signCount)) {
        throw new AppError(401, "Possible cloned authenticator detected", "SIGN_COUNT_REPLAY");
    }

    await repo.updatePasskey(passkey.id, {
        signCount: BigInt(newCount),
        lastUsedAt: new Date(),
    });

    const user = await repo.findUserById(userId);
    return sanitizeUser(user);
}

// ── Passkey Management ──

export async function listPasskeys(userId) {
    const keys = await repo.findPasskeysByUserId(userId);
    return keys.map(({ publicKey, credentialId, signCount, ...rest }) => ({
        ...rest,
        signCount: Number(signCount),
        credentialId: credentialId.toString("base64url"),
    }));
}

export async function renamePasskey(passkeyId, deviceName) {
    return repo.updatePasskey(passkeyId, { deviceName });
}

export async function removePasskey(userId, passkeyId) {
    const count = await repo.countPasskeysByUserId(userId);
    if (count <= 1) {
        throw new AppError(
            400,
            "Cannot delete your last passkey. Register another one first.",
            "LAST_PASSKEY",
        );
    }
    await repo.deletePasskey(passkeyId);
}

// ── Password Change ──

export async function changePassword(userId, currentPassword, newPassword) {
    const user = await repo.findUserById(userId);

    const valid = await argon2.verify(user.passwordHash, currentPassword);
    if (!valid) {
        throw new AppError(400, "Current password is incorrect", "INVALID_PASSWORD");
    }

    const newHash = await argon2.hash(newPassword);
    await repo.updateUser(userId, { passwordHash: newHash });
}

// ── Forgot Password (WebAuthn-verified reset) ──

export async function forgotPassword(email) {
    const user = await repo.findUserByEmail(email);
    // Don't reveal whether the email exists
    if (!user) return;

    const passkeyCount = await repo.countPasskeysByUserId(user.id);
    if (passkeyCount === 0) return;

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

export async function resetWebauthnOptions(resetToken) {
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

    const userPasskeys = await repo.findPasskeysByUserId(user.id);

    const options = await generateAuthenticationOptions({
        rpID,
        allowCredentials: userPasskeys.map((pk) => ({
            id: pk.credentialId.toString("base64url"),
            transports: pk.transports || undefined,
        })),
        userVerification: "required",
    });

    const mfaToken = jwt.sign(
        {
            purpose: "password_reset_mfa",
            userId: user.id,
            nonce: payload.nonce,
            challenge: options.challenge,
        },
        env.JWT_SECRET,
        { expiresIn: "5m" },
    );

    return { options, mfaToken };
}

export async function resetPasswordWithWebauthn(mfaToken, credential, newPassword) {
    let payload;
    try {
        payload = jwt.verify(mfaToken, env.JWT_SECRET);
    } catch {
        throw new AppError(400, "Invalid or expired MFA token", "MFA_TOKEN_INVALID");
    }

    if (payload.purpose !== "password_reset_mfa") {
        throw new AppError(400, "Invalid token purpose", "MFA_TOKEN_INVALID");
    }

    const user = await repo.findUserById(payload.userId);
    if (!user || user.passwordResetNonce !== payload.nonce) {
        throw new AppError(400, "Reset token already used", "RESET_TOKEN_USED");
    }

    // Verify WebAuthn the same way as login
    await verifyAuth(user.id, credential, payload.challenge);

    const newHash = await argon2.hash(newPassword);
    await repo.updateUser(user.id, {
        passwordHash: newHash,
        passwordResetNonce: null,
    });
}
