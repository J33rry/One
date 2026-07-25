import { Router } from "express";
import * as ctrl from "./auth.controller.js";
import { requireAuth } from "../../middleware/requireAuth.js";
import { rateLimiter } from "../../middleware/rateLimiter.js";

const router = Router();

const loginLimiter = rateLimiter({ windowMs: 60_000, max: 5 });
const forgotLimiter = rateLimiter({ windowMs: 60_000, max: 3 });

// Registration
router.post("/register", ctrl.register);

// Login
router.post("/login/password", loginLimiter, ctrl.loginPassword);
router.post("/login/google", loginLimiter, ctrl.loginGoogle);

// Password
router.post("/password/change", requireAuth(), ctrl.changePassword);
router.post("/password/forgot", forgotLimiter, ctrl.forgotPassword);
router.post("/password/reset", ctrl.resetPassword);

// Logout
router.post("/logout", requireAuth(), ctrl.logout);

export default router;
