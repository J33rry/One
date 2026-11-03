import {
    pgTable,
    uuid,
    varchar,
    integer,
    timestamp,
    index,
    unique,
} from "drizzle-orm/pg-core";
import { users } from "./users.js";

export const chatFolders = pgTable(
    "chat_folders",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        userId: uuid("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        name: varchar("name", { length: 50 }).notNull(),
        icon: varchar("icon", { length: 30 }),
        position: integer("position").notNull().default(0),
        createdAt: timestamp("created_at", { withTimezone: true })
            .notNull()
            .defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true })
            .notNull()
            .defaultNow(),
    },
    (table) => [
        index("idx_chat_folders_user").on(table.userId),
        unique().on(table.userId, table.name),
    ],
);
