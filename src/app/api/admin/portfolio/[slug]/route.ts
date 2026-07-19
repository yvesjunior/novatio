import { NextResponse, type NextRequest } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { buildProducts } from "../../../../../lib/products-build.mjs";
import {
  pdpDirFromSlugPath,
  readIndex,
  skuDir,
  skuDirFromSlugPath,
} from "../../../../../lib/portfolio";
import { isValidCategorySlug, readCategories } from "../../../../../lib/categories";
import { deleteImagesByUrls } from "../../../../../lib/imagekit";

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

/** GET /api/admin/portfolio/<sku> — the item's full spec.json for editing. */
export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const sku = decodeURIComponent(slug || "").trim();
  const items = await readIndex();
  const entry = items.find((i) => i.sku === sku);
  if (!entry) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }
  const specDir = skuDirFromSlugPath(entry.slug_path);
  if (!specDir) {
    return NextResponse.json({ ok: false, error: "invalid_path" }, { status: 400 });
  }
  try {
    const spec = JSON.parse(await fs.readFile(path.join(specDir, "spec.json"), "utf-8"));
    return NextResponse.json({ ok: true, item: spec, slug_path: entry.slug_path });
  } catch (err) {
    console.error("[admin/portfolio] read failed:", err);
    return NextResponse.json({ ok: false, error: "read_failed" }, { status: 500 });
  }
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

/** PUT /api/admin/portfolio/<sku> — update the item's spec (moves folder on category change). */
export async function PUT(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const sku = decodeURIComponent(slug || "").trim();

  let body: UpdateBody;
  try {
    body = (await req.json()) as UpdateBody;
  } catch {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  const items = await readIndex();
  const entry = items.find((i) => i.sku === sku);
  if (!entry) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }
  const oldDir = skuDirFromSlugPath(entry.slug_path);
  if (!oldDir) {
    return NextResponse.json({ ok: false, error: "invalid_path" }, { status: 400 });
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

  let spec: Record<string, unknown>;
  try {
    spec = JSON.parse(await fs.readFile(path.join(oldDir, "spec.json"), "utf-8"));
  } catch {
    return NextResponse.json({ ok: false, error: "read_failed" }, { status: 500 });
  }

  const gallery = Array.isArray(body.gallery) ? body.gallery.map(asString).filter(Boolean) : [];
  const hero = asString(body.hero);

  // Figure out which existing images were dropped so we can clean them from ImageKit.
  const prevMedia = (spec.media && typeof spec.media === "object" ? spec.media : {}) as {
    hero_image?: string;
    gallery?: string[];
  };
  const oldUrls = [prevMedia.hero_image, ...(Array.isArray(prevMedia.gallery) ? prevMedia.gallery : [])].filter(
    (u): u is string => Boolean(u),
  );
  const keptUrls = new Set([hero, ...gallery].filter(Boolean));
  const removedUrls = oldUrls.filter((u) => !keptUrls.has(u));

  spec.name = name;
  spec.status = asString(body.status) === "draft" ? "draft" : "published";
  spec.taxonomy = { category };
  spec.summary = { tagline: asString(body.tagline), description: asString(body.description) };
  spec.certifications = asStringList(body.certifications);
  spec.media = {
    ...(typeof spec.media === "object" && spec.media ? spec.media : {}),
    hero_image: hero,
    gallery,
  };

  // Move the spec folder if the category changed (sku/folder name stays stable).
  const newDir = skuDir(category, sku);
  try {
    if (path.resolve(newDir) !== path.resolve(oldDir)) {
      try {
        await fs.access(newDir);
        return NextResponse.json({ ok: false, error: "target_exists" }, { status: 409 });
      } catch {
        // target free — proceed
      }
      await fs.mkdir(path.dirname(newDir), { recursive: true });
      await fs.rename(oldDir, newDir);
    }
    await fs.writeFile(path.join(newDir, "spec.json"), JSON.stringify(spec, null, 2) + "\n", "utf-8");
    await buildProducts();
  } catch (err) {
    console.error("[admin/portfolio] update failed:", err);
    return NextResponse.json({ ok: false, error: "write_failed" }, { status: 500 });
  }

  // Best-effort cleanup of images removed during this edit.
  if (removedUrls.length) {
    const n = await deleteImagesByUrls(removedUrls);
    console.log(`[admin/portfolio] ${sku}: removed ${n} image(s) from ImageKit`);
  }

  const refreshed = await readIndex();
  const updated = refreshed.find((i) => i.sku === sku) ?? null;
  console.log(`[admin/portfolio] updated ${sku} (${category})`);
  return NextResponse.json({ ok: true, sku, item: updated });
}

/**
 * DELETE /api/admin/portfolio/<sku>
 * Removes the item's spec folder (and any generated PDP folder), then rebuilds.
 * The `[slug]` param is the item's `sku`; we resolve its full slug_path from the index.
 */
export async function DELETE(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const sku = decodeURIComponent(slug || "").trim();
  if (!sku) {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  const items = await readIndex();
  const entry = items.find((i) => i.sku === sku);
  if (!entry) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const specDir = skuDirFromSlugPath(entry.slug_path);
  if (!specDir) {
    return NextResponse.json({ ok: false, error: "invalid_path" }, { status: 400 });
  }

  // Collect the item's ImageKit URLs before removing its spec (hero + slides).
  const imageUrls = [...new Set([entry.hero, ...entry.slides.map((s) => s.url)].filter(Boolean))];

  try {
    await fs.rm(specDir, { recursive: true, force: true });
    // Remove any generated PDP folder mirroring this slug_path (defensive — the
    // current build only emits _index.json, but a stale PDP shouldn't linger).
    const pdpDir = pdpDirFromSlugPath(entry.slug_path);
    if (pdpDir) {
      await fs.rm(pdpDir, { recursive: true, force: true });
    }
    await buildProducts();
  } catch (err) {
    console.error("[admin/portfolio] delete failed:", err);
    return NextResponse.json({ ok: false, error: "delete_failed" }, { status: 500 });
  }

  // Best-effort cleanup of the item's images on ImageKit (after the spec is gone).
  const removed = await deleteImagesByUrls(imageUrls);
  console.log(`[admin/portfolio] deleted ${entry.slug_path} (${removed} image(s) removed from ImageKit)`);
  return NextResponse.json({ ok: true, sku });
}
