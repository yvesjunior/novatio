#!/usr/bin/env node
/**
 * Walk the products catalogue tree and emit a flat `_index.json` that drives
 * the /portfolio/ filter UI plus per-SKU PDP pages.
 *
 * Inputs:
 *   static_site/archcraft/wp-content/uploads/products/<cat>/<sub>/[<series>/]<sku>/spec.json
 *
 * Outputs:
 *   static_site/archcraft/wp-content/uploads/products/_index.json
 *   static_site/archcraft/portfolio/<cat>/<sub>/[<series>/]<sku>/index.html
 *
 * Idempotent. Run via `npm run build:products`.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..", "static_site", "archcraft");
const PRODUCTS_DIR = path.join(ROOT, "wp-content", "uploads", "products");
const PORTFOLIO_DIR = path.join(ROOT, "portfolio");
const PDP_TEMPLATE_PATH = path.join(ROOT, "portfolio", "_pdp-template.html");
const INDEX_OUT = path.join(PRODUCTS_DIR, "_index.json");

const PLACEHOLDER_HERO = "/wp-content/uploads/products/_assets/placeholder-hero.svg";

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
 *   2.png, 3.png, ... (numeric ascending, starting at 2 — 1.* is intentionally ignored)
 *   then any non-numeric files alphabetically.
 * Used as the auto-fallback when spec.json doesn't pin a hero/gallery explicitly.
 */
async function scanSkuSlides(skuDir) {
  let entries;
  try { entries = await fs.readdir(skuDir); } catch { return []; }
  const files = entries.filter((f) => SLIDE_EXTS.has(path.extname(f).toLowerCase()));
  const numeric = [], other = [];
  for (const f of files) {
    const m = f.match(/^(\d+)\.[^.]+$/);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n < 2) continue; // skip 1.png / 1.jpg / etc.
      numeric.push([n, f]);
    } else {
      other.push(f);
    }
  }
  numeric.sort((a, b) => a[0] - b[0]);
  other.sort();
  return [...numeric.map((x) => x[1]), ...other];
}

function heroImgFor(repoRel, spec) {
  const heroFile = spec?.media?.hero_image;
  if (heroFile) {
    return `/wp-content/uploads/products/${repoRel}/${heroFile}`;
  }
  return PLACEHOLDER_HERO;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtDim(d) {
  if (d == null) return "—";
  return String(d);
}

function fmtCertList(certs) {
  if (!Array.isArray(certs) || certs.length === 0) return "";
  return certs.map((c) => `<span class="pdp-badge">${escapeHtml(c)}</span>`).join("");
}

function fmtFeatureChips(features) {
  if (!features) return "";
  const labels = {
    foldable: "Foldable",
    expandable: "Expandable",
    stackable: "Stackable",
    on_wheels: "On wheels",
    internal_staircase: "Internal staircase",
    loft: "Loft",
    rooftop_terrace: "Rooftop terrace",
    balcony: "Balcony",
    panoramic_glass: "Panoramic glass",
    off_grid_ready: "Off-grid ready",
    smart_home: "Smart home",
    fireproof_rated: "Fireproof rated",
    seismic_rated: "Seismic rated",
    cold_climate_insulation: "Cold-climate insulation",
    ships_as_kit: "Ships as kit",
    ships_finished: "Ships finished",
  };
  return Object.entries(features)
    .filter(([, v]) => v === true)
    .map(([k]) => `<span class="pdp-chip">${escapeHtml(labels[k] ?? k)}</span>`)
    .join("");
}

function statCard(label, value, unit, i18nKey) {
  const muted = value == null || value === "" || value === "—";
  const cls = muted ? "pdp-stat pdp-stat--muted" : "pdp-stat";
  const shown = muted ? "—" : escapeHtml(String(value));
  const unitHtml = unit && !muted ? `<span class="pdp-stat-unit">${escapeHtml(unit)}</span>` : "";
  return `<div class="${cls}"><div class="pdp-stat-value">${shown}${unitHtml}</div><div class="pdp-stat-label" data-i18n="${i18nKey}">${escapeHtml(label)}</div></div>`;
}

function renderStatsBlock(items) {
  // items: [{label, value, unit, i18nKey}, ...]
  const cards = items.map((it) => statCard(it.label, it.value, it.unit, it.i18nKey)).join("");
  return `<div class="pdp-stats">${cards}</div>`;
}

function defRow(key, value, i18nKey) {
  const isMuted = !value || value === "—";
  const valueHtml = isMuted ? `<div class="pdp-def-value pdp-def-value--muted">—</div>` : `<div class="pdp-def-value">${escapeHtml(String(value))}</div>`;
  return `<div class="pdp-def"><div class="pdp-def-key" data-i18n="${i18nKey}">${escapeHtml(key)}</div>${valueHtml}</div>`;
}

function renderDefsBlock(items) {
  // items: [{key, value, i18nKey}, ...]
  const rows = items.map((it) => defRow(it.key, it.value, it.i18nKey)).join("");
  return `<div class="pdp-defs">${rows}</div>`;
}

function renderSlider(repoRel, spec) {
  // Slides come from media.hero_image (1st), then media.gallery, then media.floor_plan (if not already listed).
  const slides = [];
  const hero = spec?.media?.hero_image;
  if (hero) slides.push(hero);
  const gallery = Array.isArray(spec?.media?.gallery) ? spec.media.gallery : [];
  for (const g of gallery) if (g && !slides.includes(g)) slides.push(g);
  const fp = spec?.media?.floor_plan;
  if (fp && !slides.includes(fp)) slides.push(fp);
  // Fallback: at least one slide (the placeholder) so the layout doesn't break.
  if (slides.length === 0) {
    return `<div class="pdp-slider"><div class="pdp-slider-viewport"><div class="pdp-slider-track"><div class="pdp-slider-slide"><img src="${PLACEHOLDER_HERO}" alt="${escapeHtml(spec.name ?? spec.sku ?? "")}"/></div></div></div></div>`;
  }
  const alt = escapeHtml(spec.name ?? spec.sku ?? "");
  const slideEls = slides
    .map((file) => `<div class="pdp-slider-slide"><img src="/wp-content/uploads/products/${repoRel}/${file}" alt="${alt}" loading="lazy"/></div>`)
    .join("");
  const dotEls = slides
    .map((_, i) => `<button type="button" class="pdp-slider-dot" aria-label="Slide ${i + 1}"></button>`)
    .join("");
  const showControls = slides.length > 1;
  return [
    '<div class="pdp-slider" aria-roledescription="carousel">',
    '  <div class="pdp-slider-viewport">',
    `    <div class="pdp-slider-track">${slideEls}</div>`,
    "  </div>",
    showControls ? '  <button type="button" class="pdp-slider-btn pdp-slider-prev" aria-label="Previous slide">‹</button>' : "",
    showControls ? '  <button type="button" class="pdp-slider-btn pdp-slider-next" aria-label="Next slide">›</button>' : "",
    showControls ? `  <div class="pdp-slider-dots">${dotEls}</div>` : "",
    showControls ? '  <div class="pdp-slider-counter"></div>' : "",
    "</div>",
  ].join("\n");
}

function fmtUseCases(uc) {
  if (!Array.isArray(uc) || uc.length === 0) return "";
  return uc.map((u) => `<span class="pdp-tag">${escapeHtml(u)}</span>`).join("");
}

function renderPdp(template, spec, repoRel) {
  const url = urlPathFor(spec, repoRel);
  const hero = heroImgFor(repoRel, spec);
  const tax = spec.taxonomy ?? {};
  const dims = spec.dimensions ?? {};
  const cap = spec.capacity ?? {};
  const cons = spec.construction ?? {};
  const elec = spec.electrical ?? {};
  const plumb = spec.plumbing ?? {};
  const price = spec.pricing ?? {};
  const log = spec.logistics ?? {};

  const breadcrumbParts = [tax.category, tax.sub_category, tax.series, spec.sku]
    .filter(Boolean)
    .map((s) => `<li><span>${escapeHtml(s)}</span></li>`)
    .join("");

  const subs = {
    "{{TITLE}}": escapeHtml(`${spec.name ?? spec.sku} – Novatio`),
    "{{NAME}}": escapeHtml(spec.name ?? spec.sku),
    "{{SKU}}": escapeHtml(spec.sku ?? ""),
    "{{TAGLINE}}": escapeHtml(spec.summary?.tagline ?? ""),
    "{{DESCRIPTION}}": escapeHtml(spec.summary?.description ?? "").replace(/\n/g, "<br>"),
    "{{HERO}}": hero,
    "{{SLIDER}}": renderSlider(repoRel, spec),
    "{{CATEGORY}}": escapeHtml(tax.category ?? ""),
    "{{SUB_CATEGORY}}": escapeHtml(tax.sub_category ?? ""),
    "{{SERIES}}": escapeHtml(tax.series ?? ""),
    "{{BREADCRUMBS}}": breadcrumbParts,
    "{{DIMENSIONS_BLOCK}}": renderStatsBlock([
      { label: "Length",     value: dims.length_m,      unit: "m",   i18nKey: "pdp.label.length" },
      { label: "Width",      value: dims.width_m,       unit: "m",   i18nKey: "pdp.label.width" },
      { label: "Height",     value: dims.height_m,      unit: "m",   i18nKey: "pdp.label.height" },
      { label: "Floor area", value: dims.floor_area_m2, unit: "m²",  i18nKey: "pdp.label.floor_area" },
      { label: "Weight",     value: dims.weight_kg,     unit: "kg",  i18nKey: "pdp.label.weight" },
    ]),
    "{{CAPACITY_BLOCK}}": renderStatsBlock([
      { label: "Occupants",  value: cap.occupants,  unit: "",  i18nKey: "pdp.label.occupants" },
      { label: "Bedrooms",   value: cap.bedrooms,   unit: "",  i18nKey: "pdp.label.bedrooms" },
      { label: "Bathrooms",  value: cap.bathrooms,  unit: "",  i18nKey: "pdp.label.bathrooms" },
    ]),
    "{{CONSTRUCTION_BLOCK}}": renderDefsBlock([
      { key: "Main structure",  value: cons.main_structure,  i18nKey: "pdp.label.main_structure" },
      { key: "Wall panels",     value: cons.wall_panels,     i18nKey: "pdp.label.wall_panels" },
      { key: "Roof system",     value: cons.roof_system,     i18nKey: "pdp.label.roof_system" },
      { key: "Floor system",    value: cons.floor_system,    i18nKey: "pdp.label.floor_system" },
      { key: "Glazing",         value: cons.glazing,         i18nKey: "pdp.label.glazing" },
      { key: "Insulation",      value: cons.insulation_thickness_mm != null ? `${cons.insulation_thickness_mm} mm` : "", i18nKey: "pdp.label.insulation" },
      { key: "Exterior finish", value: cons.exterior_finish, i18nKey: "pdp.label.exterior_finish" },
      { key: "Interior finish", value: cons.interior_finish, i18nKey: "pdp.label.interior_finish" },
    ]),
    "{{ELECTRICAL_BLOCK}}": renderDefsBlock([
      { key: "Total power",     value: elec.total_power_kw != null ? `${elec.total_power_kw} kW` : "", i18nKey: "pdp.label.total_power" },
      { key: "Brand standards", value: Array.isArray(elec.brand_standards) && elec.brand_standards.length ? elec.brand_standards.join(", ") : "", i18nKey: "pdp.label.elec_brands" },
      { key: "Appliances",      value: Array.isArray(elec.appliances_included) && elec.appliances_included.length ? elec.appliances_included.join(", ") : "", i18nKey: "pdp.label.appliances" },
      { key: "Water heater",    value: plumb.water_heater, i18nKey: "pdp.label.water_heater" },
      { key: "Toilet",          value: plumb.toilet,       i18nKey: "pdp.label.toilet" },
      { key: "Shower",          value: plumb.shower,       i18nKey: "pdp.label.shower" },
    ]),
    "{{LOGISTICS_BLOCK}}": renderDefsBlock([
      { key: "Shipping format", value: log.shipping_format, i18nKey: "pdp.label.shipping" },
      { key: "Assembly",        value: log.assembly_time,   i18nKey: "pdp.label.assembly" },
      { key: "Lead time",       value: log.lead_time_days != null ? `${log.lead_time_days} days` : "", i18nKey: "pdp.label.lead_time" },
    ]),
    "{{FEATURE_CHIPS}}": fmtFeatureChips(spec.features),
    "{{CERT_BADGES}}": fmtCertList(spec.certifications),
    "{{USE_CASES}}": fmtUseCases(spec.use_cases),
    "{{PRICING_DISPLAY}}": escapeHtml(price.display ?? "On request"),
    "{{PRICING_NOTES}}": escapeHtml(price.notes ?? ""),
    "{{SHIPPING_FORMAT}}": escapeHtml(log.shipping_format ?? "—"),
    "{{ASSEMBLY_TIME}}": escapeHtml(log.assembly_time ?? "—"),
    "{{LEAD_TIME}}": log.lead_time_days != null ? `${log.lead_time_days} days` : "—",
    "{{URL}}": url,
  };

  let out = template;
  for (const [k, v] of Object.entries(subs)) {
    out = out.split(k).join(v);
  }
  return out;
}

async function main() {
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

    // Hero: spec.media.hero_image if set, otherwise "2.png" if present on disk.
    // (1.png is intentionally ignored — convention starts at 2.png.)
    // No fallback — if neither is set, the listing hides the card by default.
    let resolvedHeroFile = spec?.media?.hero_image;
    if (!resolvedHeroFile && onDisk.includes("2.png")) {
      resolvedHeroFile = "2.png";
    }
    let hasRealHero = false;
    if (resolvedHeroFile) {
      try {
        await fs.access(path.join(skuDir, resolvedHeroFile));
        hasRealHero = true;
      } catch {
        hasRealHero = false;
      }
    }
    // Mirror the resolved hero back onto the spec object so heroImgFor() sees it.
    if (resolvedHeroFile) {
      spec.media = spec.media || {};
      spec.media.hero_image = resolvedHeroFile;
    }

    // Build the slide list for the diaporama. Files are PDF/PNG/JPG/WEBP/SVG;
    // each gets one slide. The first slide is also the listing thumbnail.
    const slideFiles = [];
    const hasExplicitGallery = Array.isArray(spec?.media?.gallery) && spec.media.gallery.length > 0;
    if (hasExplicitGallery) {
      // Honour spec-provided order: hero first, then explicit gallery, then floor_plan.
      if (resolvedHeroFile) slideFiles.push(resolvedHeroFile);
      for (const g of spec.media.gallery) if (g && !slideFiles.includes(g)) slideFiles.push(g);
      if (spec?.media?.floor_plan && !slideFiles.includes(spec.media.floor_plan)) {
        slideFiles.push(spec.media.floor_plan);
      }
    } else {
      // No explicit gallery — use the on-disk scan, in the established order.
      for (const f of onDisk) if (!slideFiles.includes(f)) slideFiles.push(f);
    }
    const slides = slideFiles.map((file) => {
      const url = `/wp-content/uploads/products/${repoRel}/${file}`;
      const ext = path.extname(file).toLowerCase();
      const type = ext === ".pdf" ? "pdf" : "image";
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

  // Sort for deterministic output.
  flatIndex.sort((a, b) =>
    (a.category + a.sub_category + (a.series ?? "") + a.sku).localeCompare(
      b.category + b.sub_category + (b.series ?? "") + b.sku,
    ),
  );

  await fs.writeFile(INDEX_OUT, JSON.stringify(flatIndex, null, 2) + "\n", "utf-8");
  console.log(`[build:products] indexed ${flatIndex.length} SKUs (${listedCount} with hero, ${hiddenCount} hidden by default)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
