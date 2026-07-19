#!/usr/bin/env node
/**
 * One-time importer: load the legacy JSON files into Postgres.
 *
 * Reads (relative to CWD, i.e. `src/` locally or `/app` in the container):
 *   leads.json, contacts.json, data/newsletters.json
 *
 * - Newsletter rows dedupe via ON CONFLICT (email_lower) DO NOTHING, so this is
 *   always safe to re-run for subscribers.
 * - Leads/contacts have no natural key, so to avoid double-imports we SKIP them
 *   when their table already has rows. Original `ts` is preserved as created_at.
 *
 * The JSON files are left untouched (kept as a backup). Run: `npm run db:import`.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("[db:import] DATABASE_URL is not set");
  process.exit(1);
}

async function readJson(p) {
  try {
    const parsed = JSON.parse(await fs.readFile(p, "utf-8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function count(pool, table) {
  const r = await pool.query(`SELECT count(*)::int AS n FROM ${table}`);
  return r.rows[0].n;
}

const cwd = process.cwd();
const pool = new pg.Pool({ connectionString: url });

try {
  // ---- leads ----
  const leads = await readJson(path.join(cwd, "leads.json"));
  if (leads.length && (await count(pool, "leads")) > 0) {
    console.log(`[db:import] leads table not empty — skipping ${leads.length} JSON leads`);
  } else {
    let n = 0;
    for (const l of leads) {
      const c = l.answers?.contact ?? {};
      await pool.query(
        `INSERT INTO leads
           (created_at, tier, name, email, phone, message, project, timeline, property, budget, page, referrer, questions_asked, raw)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
        [
          l.ts ? new Date(l.ts) : new Date(),
          l.tier,
          c.name ?? null,
          c.email ?? null,
          c.phone ?? null,
          c.message ?? null,
          l.answers?.project ?? null,
          l.answers?.timeline ?? null,
          l.answers?.property ?? null,
          l.answers?.budget ?? null,
          l.page ?? null,
          l.referrer ?? null,
          l.questionsAsked ? JSON.stringify(l.questionsAsked) : null,
          JSON.stringify(l),
        ],
      );
      n++;
    }
    console.log(`[db:import] leads: imported ${n}`);
  }

  // ---- contacts ----
  const contacts = await readJson(path.join(cwd, "contacts.json"));
  if (contacts.length && (await count(pool, "contacts")) > 0) {
    console.log(`[db:import] contacts table not empty — skipping ${contacts.length} JSON contacts`);
  } else {
    let n = 0;
    for (const m of contacts) {
      await pool.query(
        `INSERT INTO contacts (created_at, name, email, message, page) VALUES ($1,$2,$3,$4,$5)`,
        [m.ts ? new Date(m.ts) : new Date(), m.name, m.email, m.message, m.page ?? null],
      );
      n++;
    }
    console.log(`[db:import] contacts: imported ${n}`);
  }

  // ---- newsletter subscribers (dedupe via unique index) ----
  const subs = await readJson(path.join(cwd, "data", "newsletters.json"));
  let inserted = 0;
  for (const s of subs) {
    if (!s.email) continue;
    const r = await pool.query(
      `INSERT INTO newsletter_subscribers (created_at, email, email_lower, page, referrer, locale)
       VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (email_lower) DO NOTHING`,
      [s.ts ? new Date(s.ts) : new Date(), s.email, s.email.toLowerCase(), s.page ?? null, s.referrer ?? null, s.locale ?? null],
    );
    inserted += r.rowCount ?? 0;
  }
  console.log(`[db:import] newsletter: inserted ${inserted} of ${subs.length} (rest were duplicates)`);
} catch (err) {
  console.error("[db:import] failed:", err);
  process.exitCode = 1;
} finally {
  await pool.end();
}
