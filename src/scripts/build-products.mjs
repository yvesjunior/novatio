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
    "{{CATEGORY}}": escapeHtml(tax.category ?? ""),
    "{{SUB_CATEGORY}}": escapeHtml(tax.sub_category ?? ""),
    "{{SERIES}}": escapeHtml(tax.series ?? ""),
    "{{BREADCRUMBS}}": breadcrumbParts,
    "{{LENGTH}}": fmtDim(dims.length_m) + (dims.length_m != null ? " m" : ""),
    "{{WIDTH}}": fmtDim(dims.width_m) + (dims.width_m != null ? " m" : ""),
    "{{HEIGHT}}": fmtDim(dims.height_m) + (dims.height_m != null ? " m" : ""),
    "{{FLOOR_AREA}}":
      dims.floor_area_m2 != null
        ? `${dims.floor_area_m2} m²` + (dims.floor_area_ft2 ? ` (${dims.floor_area_ft2} ft²)` : "")
        : "—",
    "{{WEIGHT}}": dims.weight_kg != null ? `${dims.weight_kg} kg` : "—",
    "{{OCCUPANTS}}": escapeHtml(cap.occupants ?? "—"),
    "{{BEDROOMS}}": fmtDim(cap.bedrooms),
    "{{BATHROOMS}}": fmtDim(cap.bathrooms),
    "{{MAIN_STRUCTURE}}": escapeHtml(cons.main_structure ?? "—"),
    "{{WALL_PANELS}}": escapeHtml(cons.wall_panels ?? "—"),
    "{{ROOF_SYSTEM}}": escapeHtml(cons.roof_system ?? "—"),
    "{{FLOOR_SYSTEM}}": escapeHtml(cons.floor_system ?? "—"),
    "{{GLAZING}}": escapeHtml(cons.glazing ?? "—"),
    "{{INSULATION_MM}}":
      cons.insulation_thickness_mm != null ? `${cons.insulation_thickness_mm} mm` : "—",
    "{{EXTERIOR_FINISH}}": escapeHtml(cons.exterior_finish ?? "—"),
    "{{INTERIOR_FINISH}}": escapeHtml(cons.interior_finish ?? "—"),
    "{{TOTAL_POWER}}": elec.total_power_kw != null ? `${elec.total_power_kw} kW` : "—",
    "{{ELEC_BRANDS}}": Array.isArray(elec.brand_standards) ? elec.brand_standards.join(", ") : "—",
    "{{APPLIANCES}}": Array.isArray(elec.appliances_included) ? elec.appliances_included.join(", ") : "—",
    "{{WATER_HEATER}}": escapeHtml(plumb.water_heater ?? "—"),
    "{{TOILET}}": escapeHtml(plumb.toilet ?? "—"),
    "{{SHOWER}}": escapeHtml(plumb.shower ?? "—"),
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
  let pdpTemplate = null;
  try {
    pdpTemplate = await fs.readFile(PDP_TEMPLATE_PATH, "utf-8");
  } catch {
    console.warn(`[build:products] PDP template missing at ${PDP_TEMPLATE_PATH} — skipping per-SKU HTML.`);
  }

  let pdpCount = 0;
  for (const specPath of specs) {
    const json = await fs.readFile(specPath, "utf-8");
    const spec = JSON.parse(json);
    const repoRel = path
      .relative(PRODUCTS_DIR, path.dirname(specPath))
      .split(path.sep)
      .join("/");

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
      url: urlPathFor(spec, repoRel),
      slug_path: repoRel,
    });

    if (pdpTemplate) {
      const html = renderPdp(pdpTemplate, spec, repoRel);
      const outDir = path.join(PORTFOLIO_DIR, repoRel);
      await fs.mkdir(outDir, { recursive: true });
      await fs.writeFile(path.join(outDir, "index.html"), html, "utf-8");
      pdpCount++;
    }
  }

  // Sort for deterministic output.
  flatIndex.sort((a, b) =>
    (a.category + a.sub_category + (a.series ?? "") + a.sku).localeCompare(
      b.category + b.sub_category + (b.series ?? "") + b.sku,
    ),
  );

  await fs.writeFile(INDEX_OUT, JSON.stringify(flatIndex, null, 2) + "\n", "utf-8");
  console.log(`[build:products] indexed ${flatIndex.length} SKUs, generated ${pdpCount} PDP pages`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
