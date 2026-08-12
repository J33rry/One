import { pgTable, uuid, varchar, timestamp, index } from "drizzle-orm/pg-core";
// import { sql } from "drizzle-orm";
import { chats } from "./chats.js";
import { users } from "./users.js";

export const calls = pgTable(
    "calls",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        chatId: uuid("chat_id")
            .notNull()
            .references(() => chats.id, { onDelete: "cascade" }),
        initiatorId: uuid("initiator_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        roomName: varchar("room_name", { length: 255 }).notNull().unique(),
        type: varchar("type", { length: 20 }).notNull(),
        startedAt: timestamp("started_at", { withTimezone: true })
            .notNull()
            .defaultNow(),
        endedAt: timestamp("ended_at", { withTimezone: true }),
    },
    (table) => [
        index("idx_calls_chat").on(table.chatId),
        index("idx_calls_initiator").on(table.initiatorId),
    ],
);
