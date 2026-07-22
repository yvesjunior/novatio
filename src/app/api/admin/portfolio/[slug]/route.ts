import { NextResponse, type NextRequest } from "next/server";
import { isValidCategorySlug, readCategories } from "../../../../../lib/categories";
import { deleteImagesByUrls } from "../../../../../lib/imagekit";
import {
  deleteProduct,
  getProductEntry,
  getProductRow,
  getProductSpec,
  mediaUrls,
  updateProduct,
} from "../../../../../lib/products";

export const runtime = "nodejs";

function asString(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/** Normalize a certifications value (array or comma/newline string) to a clean list. */
function asStringList(v: unknown): string[] {
  const raw = Array.isArray(v)
    ? v.map((x) => (typeof x === "string" ? x : ""))
    : typeof v === "string"
      ? v.split(/[\n,]/)
      : [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    const s = item.trim();
    if (s && !seen.has(s)) {
      seen.add(s);
      out.push(s);
    }
  }
  return out;
}

/** GET /api/admin/portfolio/<sku> — the item's full spec for editing. */
export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const sku = decodeURIComponent(slug || "").trim();
  const spec = await getProductSpec(sku);
  if (!spec) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, item: spec, slug_path: `${spec.taxonomy?.category}/${sku}` });
}

interface UpdateBody {
  name?: unknown;
  category?: unknown;
  tagline?: unknown;
  description?: unknown;
  certifications?: unknown;
  status?: unknown;
  hero?: unknown;
  gallery?: unknown;
}

/** PUT /api/admin/portfolio/<sku> — update the item's fields (products row). */
export async function PUT(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const sku = decodeURIComponent(slug || "").trim();

  let body: UpdateBody;
  try {
    body = (await req.json()) as UpdateBody;
  } catch {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  const row = await getProductRow(sku);
  if (!row) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const name = asString(body.name);
  if (!name) {
    return NextResponse.json({ ok: false, error: "name_required" }, { status: 400 });
  }
  const category = body.category;
  const categories = await readCategories();
  if (!isValidCategorySlug(category, categories)) {
    return NextResponse.json({ ok: false, error: "invalid_category" }, { status: 400 });
  }

  const gallery = Array.isArray(body.gallery) ? body.gallery.map(asString).filter(Boolean) : [];
  const hero = asString(body.hero);

  // Which existing images were dropped (for ImageKit cleanup)?
  const oldUrls = mediaUrls(row.spec);
  const keptUrls = new Set([hero, ...gallery].filter(Boolean));
  const removedUrls = oldUrls.filter((u) => !keptUrls.has(u));

  const spec = { ...row.spec };
  spec.name = name;
  spec.sku = sku;
  spec.status = asString(body.status) === "draft" ? "draft" : "published";
  spec.taxonomy = { category };
  spec.summary = { tagline: asString(body.tagline), description: asString(body.description) };
  spec.certifications = asStringList(body.certifications);
  spec.media = {
    ...(typeof spec.media === "object" && spec.media ? spec.media : {}),
    hero_image: hero,
    gallery,
  };

  try {
    await updateProduct(sku, { category: category as string, status: spec.status, name, spec });
  } catch (err) {
    console.error("[admin/portfolio] update failed:", err);
    return NextResponse.json({ ok: false, error: "write_failed" }, { status: 500 });
  }

  if (removedUrls.length) {
    const n = await deleteImagesByUrls(removedUrls);
    console.log(`[admin/portfolio] ${sku}: removed ${n} image(s) from ImageKit`);
  }

  const updated = await getProductEntry(sku);
  console.log(`[admin/portfolio] updated ${sku} (${category as string})`);
  return NextResponse.json({ ok: true, sku, item: updated });
}

/** DELETE /api/admin/portfolio/<sku> — remove the row + its ImageKit images. */
export async function DELETE(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const sku = decodeURIComponent(slug || "").trim();
  if (!sku) {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  let spec;
  try {
    spec = await deleteProduct(sku);
  } catch (err) {
    console.error("[admin/portfolio] delete failed:", err);
    return NextResponse.json({ ok: false, error: "delete_failed" }, { status: 500 });
  }
  if (!spec) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const removed = await deleteImagesByUrls(mediaUrls(spec));
  console.log(`[admin/portfolio] deleted ${sku} (${removed} image(s) removed from ImageKit)`);
  return NextResponse.json({ ok: true, sku });
}
