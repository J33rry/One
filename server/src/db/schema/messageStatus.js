import { pgTable, uuid, timestamp, index, unique } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { messages } from "./messages.js";
import { users } from "./users.js";

export const messageStatus = pgTable(
    "message_status",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        messageId: uuid("message_id")
            .notNull()
            .references(() => messages.id, { onDelete: "cascade" }),
        userId: uuid("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        deliveredAt: timestamp("delivered_at", { withTimezone: true }),
        readAt: timestamp("read_at", { withTimezone: true }),
    },
    (table) => [
        index("idx_message_status_message").on(table.messageId),
        index("idx_message_status_user").on(table.userId),
        unique().on(table.messageId, table.userId),
    ],
);
