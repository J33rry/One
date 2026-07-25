import {
    pgTable,
    uuid,
    varchar,
    timestamp,
    index,
    unique,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
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
    },
    (table) => [
        index("idx_chat_participants_chat").on(table.chatId),
        index("idx_chat_participants_user").on(table.userId),
        unique().on(table.chatId, table.userId),
    ],
);
