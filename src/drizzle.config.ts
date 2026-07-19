import type { Config } from "drizzle-kit";

/**
 * drizzle-kit config — used only at dev/build time to GENERATE migration SQL
 * (`npm run db:generate`). The runtime migrator (scripts/db-migrate.mjs) applies
 * the generated SQL and does not depend on drizzle-kit.
 */
export default {
  dialect: "postgresql",
  schema: "./lib/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://localhost:5432/nanopods",
  },
} satisfies Config;
