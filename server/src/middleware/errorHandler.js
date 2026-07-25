import { ZodError } from "zod";
import { AppError } from "../lib/AppError.js";

// Hook point: add Sentry.captureException, Datadog, structured logger, etc.
export function errorHandler(err, req, res, _next) {
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            error: { code: err.code, message: err.message },
        });
    }

    if (err instanceof ZodError) {
        return res.status(422).json({
            error: {
                code: "VALIDATION_ERROR",
                message: "Invalid input",
                details: err.issues.map((e) => ({
                    path: e.path.join("."),
                    message: e.message,
                })),
            },
        });
    }

    console.error("[UNHANDLED ERROR]", err);
    res.status(500).json({
        error: { code: "INTERNAL_ERROR", message: "Something went wrong" },
    });
}
