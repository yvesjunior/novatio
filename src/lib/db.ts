import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

/**
 * Lazily-constructed Drizzle client over a shared pg connection pool.
 * Required env: DATABASE_URL (postgres://user:pass@host:5432/db).
 */
type Db = ReturnType<typeof drizzle<typeof schema>>;

let db: Db | null = null;

export function getDb(): Db {
  if (db) return db;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const pool = new Pool({ connectionString: url });
  db = drizzle(pool, { schema });
  return db;
}
