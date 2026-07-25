import { Router } from "express";
import * as ctrl from "./auth.controller.js";
import { requireAuth } from "../../middleware/requireAuth.js";
import { requireMfaToken } from "../../middleware/requireMfaToken.js";
import { requireOwnership } from "../../middleware/ownership.js";
import { rateLimiter } from "../../middleware/rateLimiter.js";
import { findPasskeyById } from "./auth.repository.js";

const router = Router();

const loginLimiter = rateLimiter({ windowMs: 60_000, max: 5 });
const forgotLimiter = rateLimiter({ windowMs: 60_000, max: 3 });

const passkeyOwnership = requireOwnership(
    (req) => findPasskeyById(req.params.passkeyId),
);

// Registration
router.post("/register", ctrl.register);

// Initial passkey enrollment (user is authenticated but not yet enrolled)
router.post(
    "/register/passkey/options",
    requireAuth({ enforcePasskey: false }),
    ctrl.registerPasskeyOptions,
);
router.post(
    "/register/passkey/verify",
    requireAuth({ enforcePasskey: false }),
    ctrl.registerPasskeyVerify,
);

// Login (2-step: password → WebAuthn)
router.post("/login/password", loginLimiter, ctrl.loginPassword);
router.post(
    "/login/webauthn/options",
    requireMfaToken("mfa"),
    ctrl.loginWebauthnOptions,
);
router.post(
    "/login/webauthn/verify",
    requireMfaToken("mfa"),
    ctrl.loginWebauthnVerify,
);

// Passkey management (fully authenticated)
router.get("/passkeys", requireAuth(), ctrl.listPasskeys);
router.post("/passkeys/register/options", requireAuth(), ctrl.addPasskeyOptions);
router.post("/passkeys/register/verify", requireAuth(), ctrl.addPasskeyVerify);
router.patch(
    "/passkeys/:passkeyId",
    requireAuth(),
    passkeyOwnership,
    ctrl.renamePasskey,
);
router.delete(
    "/passkeys/:passkeyId",
    requireAuth(),
    passkeyOwnership,
    ctrl.deletePasskey,
);

// Password
router.post("/password/change", requireAuth(), ctrl.changePassword);
router.post("/password/forgot", forgotLimiter, ctrl.forgotPassword);
router.post("/password/reset/webauthn/options", ctrl.resetWebauthnOptions);
router.post("/password/reset/webauthn/verify", ctrl.resetWebauthnVerify);

// Logout
router.post("/logout", requireAuth(), ctrl.logout);

export default router;
