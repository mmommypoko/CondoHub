CREATE TYPE "public"."payee_type" AS ENUM('PROJECT', 'OWNER');--> statement-breakpoint
CREATE TYPE "public"."turnover_creation_mode" AS ENUM('PROJECT_MANAGED', 'PRIVATE_OWNER_MANAGED', 'UNKNOWN');--> statement-breakpoint
ALTER TABLE "payment_instruction" ALTER COLUMN "payee_type" SET DATA TYPE "public"."payee_type" USING "payee_type"::"public"."payee_type";--> statement-breakpoint
ALTER TABLE "turnover_billing_review" ALTER COLUMN "management_mode_at_creation" SET DATA TYPE "public"."turnover_creation_mode" USING "management_mode_at_creation"::"public"."turnover_creation_mode";--> statement-breakpoint
ALTER TABLE "payment_submission" ADD COLUMN "submitted_at" timestamp with time zone DEFAULT now() NOT NULL;