import { asc } from "drizzle-orm";
import { getDb } from "./db";
import { categories } from "./schema";
import { slugify } from "./portfolio";

/**
 * Categories are the single source of truth for the portfolio taxonomy, stored
 * in the `categories` Postgres table (moved off products/_categories.json so the
 * admin can edit them in production). Array order = display order (the `position`
 * column). Consumed by validation (admin portfolio routes), the public
 * `/api/categories` endpoint + filter, and product sorting.
 */

export interface CategoryDef {
  slug: string;
  label: string;
}

export const DEFAULT_CATEGORIES: CategoryDef[] = [
  { slug: "pods", label: "Pods" },
  { slug: "modular-homes", label: "Modular Homes" },
  { slug: "floating-homes", label: "Floating Homes" },
];

/** Sanitize an incoming list: valid slugs, non-empty labels, deduped, order preserved. */
export function sanitizeCategories(list: unknown): CategoryDef[] {
  if (!Array.isArray(list)) return [];
  const seen = new Set<string>();
  const out: CategoryDef[] = [];
  for (const entry of list) {
    const slug = slugify(typeof (entry as CategoryDef)?.slug === "string" ? (entry as CategoryDef).slug : "");
    if (!slug || seen.has(slug)) continue;
    const rawLabel = (entry as CategoryDef)?.label;
    const label = typeof rawLabel === "string" && rawLabel.trim() ? rawLabel.trim() : slug;
    seen.add(slug);
    out.push({ slug, label });
  }
  return out;
}

/** Read the ordered category list from the DB. */
export async function readCategories(): Promise<CategoryDef[]> {
  const rows = await getDb()
    .select({ slug: categories.slug, label: categories.label })
    .from(categories)
    .orderBy(asc(categories.position), asc(categories.slug));
  return rows;
}

/** Replace the full ordered category list (positions = array index). Returns the sanitized list. */
export async function writeCategories(list: CategoryDef[]): Promise<CategoryDef[]> {
  const clean = sanitizeCategories(list);
  const db = getDb();
  await db.transaction(async (tx) => {
    await tx.delete(categories);
    if (clean.length) {
      await tx.insert(categories).values(clean.map((c, i) => ({ slug: c.slug, label: c.label, position: i })));
    }
  });
  return clean;
}

/** True when `slug` is one of the defined category slugs. */
export function isValidCategorySlug(slug: unknown, list: CategoryDef[]): slug is string {
  return typeof slug === "string" && list.some((c) => c.slug === slug);
}
