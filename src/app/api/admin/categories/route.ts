import { NextResponse, type NextRequest } from "next/server";
import { sql } from "drizzle-orm";
import { readCategories, writeCategories, type CategoryDef } from "../../../../lib/categories";
import { slugify } from "../../../../lib/portfolio";
import { getDb } from "../../../../lib/db";
import { products } from "../../../../lib/schema";

export const runtime = "nodejs";

/** Count portfolio items per category slug (from the products table). */
async function itemCounts(): Promise<Record<string, number>> {
  const rows = await getDb()
    .select({ category: products.category, n: sql<number>`count(*)::int` })
    .from(products)
    .groupBy(products.category);
  const counts: Record<string, number> = {};
  for (const r of rows) counts[r.category] = r.n;
  return counts;
}

/** GET /api/admin/categories — ordered list with per-category item counts. */
export async function GET() {
  const [categories, counts] = await Promise.all([readCategories(), itemCounts()]);
  const withCounts = categories.map((c) => ({ ...c, count: counts[c.slug] ?? 0 }));
  return NextResponse.json({ ok: true, categories: withCounts });
}

/** POST /api/admin/categories — create a category from { label }. */
export async function POST(req: NextRequest) {
  let body: { label?: unknown };
  try {
    body = (await req.json()) as { label?: unknown };
  } catch {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }
  const label = typeof body.label === "string" ? body.label.trim() : "";
  const slug = slugify(label);
  if (!label || !slug) {
    return NextResponse.json({ ok: false, error: "label_required" }, { status: 400 });
  }
  const categories = await readCategories();
  if (categories.some((c) => c.slug === slug)) {
    return NextResponse.json({ ok: false, error: "already_exists" }, { status: 409 });
  }
  const next = await writeCategories([...categories, { slug, label }]);
  return NextResponse.json({ ok: true, categories: next }, { status: 201 });
}

/**
 * PUT /api/admin/categories — rename a label or reorder the list.
 *   { slug, label }        → rename that category's label
 *   { order: [slug, ...] } → set display order
 */
export async function PUT(req: NextRequest) {
  let body: { slug?: unknown; label?: unknown; order?: unknown };
  try {
    body = (await req.json()) as { slug?: unknown; label?: unknown; order?: unknown };
  } catch {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }
  const categories = await readCategories();
  let next: CategoryDef[];

  if (Array.isArray(body.order)) {
    const order = body.order.filter((s): s is string => typeof s === "string");
    const bySlug = new Map(categories.map((c) => [c.slug, c]));
    const reordered: CategoryDef[] = [];
    for (const slug of order) {
      const c = bySlug.get(slug);
      if (c) {
        reordered.push(c);
        bySlug.delete(slug);
      }
    }
    // Append any categories the client didn't mention, preserving prior order.
    for (const c of categories) if (bySlug.has(c.slug)) reordered.push(c);
    next = reordered;
  } else {
    const slug = typeof body.slug === "string" ? body.slug : "";
    const label = typeof body.label === "string" ? body.label.trim() : "";
    if (!slug || !label) {
      return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
    }
    if (!categories.some((c) => c.slug === slug)) {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }
    next = categories.map((c) => (c.slug === slug ? { ...c, label } : c));
  }

  const saved = await writeCategories(next);
  return NextResponse.json({ ok: true, categories: saved });
}

/** DELETE /api/admin/categories?slug=... — refuse if any item still uses it. */
export async function DELETE(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug")?.trim() ?? "";
  if (!slug) {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }
  const [categories, counts] = await Promise.all([readCategories(), itemCounts()]);
  if (!categories.some((c) => c.slug === slug)) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }
  const used = counts[slug] ?? 0;
  if (used > 0) {
    return NextResponse.json({ ok: false, error: "in_use", count: used }, { status: 409 });
  }
  const next = await writeCategories(categories.filter((c) => c.slug !== slug));
  return NextResponse.json({ ok: true, categories: next });
}
