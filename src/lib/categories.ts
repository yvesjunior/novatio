import { promises as fs } from "node:fs";
import path from "node:path";
import { PRODUCTS_DIR, slugify } from "./portfolio";

/**
 * Categories are the single source of truth for the portfolio taxonomy, stored
 * as an ordered JSON list at products/_categories.json (on the mounted volume,
 * so writable at runtime and served statically to the public filter page).
 *
 * Array order = display order. Consumed by:
 *   - lib/portfolio.ts / admin portfolio route (validation)
 *   - lib/products-build.mjs (sort order of _index.json)
 *   - static_site/.../portfolio/index.html (public filter order + labels)
 *   - app/admin/categories (management UI)
 */
export const CATEGORIES_PATH = path.join(PRODUCTS_DIR, "_categories.json");

export interface CategoryDef {
  slug: string;
  label: string;
}

const DEFAULT_CATEGORIES: CategoryDef[] = [
  { slug: "pods", label: "Pods" },
  { slug: "modular-homes", label: "Modular Homes" },
  { slug: "floating-homes", label: "Floating Homes" },
];

function sanitize(list: unknown): CategoryDef[] {
  if (!Array.isArray(list)) return [];
  const seen = new Set<string>();
  const out: CategoryDef[] = [];
  for (const entry of list) {
    const slug = slugify(typeof entry?.slug === "string" ? entry.slug : "");
    if (!slug || seen.has(slug)) continue;
    const label =
      typeof entry?.label === "string" && entry.label.trim() ? entry.label.trim() : slug;
    seen.add(slug);
    out.push({ slug, label });
  }
  return out;
}

/** Read the ordered category list, seeding the default file on first access. */
export async function readCategories(): Promise<CategoryDef[]> {
  try {
    const text = await fs.readFile(CATEGORIES_PATH, "utf-8");
    const parsed = sanitize(JSON.parse(text));
    if (parsed.length) return parsed;
  } catch {
    // fall through to seeding
  }
  await writeCategories(DEFAULT_CATEGORIES);
  return DEFAULT_CATEGORIES;
}

/** Persist the ordered category list (sanitized: valid slugs, deduped). */
export async function writeCategories(list: CategoryDef[]): Promise<CategoryDef[]> {
  const clean = sanitize(list);
  await fs.mkdir(PRODUCTS_DIR, { recursive: true });
  await fs.writeFile(CATEGORIES_PATH, JSON.stringify(clean, null, 2) + "\n", "utf-8");
  return clean;
}

/** True when `slug` is one of the defined category slugs. */
export function isValidCategorySlug(slug: unknown, list: CategoryDef[]): slug is string {
  return typeof slug === "string" && list.some((c) => c.slug === slug);
}
