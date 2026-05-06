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
 *   /                 → static_site/archcraft/home-two/index.html
 *   /about-us/        → static_site/archcraft/about-us/index.html
 *   /blog-grid/       → static_site/archcraft/blog-grid/index.html
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

async function resolveStaticFile(slug: string[]): Promise<string | null> {
  const reqPath = slug.length === 0 ? "" : slug.join("/");

  if (reqPath === "") {
    return path.join(STATIC_ROOT, "home-two", "index.html");
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
  _req: NextRequest,
  ctx: { params: Promise<{ slug?: string[] }> },
) {
  const { slug } = await ctx.params;
  const reqPath = pathFromSlug(slug);

  if (STUB_JS_PATTERNS.some((re) => re.test(reqPath))) return emptyJsResponse();
  if (STUB_JSON_PATTERNS.some((re) => re.test(reqPath))) return emptyJsonResponse();

  const file = await resolveStaticFile(slug ?? []);
  if (!file) {
    return new Response("Not Found", { status: 404 });
  }

  const ext = path.extname(file).toLowerCase();
  const contentType = MIME[ext] ?? "application/octet-stream";

  if (ext === ".html" || ext === ".css" || ext === ".js" ||
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
