import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { AppError } from "../lib/AppError.js";

// Validates the short-lived JWT issued after password verification (login step 1)
// or during password-reset flows. Scoped by `purpose` claim.
export function requireMfaToken(expectedPurpose = "mfa") {
    return (req, _res, next) => {
        const header = req.headers.authorization;
        if (!header?.startsWith("Bearer ")) {
            throw new AppError(401, "MFA token required", "MFA_TOKEN_MISSING");
        }

        try {
            const payload = jwt.verify(header.slice(7), env.JWT_SECRET);

            if (payload.purpose !== expectedPurpose) {
                throw new AppError(401, "Invalid token purpose", "MFA_TOKEN_INVALID");
            }

            req.mfaUser = payload;
            next();
        } catch (err) {
            if (err instanceof AppError) throw err;
            throw new AppError(401, "Invalid or expired MFA token", "MFA_TOKEN_INVALID");
        }
    };
}
