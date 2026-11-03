-- Full-text message search was removed. The column and index were applied by
-- hand outside drizzle, so IF EXISTS keeps this safe on databases without them.
DROP INDEX IF EXISTS "idx_messages_search";--> statement-breakpoint
ALTER TABLE "messages" DROP COLUMN IF EXISTS "search_vector";
