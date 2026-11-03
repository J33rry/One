import {
    pgTable,
    uuid,
    timestamp,
    index,
    unique,
} from "drizzle-orm/pg-core";
import { chats } from "./chats.js";
import { chatFolders } from "./chatFolders.js";

// Many-to-many: a chat can sit in more than one folder.
export const chatFolderItems = pgTable(
    "chat_folder_items",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        folderId: uuid("folder_id")
            .notNull()
            .references(() => chatFolders.id, { onDelete: "cascade" }),
        chatId: uuid("chat_id")
            .notNull()
            .references(() => chats.id, { onDelete: "cascade" }),
        createdAt: timestamp("created_at", { withTimezone: true })
            .notNull()
            .defaultNow(),
    },
    (table) => [
        index("idx_chat_folder_items_folder").on(table.folderId),
        index("idx_chat_folder_items_chat").on(table.chatId),
        unique().on(table.folderId, table.chatId),
    ],
);
