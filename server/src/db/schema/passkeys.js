import {
    pgTable,
    uuid,
    varchar,
    text,
    bigint,
    timestamp,
    index,
    customType,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users.js";

export const bytea = customType({
    dataType() {
        return "bytea";
    },
});

export const passkeys = pgTable(
    "passkeys",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        userId: uuid("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        credentialId: bytea("credential_id").notNull().unique(),
        publicKey: bytea("public_key").notNull(),
        signCount: bigint("sign_count", { mode: "bigint" })
            .notNull()
            .default(sql`0`),
        transports: text("transports").array(),
        deviceName: varchar("device_name", { length: 100 }),
        createdAt: timestamp("created_at", { withTimezone: true })
            .notNull()
            .defaultNow(),
        lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    },
    (table) => [index("idx_passkeys_user").on(table.userId)],
);
