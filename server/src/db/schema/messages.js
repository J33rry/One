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

/**
 * NOTE: the table also has a `search_vector tsvector GENERATED ALWAYS AS
 * (to_tsvector('english', coalesce(content,''))) STORED` column with a GIN
 * index (idx_messages_search), applied as plain SQL and deliberately NOT
 * declared here. drizzle-orm 0.45 has no tsvector type, and declaring it via
 * customType would make every bare `db.select().from(messages)` return the
 * vector blob. Search queries reference it as sql`search_vector` instead.
 * The two-argument to_tsvector form is required: it is IMMUTABLE, which a
 * STORED generated column needs.
 */
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
        // Serves both the keyset pagination in findMessages and the unread count.
        index("idx_messages_chat_created").on(table.chatId, table.createdAt),
    ],
);
