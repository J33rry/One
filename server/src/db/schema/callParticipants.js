import { pgTable, uuid, timestamp, index } from "drizzle-orm/pg-core";
// import { sql } from "drizzle-orm";
import { calls } from "./calls.js";
import { users } from "./users.js";

export const callParticipants = pgTable(
    "call_participants",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        callId: uuid("call_id")
            .notNull()
            .references(() => calls.id, { onDelete: "cascade" }),
        userId: uuid("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        joinedAt: timestamp("joined_at", { withTimezone: true }),
        leftAt: timestamp("left_at", { withTimezone: true }),
    },
    (table) => [
        index("idx_call_participants_call").on(table.callId),
        index("idx_call_participants_user").on(table.userId),
    ],
);
