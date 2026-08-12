import {
    pgTable,
    uuid,
    varchar,
    text,
    boolean,
    timestamp,
    index,
} from "drizzle-orm/pg-core";
// import { sql } from "drizzle-orm";
import { chats } from "./chats.js";
import { users } from "./users.js";
import { media } from "./media.js";

export const messages = pgTable(
    "messages",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        chatId: uuid("chat_id")
            .notNull()
            .references(() => chats.id, { onDelete: "cascade" }),
        senderId: uuid("sender_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        replyToMessageId: uuid("reply_to_message_id").references(
            () => messages.id,
            { onDelete: "set null" },
        ),
        type: varchar("type", { length: 20 }).notNull().default("text"),
        content: text("content"),
        mediaId: uuid("media_id").references(() => media.id, {
            onDelete: "set null",
        }),
        isEdited: boolean("is_edited").notNull().default(false),
        isDeleted: boolean("is_deleted").notNull().default(false),
        createdAt: timestamp("created_at", { withTimezone: true })
            .notNull()
            .defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true })
            .notNull()
            .defaultNow(),
    },
    (table) => [
        index("idx_messages_chat").on(table.chatId),
        index("idx_messages_sender").on(table.senderId),
        index("idx_messages_created").on(table.createdAt),
    ],
);
