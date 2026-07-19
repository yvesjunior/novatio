import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * Server-side helpers for managing portfolio items (products/<cat>/<sku>/spec.json).
 * Paths resolve from process.cwd() — `src/` in dev, `/app` in the Docker runner —
 * so both point at the mounted static_site volume.
 */
const ROOT = path.join(process.cwd(), "static_site", "archcraft");
export const PRODUCTS_DIR = path.join(ROOT, "wp-content", "uploads", "products");
export const PORTFOLIO_DIR = path.join(ROOT, "portfolio");
export const INDEX_PATH = path.join(PRODUCTS_DIR, "_index.json");

/**
 * A category is just its slug. The set of valid categories is no longer hardcoded
 * here — it lives in products/_categories.json (see lib/categories.ts) and is
 * validated at the call site against that list.
 */
export type Category = string;

/** kebab-case slug: strip accents, lowercase, non-alphanumerics -> hyphen. */
export function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export interface IndexEntry {
  sku: string;
  name: string;
  tagline: string;
  status: string;
  category: string;
  hero: string;
  has_hero: boolean;
  url: string;
  slug_path: string;
  slides: { url: string; type: string }[];
}

/** Read the generated _index.json (empty array if it doesn't exist yet). */
export async function readIndex(): Promise<IndexEntry[]> {
  try {
    const text = await fs.readFile(INDEX_PATH, "utf-8");
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Absolute dir for a category/sku SKU folder. */
export function skuDir(category: Category, sku: string): string {
  return path.join(PRODUCTS_DIR, category, sku);
}

/** Pick an unused sku under the category, appending -2, -3, ... on collision. */
export async function uniqueSku(category: Category, base: string): Promise<string> {
  let candidate = base || "item";
  let n = 2;
  for (;;) {
    try {
      await fs.access(skuDir(category, candidate));
      candidate = `${base}-${n++}`;
    } catch {
      return candidate;
    }
  }
}

/** Resolve a slug_path ("pods/aura") to its SKU dir under products/, guarding traversal. */
export function skuDirFromSlugPath(slugPath: string): string | null {
  const segments = slugPath.split("/").filter(Boolean);
  if (segments.length === 0 || segments.some((s) => s === "." || s === "..")) return null;
  const abs = path.join(PRODUCTS_DIR, ...segments);
  // Ensure the resolved path stays inside PRODUCTS_DIR.
  if (abs !== PRODUCTS_DIR && !abs.startsWith(PRODUCTS_DIR + path.sep)) return null;
  return abs;
}

/** Matching generated PDP dir under portfolio/ for a slug_path (defensive cleanup). */
export function pdpDirFromSlugPath(slugPath: string): string | null {
  const segments = slugPath.split("/").filter(Boolean);
  if (segments.length === 0 || segments.some((s) => s === "." || s === "..")) return null;
  const abs = path.join(PORTFOLIO_DIR, ...segments);
  if (!abs.startsWith(PORTFOLIO_DIR + path.sep)) return null;
  return abs;
}
