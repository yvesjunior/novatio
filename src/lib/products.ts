import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { products } from "./schema";
import { readCategories } from "./categories";

/**
 * DB-backed portfolio (was products/<cat>/<sku>/spec.json + _index.json).
 * `listProducts()` returns the same flat index shape the /portfolio/ client
 * already consumes, so rendering is unchanged. The full spec lives in the
 * `products.spec` JSONB column; scalar columns mirror the queryable fields.
 */

const PLACEHOLDER_HERO = "/wp-content/uploads/products/_assets/placeholder-hero.svg";

export interface IndexEntry {
  sku: string;
  name: string;
  tagline: string;
  status: string;
  category: string;
  sub_category: string;
  series: string | null;
  occupants: string;
  floor_area_m2: number | null;
  features: Record<string, unknown>;
  certifications: string[];
  hero: string;
  has_hero: boolean;
  slides: { url: string; type: string }[];
  url: string;
  slug_path: string;
}

// The spec object is free-form (mirrors the old spec.json); keep it permissive.
type Spec = Record<string, any>;
interface ProductRow {
  sku: string;
  category: string;
  status: string;
  name: string;
  spec: Spec;
}

function extOf(file: string): string {
  const clean = String(file).split("?")[0].split("#")[0];
  const i = clean.lastIndexOf(".");
  return i < 0 ? "" : clean.slice(i).toLowerCase();
}

/** All image/media URLs referenced by a spec (hero + gallery + floor plan). */
export function mediaUrls(spec: Spec): string[] {
  const m = (spec?.media ?? {}) as { hero_image?: string; gallery?: unknown; floor_plan?: string };
  const out: string[] = [];
  if (m.hero_image) out.push(m.hero_image);
  if (Array.isArray(m.gallery)) for (const g of m.gallery) if (typeof g === "string" && g) out.push(g);
  if (m.floor_plan) out.push(m.floor_plan);
  return [...new Set(out)];
}

/** Map a DB row → the flat index entry (mirrors lib/products-build.mjs output). */
function rowToEntry(row: ProductRow): IndexEntry {
  const spec = row.spec ?? {};
  const heroFile = spec.media?.hero_image ?? "";
  const slideFiles = mediaUrls(spec);
  const slides = slideFiles.map((f) => ({ url: f, type: extOf(f) === ".pdf" ? "pdf" : "image" }));
  return {
    sku: row.sku,
    name: row.name,
    tagline: spec.summary?.tagline ?? "",
    status: row.status,
    category: row.category,
    sub_category: spec.taxonomy?.sub_category ?? "",
    series: spec.taxonomy?.series ?? null,
    occupants: spec.capacity?.occupants ?? "",
    floor_area_m2: spec.dimensions?.floor_area_m2 ?? null,
    features: spec.features ?? {},
    certifications: spec.certifications ?? [],
    hero: heroFile || PLACEHOLDER_HERO,
    has_hero: Boolean(heroFile),
    slides,
    url: `/portfolio/${row.category}/${row.sku}/`,
    slug_path: `${row.category}/${row.sku}`,
  };
}

/** The full portfolio index, ordered by category display order then a stable key. */
export async function listProducts(): Promise<IndexEntry[]> {
  const [rows, cats] = await Promise.all([
    getDb().select().from(products),
    readCategories(),
  ]);
  const rank = new Map(cats.map((c, i) => [c.slug, i]));
  const entries = (rows as ProductRow[]).map(rowToEntry);
  entries.sort((a, b) => {
    const ra = rank.has(a.category) ? (rank.get(a.category) as number) : cats.length;
    const rb = rank.has(b.category) ? (rank.get(b.category) as number) : cats.length;
    if (ra !== rb) return ra - rb;
    const ka = a.category + a.sub_category + (a.series ?? "") + a.sku;
    const kb = b.category + b.sub_category + (b.series ?? "") + b.sku;
    return ka.localeCompare(kb);
  });
  return entries;
}

/** The index entry for one sku (used by admin create/update responses). */
export async function getProductEntry(sku: string): Promise<IndexEntry | null> {
  return (await listProducts()).find((e) => e.sku === sku) ?? null;
}

/** Raw spec for a sku (used by the edit form), or null. */
export async function getProductSpec(sku: string): Promise<Spec | null> {
  const [r] = await getDb().select().from(products).where(eq(products.sku, sku)).limit(1);
  return r ? (r as ProductRow).spec : null;
}

export async function getProductRow(sku: string): Promise<ProductRow | null> {
  const [r] = await getDb().select().from(products).where(eq(products.sku, sku)).limit(1);
  return (r as ProductRow) ?? null;
}

/** Pick an unused sku, appending -2, -3, … on collision. */
export async function uniqueSku(base: string): Promise<string> {
  let candidate = base || "item";
  let n = 2;
  for (;;) {
    const [r] = await getDb().select({ sku: products.sku }).from(products).where(eq(products.sku, candidate)).limit(1);
    if (!r) return candidate;
    candidate = `${base}-${n++}`;
  }
}

export async function insertProduct(row: ProductRow): Promise<void> {
  await getDb().insert(products).values({
    sku: row.sku,
    category: row.category,
    status: row.status,
    name: row.name,
    spec: row.spec,
  });
}

/** Update a product's mutable fields. Returns false if the sku doesn't exist. */
export async function updateProduct(
  sku: string,
  patch: { category: string; status: string; name: string; spec: Spec },
): Promise<boolean> {
  const res = await getDb()
    .update(products)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(products.sku, sku))
    .returning({ sku: products.sku });
  return res.length > 0;
}

/** Delete a product; returns its spec (for ImageKit cleanup) or null if absent. */
export async function deleteProduct(sku: string): Promise<Spec | null> {
  const [r] = await getDb().delete(products).where(eq(products.sku, sku)).returning({ spec: products.spec });
  return r ? (r as { spec: Spec }).spec : null;
}
