import {
    pgTable,
    uuid,
    varchar,
    timestamp,
    index,
    unique,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users.js";

export const contacts = pgTable(
    "contacts",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        userId: uuid("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        contactId: uuid("contact_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        status: varchar("status", { length: 20 }).notNull().default("pending"),
        createdAt: timestamp("created_at", { withTimezone: true })
            .notNull()
            .defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true })
            .notNull()
            .defaultNow(),
    },
    (table) => [
        index("idx_contacts_user").on(table.userId),
        index("idx_contacts_contact").on(table.contactId),
        unique().on(table.userId, table.contactId),
    ],
);
