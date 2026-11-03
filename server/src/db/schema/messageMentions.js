import {
    pgTable,
    uuid,
    timestamp,
    index,
    unique,
} from "drizzle-orm/pg-core";
import { messages } from "./messages.js";
import { users } from "./users.js";

// A table rather than parsing on read: "unread mentions of me" has to be
// indexable, and the rows survive edits by being rewritten.
export const messageMentions = pgTable(
    "message_mentions",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        messageId: uuid("message_id")
            .notNull()
            .references(() => messages.id, { onDelete: "cascade" }),
        userId: uuid("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        createdAt: timestamp("created_at", { withTimezone: true })
            .notNull()
            .defaultNow(),
    },
    (table) => [
        index("idx_message_mentions_message").on(table.messageId),
        index("idx_message_mentions_user").on(table.userId),
        unique().on(table.messageId, table.userId),
    ],
);
