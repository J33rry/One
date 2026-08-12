import {
    pgTable,
    uuid,
    varchar,
    text,
    timestamp,
    index,
} from "drizzle-orm/pg-core";
// import { sql } from "drizzle-orm";
import { users } from "./users.js";

export const chats = pgTable(
    "chats",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        type: varchar("type", { length: 20 }).notNull(),
        name: varchar("name", { length: 100 }),
        description: text("description"),
        avatarUrl: text("avatar_url"),
        createdBy: uuid("created_by").references(() => users.id, {
            onDelete: "set null",
        }),
        createdAt: timestamp("created_at", { withTimezone: true })
            .notNull()
            .defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true })
            .notNull()
            .defaultNow(),
    },
    (table) => [index("idx_chats_type").on(table.type)],
);
