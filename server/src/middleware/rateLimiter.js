import { AppError } from "../lib/AppError.js";

// Simple in-memory rate limiter. For production, use express-rate-limit with
// a Redis store (ioredis or node-redis) for distributed rate limiting.
const windows = new Map();

export function rateLimiter({ windowMs = 60_000, max = 10, keyFn } = {}) {
    return (req, _res, next) => {
        const key = keyFn ? keyFn(req) : req.ip;
        const now = Date.now();

        if (!windows.has(key)) {
            windows.set(key, { count: 1, resetAt: now + windowMs });
            return next();
        }

        const entry = windows.get(key);

        if (now > entry.resetAt) {
            entry.count = 1;
            entry.resetAt = now + windowMs;
            return next();
        }

        entry.count++;

        if (entry.count > max) {
            throw new AppError(429, "Too many requests, try again later", "RATE_LIMITED");
        }

        next();
    };
}
