import {
    pgTable,
    uuid,
    varchar,
    text,
    bigint,
    timestamp,
    index,
    uniqueIndex,
} from "drizzle-orm/pg-core";
// import { sql } from "drizzle-orm";
import { users } from "./users.js";

export const media = pgTable(
    "media",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        uploaderId: uuid("uploader_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        storageId: text("storage_id").notNull(),
        fileName: varchar("file_name", { length: 255 }).notNull(),
        mimeType: varchar("mime_type", { length: 100 }).notNull(),
        fileSize: bigint("file_size", { mode: "bigint" }).notNull(),
        createdAt: timestamp("created_at", { withTimezone: true })
            .notNull()
            .defaultNow(),
    },
    (table) => [
        index("idx_media_uploader").on(table.uploaderId),
        uniqueIndex("idx_media_storage").on(table.storageId),
    ],
);
