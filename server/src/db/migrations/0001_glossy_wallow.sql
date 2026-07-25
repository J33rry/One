ALTER TABLE "passkeys" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "passkeys" CASCADE;--> statement-breakpoint
ALTER TABLE "message_reactions" DROP CONSTRAINT "message_reactions_message_id_user_id_unique";--> statement-breakpoint
ALTER TABLE "call_participants" DROP CONSTRAINT "call_participants_call_id_user_id_unique";--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password_reset_nonce" text;--> statement-breakpoint
ALTER TABLE "message_reactions" ADD CONSTRAINT "message_reactions_message_id_user_id_reaction_unique" UNIQUE("message_id","user_id","reaction");