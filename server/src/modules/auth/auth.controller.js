import { asyncHandler } from "../../lib/asyncHandler.js";
import * as authService from "./auth.service.js";
import * as v from "./auth.validation.js";

export const register = asyncHandler(async (req, res, next) => {
    const body = v.registerSchema.parse(req.body);
    const user = await authService.register(body);

    req.session.userId = user.id;

    // Persist the session to the store before responding, so the session
    // cookie the client receives is backed by a saved session (userId present).
    req.session.save((err) => {
        if (err) return next(err);
        res.status(201).json({ user });
    });
});

// ── Login flow ──

export const loginPassword = asyncHandler(async (req, res, next) => {
    const body = v.loginPasswordSchema.parse(req.body);
    const user = await authService.loginWithPassword(body);

    // Regenerate to prevent session fixation, then explicitly save so the
    // regenerated session (with userId) is written to the store before the
    // response/cookie are sent — otherwise a later reload sees no userId.
    req.session.regenerate((err) => {
        if (err) return next(err);
        req.session.userId = user.id;
        req.session.save((saveErr) => {
            if (saveErr) return next(saveErr);
            res.json({ user });
        });
    });
});

export const loginGoogle = asyncHandler(async (req, res, next) => {
    const { idToken } = v.loginGoogleSchema.parse(req.body);
    const user = await authService.loginWithGoogle(idToken);

    req.session.regenerate((err) => {
        if (err) return next(err);
        req.session.userId = user.id;
        req.session.save((saveErr) => {
            if (saveErr) return next(saveErr);
            res.json({ user });
        });
    });
});

// ── Password change ──

export const changePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = v.passwordChangeSchema.parse(req.body);
    await authService.changePassword(req.user.id, currentPassword, newPassword);
    res.json({ message: "Password changed" });
});

// ── Forgot / reset password ──

export const forgotPassword = asyncHandler(async (req, res) => {
    const { email } = v.forgotPasswordSchema.parse(req.body);
    await authService.forgotPassword(email);
    // Always 200 to prevent email enumeration
    res.json({ message: "If that email exists, a reset link has been sent" });
});

export const resetPassword = asyncHandler(async (req, res) => {
    const { resetToken, newPassword } = v.resetPasswordSchema.parse(req.body);
    await authService.resetPassword(resetToken, newPassword);
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
