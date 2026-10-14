import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: [
    "./src/modules/identity-access/infrastructure/betterAuthSchema.ts",
    "./src/modules/property-membership/infrastructure/schema.ts",
    "./src/shared/db/schema/audit.ts",
    "./src/shared/db/schema/jobs.ts",
    "./src/shared/db/schema/idempotency.ts",
  ],
  out: "./drizzle",
  strict: true,
  verbose: true,
});
