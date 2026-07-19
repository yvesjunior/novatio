import { NextResponse, type NextRequest } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { buildProducts } from "../../../../lib/products-build.mjs";
import {
  readIndex,
  skuDir,
  slugify,
  uniqueSku,
  type Category,
} from "../../../../lib/portfolio";
import { isValidCategorySlug, readCategories } from "../../../../lib/categories";

export const runtime = "nodejs";

/** GET /api/admin/portfolio — list all portfolio items from _index.json. */
export async function GET() {
  const items = await readIndex();
  return NextResponse.json({ ok: true, items });
}

interface CreateBody {
  name?: unknown;
  category?: unknown;
  tagline?: unknown;
  description?: unknown;
  certifications?: unknown;
  status?: unknown;
  hero?: unknown;
  gallery?: unknown;
}

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

/** POST /api/admin/portfolio — create a new item (writes spec.json, rebuilds index). */
export async function POST(req: NextRequest) {
  let body: CreateBody;
  try {
    body = (await req.json()) as CreateBody;
  } catch {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  const name = asString(body.name);
  const category = body.category;
  if (!name) {
    return NextResponse.json({ ok: false, error: "name_required" }, { status: 400 });
  }
  const categories = await readCategories();
  if (!isValidCategorySlug(category, categories)) {
    return NextResponse.json({ ok: false, error: "invalid_category" }, { status: 400 });
  }

  const hero = asString(body.hero);
  const gallery = Array.isArray(body.gallery)
    ? body.gallery.map(asString).filter(Boolean)
    : [];
  const status = asString(body.status) === "draft" ? "draft" : "published";

  const certifications = asStringList(body.certifications);

  const base = slugify(name);
  if (!base) {
    return NextResponse.json({ ok: false, error: "name_required" }, { status: 400 });
  }
  const sku = await uniqueSku(category as Category, base);

  const spec = {
    sku,
    name,
    status,
    taxonomy: { category },
    summary: { tagline: asString(body.tagline), description: asString(body.description) },
    dimensions: {},
    capacity: {},
    construction: {},
    electrical: {},
    plumbing: {},
    features: {},
    certifications,
    use_cases: [] as string[],
    pricing: { display: "On request", notes: "" },
    logistics: {},
    media: {
      hero_image: hero,
      gallery,
      floor_plan: "",
      three_d_model: "",
    },
    source: { notes: "Created via admin dashboard" },
  };

  const dir = skuDir(category as Category, sku);
  try {
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, "spec.json"), JSON.stringify(spec, null, 2) + "\n", "utf-8");
    await buildProducts();
  } catch (err) {
    console.error("[admin/portfolio] create failed:", err);
    return NextResponse.json({ ok: false, error: "write_failed" }, { status: 500 });
  }

  const items = await readIndex();
  const created = items.find((i) => i.sku === sku) ?? null;
  console.log(`[admin/portfolio] created ${category}/${sku}`);
  return NextResponse.json({ ok: true, sku, item: created }, { status: 201 });
}
