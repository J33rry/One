import {
    pgTable,
    uuid,
    varchar,
    text,
    boolean,
    timestamp,
} from "drizzle-orm/pg-core";
// import { sql } from "drizzle-orm";

export const users = pgTable("users", {
    id: uuid("id").primaryKey().defaultRandom(),
    username: varchar("username", { length: 30 }).notNull().unique(),
    displayName: varchar("display_name", { length: 100 }).notNull(),
    avatarUrl: text("avatar_url"),
    bio: varchar("bio", { length: 255 }),
    email: varchar("email", { length: 255 }).notNull().unique(),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    passwordHash: text("password_hash"),
    passwordResetNonce: text("password_reset_nonce"),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
});
