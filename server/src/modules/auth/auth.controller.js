import { asyncHandler } from "../../lib/asyncHandler.js";
import * as authService from "./auth.service.js";
import * as v from "./auth.validation.js";

export const register = asyncHandler(async (req, res) => {
    const body = v.registerSchema.parse(req.body);
    const user = await authService.register(body);

    // Create session immediately so the user can enroll their first passkey
    req.session.userId = user.id;
    req.session.passkeyEnrolled = false;

    res.status(201).json({ user });
});

// ── Initial passkey enrollment (right after registration) ──

export const registerPasskeyOptions = asyncHandler(async (req, res) => {
    const options = await authService.generateRegOptions(req.user);
    req.session.currentChallenge = options.challenge;
    res.json({ options });
});

export const registerPasskeyVerify = asyncHandler(async (req, res) => {
    const { credential } = v.passkeyVerifySchema.parse(req.body);

    const passkey = await authService.verifyRegResponse(
        req.user,
        credential,
        req.session.currentChallenge,
    );

    req.session.currentChallenge = null;
    req.session.passkeyEnrolled = true;

    res.status(201).json({
        passkey: {
            id: passkey.id,
            deviceName: passkey.deviceName,
            createdAt: passkey.createdAt,
        },
    });
});

// ── Login flow ──

export const loginPassword = asyncHandler(async (req, res) => {
    const body = v.loginPasswordSchema.parse(req.body);
    const result = await authService.loginWithPassword(body);
    res.json(result);
});

export const loginWebauthnOptions = asyncHandler(async (req, res) => {
    const { options, mfaToken } = await authService.generateAuthOptions(
        req.mfaUser.userId,
    );
    res.json({ options, mfaToken });
});

export const loginWebauthnVerify = asyncHandler(async (req, res) => {
    const { credential } = v.passkeyVerifySchema.parse(req.body);

    const user = await authService.verifyAuth(
        req.mfaUser.userId,
        credential,
        req.mfaUser.challenge,
    );

    // Establish real session
    req.session.regenerate((err) => {
        if (err) throw err;
        req.session.userId = user.id;
        req.session.passkeyEnrolled = true;
        res.json({ user });
    });
});

// ── Passkey management ──

export const listPasskeys = asyncHandler(async (req, res) => {
    const passkeys = await authService.listPasskeys(req.user.id);
    res.json({ passkeys });
});

export const addPasskeyOptions = asyncHandler(async (req, res) => {
    const options = await authService.generateRegOptions(req.user);
    req.session.currentChallenge = options.challenge;
    res.json({ options });
});

export const addPasskeyVerify = asyncHandler(async (req, res) => {
    const { credential } = v.passkeyVerifySchema.parse(req.body);

    const passkey = await authService.verifyRegResponse(
        req.user,
        credential,
        req.session.currentChallenge,
    );

    req.session.currentChallenge = null;

    res.status(201).json({
        passkey: {
            id: passkey.id,
            deviceName: passkey.deviceName,
            createdAt: passkey.createdAt,
        },
    });
});

export const renamePasskey = asyncHandler(async (req, res) => {
    const { deviceName } = v.passkeyRenameSchema.parse(req.body);
    const passkey = await authService.renamePasskey(req.params.passkeyId, deviceName);
    res.json({ passkey });
});

export const deletePasskey = asyncHandler(async (req, res) => {
    await authService.removePasskey(req.user.id, req.params.passkeyId);
    res.status(204).end();
});

// ── Password change ──

export const changePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = v.passwordChangeSchema.parse(req.body);
    await authService.changePassword(req.user.id, currentPassword, newPassword);
    res.json({ message: "Password changed" });
});

// ── Forgot / reset password (WebAuthn-verified) ──

export const forgotPassword = asyncHandler(async (req, res) => {
    const { email } = v.forgotPasswordSchema.parse(req.body);
    await authService.forgotPassword(email);
    // Always 200 to prevent email enumeration
    res.json({ message: "If that email exists, a reset link has been sent" });
});

export const resetWebauthnOptions = asyncHandler(async (req, res) => {
    const { resetToken } = v.resetWebauthnOptionsSchema.parse(req.body);
    const result = await authService.resetWebauthnOptions(resetToken);
    res.json(result);
});

export const resetWebauthnVerify = asyncHandler(async (req, res) => {
    const { mfaToken, credential, newPassword } =
        v.resetWebauthnVerifySchema.parse(req.body);
    await authService.resetPasswordWithWebauthn(mfaToken, credential, newPassword);
    res.json({ message: "Password reset successful" });
});

// ── Logout ──

export const logout = asyncHandler(async (req, res) => {
    req.session.destroy((err) => {
        if (err) throw err;
        res.clearCookie("connect.sid");
        res.json({ message: "Logged out" });
    });
});
