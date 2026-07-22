#!/usr/bin/env node
/**
 * One-time seed: load the file-based site content into Postgres so the DB
 * becomes the source of truth (the app then serves content from the DB).
 *
 * Reads (relative to CWD = src/):
 *   static_site/archcraft/wp-content/uploads/products/_categories.json  → categories
 *   static_site/archcraft/wp-content/uploads/products/<cat>/<sku>/spec.json → products
 *
 * Idempotent — upserts by slug / sku. page_content starts empty (English base is
 * the HTML, French base is i18n/fr.json; DB only holds later edits).
 *
 * Run:  DATABASE_URL=postgres://... node scripts/seed-content.mjs
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("[seed] DATABASE_URL is not set");
  process.exit(1);
}

const PRODUCTS_DIR = path.join(process.cwd(), "static_site", "archcraft", "wp-content", "uploads", "products");
const CATEGORIES_PATH = path.join(PRODUCTS_DIR, "_categories.json");

async function readJson(p, fallback) {
  try {
    return JSON.parse(await fs.readFile(p, "utf-8"));
  } catch {
    return fallback;
  }
}

/** Find every spec.json under products/ (skipping _-prefixed dirs). */
async function findSpecs(dir) {
  const out = [];
  async function walk(d) {
    for (const e of await fs.readdir(d, { withFileTypes: true })) {
      if (e.name.startsWith("_") || e.name.startsWith(".")) continue;
      const full = path.join(d, e.name);
      if (e.isDirectory()) await walk(full);
      else if (e.name === "spec.json") out.push(full);
    }
  }
  await walk(dir);
  return out;
}

const pool = new pg.Pool({ connectionString: url });
try {
  // ---- categories ----
  const cats = await readJson(CATEGORIES_PATH, []);
  let nCat = 0;
  for (let i = 0; i < cats.length; i++) {
    const c = cats[i];
    if (!c?.slug) continue;
    await pool.query(
      `INSERT INTO categories (slug, label, position) VALUES ($1,$2,$3)
       ON CONFLICT (slug) DO UPDATE SET label = EXCLUDED.label, position = EXCLUDED.position, updated_at = now()`,
      [c.slug, c.label ?? c.slug, i],
    );
    nCat++;
  }
  console.log(`[seed] categories: upserted ${nCat}`);

  // ---- products ----
  const specs = await findSpecs(PRODUCTS_DIR);
  let nProd = 0;
  for (const specPath of specs) {
    const spec = await readJson(specPath, null);
    if (!spec) continue;
    const repoRel = path.relative(PRODUCTS_DIR, path.dirname(specPath)).split(path.sep);
    const category = spec.taxonomy?.category ?? repoRel[0] ?? "";
    const sku = spec.sku ?? repoRel[repoRel.length - 1];
    const status = spec.status === "draft" ? "draft" : "published";
    await pool.query(
      `INSERT INTO products (sku, category, status, name, spec, position) VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (sku) DO UPDATE SET category = EXCLUDED.category, status = EXCLUDED.status,
         name = EXCLUDED.name, spec = EXCLUDED.spec, updated_at = now()`,
      [sku, category, status, spec.name ?? sku, JSON.stringify(spec), 0],
    );
    nProd++;
  }
  console.log(`[seed] products: upserted ${nProd}`);
} catch (err) {
  console.error("[seed] failed:", err);
  process.exitCode = 1;
} finally {
  await pool.end();
}
