import http from "node:http";

// Add global BigInt serialization support for JSON.stringify
BigInt.prototype.toJSON = function () {
    return this.toString();
};
import express from "express";
import cookieParser from "cookie-parser";
import session from "express-session";
import { RedisStore } from "connect-redis";
import { createClient } from "redis";
import cors from "cors";

import { env } from "./src/config/env.js";
import { errorHandler } from "./src/middleware/errorHandler.js";
import { setupWebSocketGateway } from "./src/ws/gateway.js";

import authRoutes from "./src/modules/auth/auth.routes.js";
import usersRoutes from "./src/modules/users/users.routes.js";
import contactsRoutes from "./src/modules/contacts/contacts.routes.js";
import blockedRoutes from "./src/modules/blocked/blocked.routes.js";
import chatsRoutes from "./src/modules/chats/chats.routes.js";
import messagesRoutes from "./src/modules/messages/messages.routes.js";
import mediaRoutes from "./src/modules/media/media.routes.js";
import callsRoutes from "./src/modules/calls/calls.routes.js";

const app = express();

// ── Redis client ──
const redisClient = createClient({ url: env.REDIS_URL });
redisClient.on("error", (err) => console.error("[REDIS]", err));
await redisClient.connect();

// ── Session middleware (shared with WS upgrade) ──
const sessionMiddleware = session({
    store: new RedisStore({ client: redisClient }),
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: env.NODE_ENV === "production",
        httpOnly: true,
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
});

// ── Global middleware ──
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(sessionMiddleware);

// ── API routes ──
app.get("/api/v1/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", usersRoutes);
app.use("/api/v1/contacts", contactsRoutes);
app.use("/api/v1/blocked", blockedRoutes);
app.use("/api/v1/chats", chatsRoutes);
// Messages routes are scoped under /chats/:chatId/messages
app.use("/api/v1/chats", messagesRoutes);
app.use("/api/v1/media", mediaRoutes);
// Calls routes have both /chats/:chatId/calls and /calls/:callId/*
app.use("/api/v1", callsRoutes);

// ── Centralized error handler (must be last) ──
app.use(errorHandler);

// ── HTTP + WebSocket server ──
const server = http.createServer(app);
setupWebSocketGateway(server, sessionMiddleware);

server.listen(env.PORT, () => {
    console.log(`Server running on port ${env.PORT}`);
    console.log(`WebSocket available at ws://localhost:${env.PORT}/ws`);
});
