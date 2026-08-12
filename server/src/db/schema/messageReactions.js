import {
    pgTable,
    uuid,
    varchar,
    timestamp,
    index,
    unique,
} from "drizzle-orm/pg-core";
// import { sql } from "drizzle-orm";
import { messages } from "./messages.js";
import { users } from "./users.js";

export const messageReactions = pgTable(
    "message_reactions",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        messageId: uuid("message_id")
            .notNull()
            .references(() => messages.id, { onDelete: "cascade" }),
        userId: uuid("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        reaction: varchar("reaction", { length: 10 }).notNull(),
        createdAt: timestamp("created_at", { withTimezone: true })
            .notNull()
            .defaultNow(),
    },
    (table) => [
        index("idx_message_reactions_message").on(table.messageId),
        unique().on(table.messageId, table.userId, table.reaction),
    ],
);
