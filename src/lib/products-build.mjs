/**
 * Reusable product/portfolio build logic.
 *
 * Walk the products catalogue tree and emit a flat `_index.json` that drives
 * the /portfolio/ filter + listing UI (fetched client-side by
 * static_site/archcraft/portfolio/index.html).
 *
 * Inputs:
 *   static_site/archcraft/wp-content/uploads/products/<cat>/<sub>/[<series>/]<sku>/spec.json
 *
 * Output:
 *   static_site/archcraft/wp-content/uploads/products/_index.json
 *
 * Exposed as `buildProducts()` so it can run BOTH from the CLI
 * (scripts/build-products.mjs) and at request time inside the Next server
 * (src/app/api/admin/portfolio/* route handlers).
 *
 * Media values in spec.json may be either:
 *   - a bare filename ("1.png") — resolved relative to the SKU folder, OR
 *   - an absolute URL ("https://ik.imagekit.io/.../hero.png" or "/foo.png")
 *     — used verbatim. This lets the admin dashboard store ImageKit CDN URLs.
 *
 * Idempotent.
 */
import { promises as fs } from "node:fs";
import path from "node:path";

// Resolve paths from the process CWD (which is `src/` for `npm run` and Next
// dev, and `/app` in the Docker runner) rather than import.meta.url — the
// latter breaks once this module is bundled into the Next server output.
const ROOT = path.join(process.cwd(), "static_site", "archcraft");
const PRODUCTS_DIR = path.join(ROOT, "wp-content", "uploads", "products");
const INDEX_OUT = path.join(PRODUCTS_DIR, "_index.json");
const CATEGORIES_PATH = path.join(PRODUCTS_DIR, "_categories.json");

/** Read the ordered category slugs from _categories.json (empty if absent). */
async function readCategoryOrder() {
  try {
    const parsed = JSON.parse(await fs.readFile(CATEGORIES_PATH, "utf-8"));
    return Array.isArray(parsed)
      ? parsed.map((c) => (typeof c?.slug === "string" ? c.slug : "")).filter(Boolean)
      : [];
  } catch {
    return [];
  }
}

const PLACEHOLDER_HERO = "/wp-content/uploads/products/_assets/placeholder-hero.svg";

/** True when a media value is already a usable URL (absolute or root-relative). */
function isAbsoluteUrl(s) {
  return typeof s === "string" && (/^https?:\/\//i.test(s) || s.startsWith("//") || s.startsWith("/"));
}

/** Resolve a media value to a browser URL: pass URLs through, prefix bare filenames. */
function mediaUrl(repoRel, file) {
  if (isAbsoluteUrl(file)) return file;
  return `/wp-content/uploads/products/${repoRel}/${file}`;
}

/** Lowercased extension, ignoring any query/hash (ImageKit URLs may carry them). */
function extOf(file) {
  const clean = String(file).split("?")[0].split("#")[0];
  return path.extname(clean).toLowerCase();
}

/** Find every spec.json under products/ and return their absolute paths. */
async function findSpecFiles(dir) {
  const out = [];
  async function walk(d) {
    const entries = await fs.readdir(d, { withFileTypes: true });
    for (const e of entries) {
      if (e.name.startsWith("_") || e.name.startsWith(".")) continue;
      const full = path.join(d, e.name);
      if (e.isDirectory()) await walk(full);
      else if (e.isFile() && e.name === "spec.json") out.push(full);
    }
  }
  await walk(dir);
  return out;
}

function urlPathFor(spec, repoRel) {
  // repoRel is the path FROM products/ to the spec.json's containing dir,
  // e.g. "pods/space-capsules/curve/curve-38". The PDP URL mirrors that under
  // /portfolio/<...>/.
  return `/portfolio/${repoRel}/`;
}

const SLIDE_EXTS = new Set([".png", ".jpg", ".jpeg", ".webp", ".svg", ".pdf"]);

/**
 * Scan an SKU folder and return slide files in the established order:
 *   1.png, 2.png, 3.png, ... (numeric ascending)
 *   then any non-numeric files alphabetically (e.g. the combined spec sheet).
 * Used as the auto-fallback when spec.json doesn't pin a hero/gallery explicitly.
 */
async function scanSkuSlides(skuDir) {
  let entries;
  try { entries = await fs.readdir(skuDir); } catch { return []; }
  const files = entries.filter((f) => SLIDE_EXTS.has(path.extname(f).toLowerCase()));
  const numeric = [], other = [];
  for (const f of files) {
    const m = f.match(/^(\d+)\.[^.]+$/);
    if (m) numeric.push([parseInt(m[1], 10), f]);
    else other.push(f);
  }
  numeric.sort((a, b) => a[0] - b[0]);
  other.sort();
  return [...numeric.map((x) => x[1]), ...other];
}

function heroImgFor(repoRel, spec) {
  const heroFile = spec?.media?.hero_image;
  if (heroFile) {
    return mediaUrl(repoRel, heroFile);
  }
  return PLACEHOLDER_HERO;
}

/**
 * Regenerate products/_index.json from every spec.json on disk.
 * @returns {Promise<{indexed:number, listed:number, hidden:number}>}
 */
export async function buildProducts() {
  const specs = await findSpecFiles(PRODUCTS_DIR);
  const flatIndex = [];
  let listedCount = 0, hiddenCount = 0;
  for (const specPath of specs) {
    const json = await fs.readFile(specPath, "utf-8");
    const spec = JSON.parse(json);
    const repoRel = path
      .relative(PRODUCTS_DIR, path.dirname(specPath))
      .split(path.sep)
      .join("/");

    // Auto-scan the SKU folder for slide files (1.png, 2.png, ..., then non-numeric).
    // Spec.json's media fields take priority when set — otherwise the convention
    // applies automatically (drop 1.png in, it becomes the listing thumbnail).
    const skuDir = path.dirname(specPath);
    const onDisk = await scanSkuSlides(skuDir);

    // Hero: spec.media.hero_image if set, otherwise "1.png" if present on disk.
    // (1.png is the cover render and serves as the listing thumbnail.)
    // No fallback — if neither is set, the listing hides the card by default.
    let resolvedHeroFile = spec?.media?.hero_image;
    if (!resolvedHeroFile && onDisk.includes("1.png")) {
      resolvedHeroFile = "1.png";
    }
    let hasRealHero = false;
    if (resolvedHeroFile) {
      if (isAbsoluteUrl(resolvedHeroFile)) {
        // ImageKit / remote URL — trust it, no local file to stat.
        hasRealHero = true;
      } else {
        try {
          await fs.access(path.join(skuDir, resolvedHeroFile));
          hasRealHero = true;
        } catch {
          hasRealHero = false;
        }
      }
    }
    // Mirror the resolved hero back onto the spec object so heroImgFor() sees it.
    if (resolvedHeroFile) {
      spec.media = spec.media || {};
      spec.media.hero_image = resolvedHeroFile;
    }

    // Build the slide list for the diaporama. Files are PDF/PNG/JPG/WEBP/SVG;
    // each gets one slide. The first slide is also the listing thumbnail.
    // Hero first, then either the explicit gallery or the on-disk scan. Seeding
    // with the hero keeps URL-only items (dashboard uploads, no local files)
    // from ending up with an empty slide list. Backward compatible with local
    // items, where the hero (1.png) is already the first on-disk slide.
    const slideFiles = [];
    if (resolvedHeroFile) slideFiles.push(resolvedHeroFile);
    const hasExplicitGallery = Array.isArray(spec?.media?.gallery) && spec.media.gallery.length > 0;
    if (hasExplicitGallery) {
      // Honour spec-provided order: hero first, then explicit gallery, then floor_plan.
      for (const g of spec.media.gallery) if (g && !slideFiles.includes(g)) slideFiles.push(g);
      if (spec?.media?.floor_plan && !slideFiles.includes(spec.media.floor_plan)) {
        slideFiles.push(spec.media.floor_plan);
      }
    } else {
      // No explicit gallery — use the on-disk scan, in the established order.
      for (const f of onDisk) if (!slideFiles.includes(f)) slideFiles.push(f);
    }
    const slides = slideFiles.map((file) => {
      const url = mediaUrl(repoRel, file);
      const type = extOf(file) === ".pdf" ? "pdf" : "image";
      return { url, type };
    });

    // Index every SKU, with a has_hero flag. The listing page hides incomplete
    // SKUs by default; a "Show all" toggle on /portfolio/ reveals them.
    flatIndex.push({
      sku: spec.sku,
      name: spec.name,
      tagline: spec.summary?.tagline ?? "",
      status: spec.status ?? "draft",
      category: spec.taxonomy?.category ?? "",
      sub_category: spec.taxonomy?.sub_category ?? "",
      series: spec.taxonomy?.series ?? null,
      occupants: spec.capacity?.occupants ?? "",
      floor_area_m2: spec.dimensions?.floor_area_m2 ?? null,
      features: spec.features ?? {},
      certifications: spec.certifications ?? [],
      hero: heroImgFor(repoRel, spec),
      has_hero: hasRealHero,
      slides,
      url: urlPathFor(spec, repoRel),
      slug_path: repoRel,
    });
    if (hasRealHero) listedCount++; else hiddenCount++;
  }

  // Sort for deterministic output. Categories follow the display order defined
  // in _categories.json; anything unlisted falls back to alphabetical after them.
  const CATEGORY_ORDER = await readCategoryOrder();
  const catRank = (c) => {
    const i = CATEGORY_ORDER.indexOf(c);
    return i === -1 ? CATEGORY_ORDER.length : i;
  };
  flatIndex.sort((a, b) => {
    const ra = catRank(a.category), rb = catRank(b.category);
    if (ra !== rb) return ra - rb;
    return (a.category + a.sub_category + (a.series ?? "") + a.sku).localeCompare(
      b.category + b.sub_category + (b.series ?? "") + b.sku,
    );
  });

  await fs.writeFile(INDEX_OUT, JSON.stringify(flatIndex, null, 2) + "\n", "utf-8");
  const result = { indexed: flatIndex.length, listed: listedCount, hidden: hiddenCount };
  console.log(`[build:products] indexed ${result.indexed} SKUs (${result.listed} with hero, ${result.hidden} hidden by default)`);
  return result;
}
