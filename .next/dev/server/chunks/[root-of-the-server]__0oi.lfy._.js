module.exports = [
"[externals]/next/dist/compiled/next-server/app-route-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-route-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/@opentelemetry/api [external] (next/dist/compiled/@opentelemetry/api, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/@opentelemetry/api", () => require("next/dist/compiled/@opentelemetry/api"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[externals]/node:fs [external] (node:fs, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:fs", () => require("node:fs"));

module.exports = mod;
}),
"[externals]/node:path [external] (node:path, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:path", () => require("node:path"));

module.exports = mod;
}),
"[project]/src/app/[[...slug]]/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GET",
    ()=>GET,
    "POST",
    ()=>POST
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$fs__$5b$external$5d$__$28$node$3a$fs$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/node:fs [external] (node:fs, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$path__$5b$external$5d$__$28$node$3a$path$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/node:path [external] (node:path, cjs)");
;
;
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
 */ const STATIC_ROOT = __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$path__$5b$external$5d$__$28$node$3a$path$2c$__cjs$29$__["default"].join(process.cwd(), "static_site", "archcraft");
async function resolveStaticFile(slug) {
    const reqPath = slug.length === 0 ? "" : slug.join("/");
    if (reqPath === "") {
        return __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$path__$5b$external$5d$__$28$node$3a$path$2c$__cjs$29$__["default"].join(STATIC_ROOT, "home-two", "index.html");
    }
    const direct = __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$path__$5b$external$5d$__$28$node$3a$path$2c$__cjs$29$__["default"].join(STATIC_ROOT, reqPath);
    if (await pathIsFile(direct)) return direct;
    const indexHtml = __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$path__$5b$external$5d$__$28$node$3a$path$2c$__cjs$29$__["default"].join(STATIC_ROOT, reqPath, "index.html");
    if (await pathIsFile(indexHtml)) return indexHtml;
    return null;
}
async function pathIsFile(p) {
    try {
        const s = await __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$fs__$5b$external$5d$__$28$node$3a$fs$2c$__cjs$29$__["promises"].stat(p);
        return s.isFile();
    } catch  {
        return false;
    }
}
const MIME = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".mjs": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".webp": "image/webp",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".ico": "image/x-icon",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".mp4": "video/mp4",
    ".txt": "text/plain; charset=utf-8"
};
/* ------------------------------ Stub matchers ------------------------------ */ const STUB_JS_PATTERNS = [
    // Elementor's runtime tries to lazy-load a "shared frontend handlers" bundle
    // that doesn't ship with the version we have. Returning an empty module is
    // safe — the features it exposes are unused on this site.
    /^\/wp-content\/plugins\/elementor\/assets\/js\/shared-frontend-handlers\.[a-z0-9]+\.bundle\.min\.js$/
];
const STUB_JSON_PATTERNS = [
    // Contact Form 7 schema lookup — no real form backend.
    /^\/wp-json\/contact-form-7\/v1\/contact-forms\/\d+\/feedback\/schema$/
];
function emptyJsResponse() {
    return new Response("/* stub */\n", {
        headers: {
            "content-type": "application/javascript; charset=utf-8"
        }
    });
}
function emptyJsonResponse(body = {}) {
    return new Response(JSON.stringify(body), {
        headers: {
            "content-type": "application/json; charset=utf-8"
        }
    });
}
function pathFromSlug(slug) {
    return "/" + (slug ?? []).join("/");
}
async function GET(_req, ctx) {
    const { slug } = await ctx.params;
    const reqPath = pathFromSlug(slug);
    if (STUB_JS_PATTERNS.some((re)=>re.test(reqPath))) return emptyJsResponse();
    if (STUB_JSON_PATTERNS.some((re)=>re.test(reqPath))) return emptyJsonResponse();
    const file = await resolveStaticFile(slug ?? []);
    if (!file) {
        return new Response("Not Found", {
            status: 404
        });
    }
    const ext = __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$path__$5b$external$5d$__$28$node$3a$path$2c$__cjs$29$__["default"].extname(file).toLowerCase();
    const contentType = MIME[ext] ?? "application/octet-stream";
    if (ext === ".html" || ext === ".css" || ext === ".js" || ext === ".mjs" || ext === ".json" || ext === ".svg" || ext === ".txt") {
        const body = await __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$fs__$5b$external$5d$__$28$node$3a$fs$2c$__cjs$29$__["promises"].readFile(file, "utf-8");
        return new Response(body, {
            headers: {
                "content-type": contentType
            }
        });
    }
    const buf = await __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$fs__$5b$external$5d$__$28$node$3a$fs$2c$__cjs$29$__["promises"].readFile(file);
    return new Response(buf, {
        headers: {
            "content-type": contentType
        }
    });
}
async function POST(req, ctx) {
    const { slug } = await ctx.params;
    const url = new URL(req.url);
    const wcAjax = url.searchParams.get("wc-ajax");
    if (wcAjax) {
        return emptyJsonResponse({
            success: true,
            data: ""
        });
    }
    // Anything else POSTed to a slug isn't supported.
    void slug;
    return new Response("Method Not Allowed", {
        status: 405
    });
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__0oi.lfy._.js.map