import {
    pgTable,
    uuid,
    varchar,
    boolean,
    timestamp,
    index,
    unique,
} from "drizzle-orm/pg-core";
// import { sql } from "drizzle-orm";
import { users } from "./users.js";
import { chats } from "./chats.js";

export const chatParticipants = pgTable(
    "chat_participants",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        chatId: uuid("chat_id")
            .notNull()
            .references(() => chats.id, { onDelete: "cascade" }),
        userId: uuid("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        role: varchar("role", { length: 20 }).notNull().default("member"),
        joinedAt: timestamp("joined_at", { withTimezone: true })
            .notNull()
            .defaultNow(),
        // Per-user chat state. These live here, not on `chats`, so one member
        // pinning a group does not pin it for everyone else.
        lastReadAt: timestamp("last_read_at", { withTimezone: true }),
        pinnedAt: timestamp("pinned_at", { withTimezone: true }),
        archivedAt: timestamp("archived_at", { withTimezone: true }),
        isMuted: boolean("is_muted").notNull().default(false),
    },
    (table) => [
        index("idx_chat_participants_chat").on(table.chatId),
        index("idx_chat_participants_user").on(table.userId),
        index("idx_chat_participants_user_state").on(
            table.userId,
            table.archivedAt,
            table.pinnedAt,
        ),
        unique().on(table.chatId, table.userId),
    ],
);
