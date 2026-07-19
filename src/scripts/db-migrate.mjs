#!/usr/bin/env node
/**
 * Runtime migration runner. Applies the generated SQL in ./drizzle against
 * DATABASE_URL. Pure JS (no TS import, no drizzle-kit) so it runs via plain
 * `node` inside the production container — invoked on boot by the entrypoint,
 * and available locally via `npm run db:migrate`.
 */
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("[db:migrate] DATABASE_URL is not set");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: url });
try {
  const db = drizzle(pool);
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("[db:migrate] migrations applied");
} catch (err) {
  console.error("[db:migrate] failed:", err);
  process.exitCode = 1;
} finally {
  await pool.end();
}
