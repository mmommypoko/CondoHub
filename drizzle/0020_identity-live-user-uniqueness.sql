ALTER TABLE "user" DROP CONSTRAINT "user_email_unique";--> statement-breakpoint
ALTER TABLE "user" DROP CONSTRAINT "user_username_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "user_email_live_uq" ON "user" USING btree ("email") WHERE "user"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "user_username_live_uq" ON "user" USING btree ("username") WHERE "user"."deleted_at" is null;