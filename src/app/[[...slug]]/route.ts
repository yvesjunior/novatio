import { promises as fs } from "node:fs";
import path from "node:path";
import type { NextRequest } from "next/server";

/**
 * Catch-all route handler that serves the existing static ArchCraft site
 * unmodified. Every URL is mapped to the corresponding `index.html` under
 * `static_site/demo.casethemes.net/archcraft/<slug>/index.html` and returned
 * verbatim. Visual output is identical to the legacy site because the markup
 * is identical.
 *
 *   /                 → static_site/.../home-two/index.html
 *   /about-us/        → static_site/.../about-us/index.html
 *   /blog-grid/       → static_site/.../blog-grid/index.html
 *   /partials/footer.html → static_site/.../partials/footer.html (raw passthrough)
 *
 * Static assets under /wp-content/* are served by Next via the public/wp-content
 * symlink, so they don't hit this handler.
 */

const STATIC_ROOT = path.join(
  process.cwd(),
  "static_site",
  "demo.casethemes.net",
  "archcraft",
);

/** Slug → filesystem path resolution. Keep this list in sync with the
 *  static_site/ folder structure. Returns the absolute path or null if not found. */
async function resolveStaticFile(slug: string[]): Promise<string | null> {
  const reqPath = slug.length === 0 ? "" : slug.join("/");

  // Special: root maps to the home-two page.
  if (reqPath === "") {
    return path.join(STATIC_ROOT, "home-two", "index.html");
  }

  // Direct file (e.g. /partials/footer.html, /partials/components.js, /serve.json).
  const direct = path.join(STATIC_ROOT, reqPath);
  if (await pathIsFile(direct)) return direct;

  // Directory with index.html.
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

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ slug?: string[] }> },
) {
  const { slug } = await ctx.params;
  const file = await resolveStaticFile(slug ?? []);
  if (!file) {
    return new Response("Not Found", { status: 404 });
  }

  const ext = path.extname(file).toLowerCase();
  const contentType = MIME[ext] ?? "application/octet-stream";

  // Read text-like content as utf-8 string; binary as buffer.
  if (ext === ".html" || ext === ".css" || ext === ".js" ||
      ext === ".mjs" || ext === ".json" || ext === ".svg" || ext === ".txt") {
    const body = await fs.readFile(file, "utf-8");
    return new Response(body, { headers: { "content-type": contentType } });
  }

  const buf = await fs.readFile(file);
  return new Response(buf, { headers: { "content-type": contentType } });
}
