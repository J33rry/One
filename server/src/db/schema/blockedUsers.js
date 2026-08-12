import { pgTable, uuid, timestamp, index, unique } from "drizzle-orm/pg-core";
// import { sql } from "drizzle-orm";
import { users } from "./users.js";

export const blockedUsers = pgTable(
    "blocked_users",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        userId: uuid("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        blockedUserId: uuid("blocked_user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        createdAt: timestamp("created_at", { withTimezone: true })
            .notNull()
            .defaultNow(),
    },
    (table) => [
        index("idx_blocked_users_user").on(table.userId),
        index("idx_blocked_users_blocked").on(table.blockedUserId),
        unique().on(table.userId, table.blockedUserId),
    ],
);
