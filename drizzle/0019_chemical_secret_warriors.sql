ALTER TYPE "public"."idempotency_scope" ADD VALUE 'OWNER_TRANSFER';--> statement-breakpoint
ALTER TYPE "public"."idempotency_scope" ADD VALUE 'OWNER_REMOVE';--> statement-breakpoint
ALTER TYPE "public"."idempotency_scope" ADD VALUE 'OWNER_CORRECT';--> statement-breakpoint
ALTER TYPE "public"."idempotency_scope" ADD VALUE 'TENANCY_END';