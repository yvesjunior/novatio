import { promises as fs } from "node:fs";
import path from "node:path";
import type { NextRequest } from "next/server";

/**
 * Catch-all route handler that serves the existing static Novatio site
 * unmodified. Every URL is mapped to the corresponding `index.html` under
 * `static_site/archcraft/<slug>/index.html` and returned
 * verbatim. Visual output is identical to the legacy site because the markup
 * is identical.
 *
 *   /                 → static_site/archcraft/home/index.html
 *   /about-us/        → static_site/archcraft/about-us/index.html
 *   /partials/footer.html → static_site/archcraft/partials/footer.html (raw passthrough)
 *
 * Static assets under /wp-content/* are served by Next via the public/wp-content
 * symlink, so they don't hit this handler.
 *
 * In addition, this handler stubs a few WordPress runtime endpoints that the
 * legacy JS still pings even after their plugins were stripped — silencing
 * console 404 noise without affecting visuals.
 */

const STATIC_ROOT = path.join(process.cwd(), "static_site", "archcraft");
const I18N_ROOT = path.join(process.cwd(), "i18n");

/* ------------------------------ i18n engine ------------------------------- */

type Locale = "en" | "fr";
type Dict = Record<string, string>;

let _dicts: Record<Locale, Dict> | null = null;

async function loadDicts(): Promise<Record<Locale, Dict>> {
  if (_dicts && process.env.NODE_ENV === "production") return _dicts;
  const [enRaw, frRaw] = await Promise.all([
    fs.readFile(path.join(I18N_ROOT, "en.json"), "utf-8"),
    fs.readFile(path.join(I18N_ROOT, "fr.json"), "utf-8"),
  ]);
  _dicts = { en: JSON.parse(enRaw), fr: JSON.parse(frRaw) };
  return _dicts;
}

function detectLocale(
  req: NextRequest,
  slug: string[],
): { locale: Locale; cleanedSlug: string[] } {
  if (slug[0] === "fr") return { locale: "fr", cleanedSlug: slug.slice(1) };
  if (slug[0] === "en") return { locale: "en", cleanedSlug: slug.slice(1) };
  const cookieLocale = req.cookies.get("locale")?.value;
  if (cookieLocale === "fr" || cookieLocale === "en") {
    return { locale: cookieLocale, cleanedSlug: slug };
  }
  return { locale: "en", cleanedSlug: slug };
}

function escapeHtmlAttr(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function findMatchingClose(
  html: string,
  startIndex: number,
  tagName: string,
): number {
  // Scan forward from startIndex, counting opens/closes of `tagName`, until depth returns to zero.
  // Returns the index of the matching `</tagName>` or -1 if unmatched.
  const re = new RegExp(`<(\\/?)${tagName}\\b([^>]*)>`, "gi");
  re.lastIndex = startIndex;
  let depth = 1;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const isClose = m[1] === "/";
    const isSelfClosing = !isClose && m[2].endsWith("/");
    if (isClose) {
      depth -= 1;
      if (depth === 0) return m.index;
    } else if (!isSelfClosing) {
      depth += 1;
    }
  }
  return -1;
}

function applyTranslations(html: string, dict: Dict, locale: Locale): string {
  // Pass 1 — inner-text replacement for <tag ... data-i18n="key" ...>...</tag>.
  // Walks the matching closing tag with depth counting so nested same-name tags
  // (e.g. <span class="pxl--btn-text"><span>D</span><span>I</span>...</span>) are handled.
  // Skipped when the tag has data-i18n-attr (attribute-only mode).
  // If the tag has data-i18n-also-attr="<attr>", that attribute is also rewritten
  // with the (HTML-escaped) translation — used for widgets that mirror text via
  // data-text="..." for CSS hover overlays.
  const openRe = /<([A-Za-z][A-Za-z0-9]*)\b[^>]*\sdata-i18n="([^"]+)"[^>]*>/g;
  const out: string[] = [];
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = openRe.exec(html)) !== null) {
    const openTag = m[0];
    const tagName = m[1];
    const key = m[2];
    const openStart = m.index;
    const openEnd = m.index + openTag.length;

    if (/\sdata-i18n-attr=/.test(openTag)) continue; // attribute-only, handled in Pass 2
    if (openTag.endsWith("/>")) continue; // self-closing has no inner

    const v = dict[key];
    if (v === undefined) continue;

    const closeStart = findMatchingClose(html, openEnd, tagName);
    if (closeStart < 0) continue;
    const closeEnd = html.indexOf(">", closeStart) + 1;

    let newOpen = openTag;
    const alsoAttrMatch = openTag.match(/\sdata-i18n-also-attr="([^"]+)"/);
    if (alsoAttrMatch) {
      const attr = alsoAttrMatch[1];
      const attrRe = new RegExp(`(\\s${attr}=")[^"]*(")`);
      newOpen = newOpen.replace(attrRe, `$1${escapeHtmlAttr(v)}$2`);
    }

    out.push(html.substring(lastIndex, openStart));
    out.push(newOpen);
    out.push(v);
    out.push(html.substring(closeStart, closeEnd));
    lastIndex = closeEnd;
    openRe.lastIndex = closeEnd;
  }
  out.push(html.substring(lastIndex));
  html = out.join("");

  // Pass 2 — attribute-only replacement: <tag ... data-i18n="key" data-i18n-attr="placeholder" ...>
  html = html.replace(
    /<[A-Za-z][^>]*\sdata-i18n="([^"]+)"\s+data-i18n-attr="([^"]+)"[^>]*>/g,
    (match, key: string, attr: string) => {
      const v = dict[key];
      if (v === undefined) return match;
      const re = new RegExp(`(\\s${attr}=")[^"]*(")`);
      return match.replace(re, `$1${escapeHtmlAttr(v)}$2`);
    },
  );

  // <html lang="..."> reflects the active locale.
  html = html.replace(
    /(<html\b[^>]*\slang=")[^"]*(")/,
    `$1${locale === "fr" ? "fr-CA" : "en-US"}$2`,
  );

  return html;
}

function slugToMetaKey(cleanedSlug: string[]): string {
  // Map cleaned URL slug → dictionary key used for meta description.
  // e.g. [] → "meta.description.home"; ["about-us"] → "meta.description.about";
  // ["portfolio", "crafted-with-passion"] → "meta.description.portfolio.crafted_with_passion".
  if (cleanedSlug.length === 0) return "meta.description.home";
  const map: Record<string, string> = {
    "about-us": "meta.description.about",
    "services": "meta.description.services",
    "contact-us": "meta.description.contact",
    "careers": "meta.description.careers",
    "faq": "meta.description.faq",
    "gallery": "meta.description.gallery",
    "portfolio": "meta.description.portfolio",
    "error-404": "meta.description.error_404",
  };
  if (cleanedSlug.length === 1 && map[cleanedSlug[0]]) return map[cleanedSlug[0]];
  if (cleanedSlug[0] === "portfolio" && cleanedSlug.length === 2) {
    return `meta.description.portfolio.${cleanedSlug[1].replace(/-/g, "_")}`;
  }
  return "meta.description.home";
}

function injectSeoTags(
  html: string,
  req: NextRequest,
  cleanedSlug: string[],
  dict: Dict,
): string {
  // Build absolute URLs for the EN and FR variants of this page so search engines
  // can serve the right locale and avoid duplicate-content penalties.
  const url = new URL(req.url);
  const cleanedPath = cleanedSlug.length === 0 ? "/" : "/" + cleanedSlug.join("/") + "/";
  const enUrl = `${url.origin}${cleanedPath}`;
  const frUrl = `${url.origin}/fr${cleanedPath}`;
  const tags: string[] = [
    `<link rel="alternate" hreflang="en" href="${enUrl}" />`,
    `<link rel="alternate" hreflang="fr-CA" href="${frUrl}" />`,
    `<link rel="alternate" hreflang="x-default" href="${enUrl}" />`,
    `<link rel="canonical" href="${enUrl}" />`,
  ];
  const desc = dict[slugToMetaKey(cleanedSlug)];
  if (desc) {
    tags.unshift(`<meta name="description" content="${escapeHtmlAttr(desc)}" />`);
  }
  // Strip any pre-existing canonical (the WordPress export ships a broken
  // <link rel="canonical" href="index.html" />). Our injected one above is correct.
  html = html.replace(/<link\s+rel=["']canonical["'][^>]*\/?>/gi, "");
  // Insert just before </head>; if there's no </head> we leave the html unchanged.
  return html.replace(/<\/head>/i, `${tags.join("")}</head>`);
}

async function resolveStaticFile(slug: string[]): Promise<string | null> {
  const reqPath = slug.length === 0 ? "" : slug.join("/");

  if (reqPath === "") {
    return path.join(STATIC_ROOT, "home", "index.html");
  }

  const direct = path.join(STATIC_ROOT, reqPath);
  if (await pathIsFile(direct)) return direct;

  const indexHtml = path.join(STATIC_ROOT, reqPath, "index.html");
  if (await pathIsFile(indexHtml)) return indexHtml;

  return null;
}

async function pathIsFile(p: string): Promise<boolean> {
  try {
    const s = await fs.stat(p);
    return s.isFile();
  } catch {
    return false;
  }
}

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".js":   "application/javascript; charset=utf-8",
  ".mjs":  "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg":  "image/svg+xml",
  ".webp": "image/webp",
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif":  "image/gif",
  ".ico":  "image/x-icon",
  ".woff": "font/woff",
  ".woff2":"font/woff2",
  ".mp4":  "video/mp4",
  ".txt":  "text/plain; charset=utf-8",
};

/* ------------------------------ Stub matchers ------------------------------ */

const STUB_JS_PATTERNS = [
  // Elementor's runtime tries to lazy-load a "shared frontend handlers" bundle
  // that doesn't ship with the version we have. Returning an empty module is
  // safe — the features it exposes are unused on this site.
  /^\/wp-content\/plugins\/elementor\/assets\/js\/shared-frontend-handlers\.[a-z0-9]+\.bundle\.min\.js$/,
];

const STUB_JSON_PATTERNS = [
  // Contact Form 7 schema lookup — no real form backend.
  /^\/wp-json\/contact-form-7\/v1\/contact-forms\/\d+\/feedback\/schema$/,
];

function emptyJsResponse() {
  return new Response("/* stub */\n", {
    headers: { "content-type": "application/javascript; charset=utf-8" },
  });
}

function emptyJsonResponse(body: object = {}) {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function pathFromSlug(slug: string[] | undefined): string {
  return "/" + (slug ?? []).join("/");
}

/* --------------------------------- Handlers -------------------------------- */

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ slug?: string[] }> },
) {
  const { slug } = await ctx.params;
  const reqPath = pathFromSlug(slug);

  if (STUB_JS_PATTERNS.some((re) => re.test(reqPath))) return emptyJsResponse();
  if (STUB_JSON_PATTERNS.some((re) => re.test(reqPath))) return emptyJsonResponse();

  const { locale, cleanedSlug } = detectLocale(req, slug ?? []);
  const file = await resolveStaticFile(cleanedSlug);
  if (!file) {
    return new Response("Not Found", { status: 404 });
  }

  const ext = path.extname(file).toLowerCase();
  const contentType = MIME[ext] ?? "application/octet-stream";

  if (ext === ".html") {
    let body = await fs.readFile(file, "utf-8");
    const dicts = await loadDicts();
    if (locale !== "en") {
      body = applyTranslations(body, dicts[locale] ?? {}, locale);
    }
    body = injectSeoTags(body, req, cleanedSlug, dicts[locale] ?? {});
    return new Response(body, { headers: { "content-type": contentType } });
  }

  if (ext === ".css" || ext === ".js" ||
      ext === ".mjs" || ext === ".json" || ext === ".svg" || ext === ".txt") {
    const body = await fs.readFile(file, "utf-8");
    return new Response(body, { headers: { "content-type": contentType } });
  }

  const buf = await fs.readFile(file);
  return new Response(buf, { headers: { "content-type": contentType } });
}

/**
 * Handle WooCommerce-style admin AJAX (POST /?wc-ajax=...). The legacy JS
 * issues these to the wishlist plugin even after the plugin's frontend script
 * was removed; we silence them with an empty success response.
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ slug?: string[] }> },
) {
  const { slug } = await ctx.params;
  const url = new URL(req.url);
  const wcAjax = url.searchParams.get("wc-ajax");
  if (wcAjax) {
    return emptyJsonResponse({ success: true, data: "" });
  }
  // Anything else POSTed to a slug isn't supported.
  void slug;
  return new Response("Method Not Allowed", { status: 405 });
}
