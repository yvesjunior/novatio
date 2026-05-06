module.exports = [
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
"[project]/node_modules/next/dist/esm/shared/lib/segment.js [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "DEFAULT_SEGMENT_KEY",
    ()=>DEFAULT_SEGMENT_KEY,
    "NOT_FOUND_SEGMENT_KEY",
    ()=>NOT_FOUND_SEGMENT_KEY,
    "PAGE_SEGMENT_KEY",
    ()=>PAGE_SEGMENT_KEY,
    "addSearchParamsIfPageSegment",
    ()=>addSearchParamsIfPageSegment,
    "computeSelectedLayoutSegment",
    ()=>computeSelectedLayoutSegment,
    "getSegmentValue",
    ()=>getSegmentValue,
    "getSelectedLayoutSegmentPath",
    ()=>getSelectedLayoutSegmentPath,
    "isGroupSegment",
    ()=>isGroupSegment,
    "isParallelRouteSegment",
    ()=>isParallelRouteSegment
]);
function getSegmentValue(segment) {
    return Array.isArray(segment) ? segment[1] : segment;
}
function isGroupSegment(segment) {
    // Use array[0] for performant purpose
    return segment[0] === '(' && segment.endsWith(')');
}
function isParallelRouteSegment(segment) {
    return segment.startsWith('@') && segment !== '@children';
}
function addSearchParamsIfPageSegment(segment, searchParams) {
    const isPageSegment = segment.includes(PAGE_SEGMENT_KEY);
    if (isPageSegment) {
        const stringifiedQuery = JSON.stringify(searchParams);
        return stringifiedQuery !== '{}' ? PAGE_SEGMENT_KEY + '?' + stringifiedQuery : PAGE_SEGMENT_KEY;
    }
    return segment;
}
function computeSelectedLayoutSegment(segments, parallelRouteKey) {
    if (!segments || segments.length === 0) {
        return null;
    }
    // For 'children', use first segment; for other parallel routes, use last segment
    const rawSegment = parallelRouteKey === 'children' ? segments[0] : segments[segments.length - 1];
    // If the default slot is showing, return null since it's not technically "selected" (it's a fallback)
    // Returning an internal value like `__DEFAULT__` would be confusing
    return rawSegment === DEFAULT_SEGMENT_KEY ? null : rawSegment;
}
function getSelectedLayoutSegmentPath(tree, parallelRouteKey, first = true, segmentPath = []) {
    let node;
    if (first) {
        // Use the provided parallel route key on the first parallel route
        node = tree[1][parallelRouteKey];
    } else {
        // After first parallel route prefer children, if there's no children pick the first parallel route.
        const parallelRoutes = tree[1];
        node = parallelRoutes.children ?? Object.values(parallelRoutes)[0];
    }
    if (!node) return segmentPath;
    const segment = node[0];
    let segmentValue = getSegmentValue(segment);
    if (!segmentValue || segmentValue.startsWith(PAGE_SEGMENT_KEY)) {
        return segmentPath;
    }
    segmentPath.push(segmentValue);
    return getSelectedLayoutSegmentPath(node, parallelRouteKey, false, segmentPath);
}
const PAGE_SEGMENT_KEY = '__PAGE__';
const DEFAULT_SEGMENT_KEY = '__DEFAULT__';
const NOT_FOUND_SEGMENT_KEY = '/_not-found';
}),
"[project]/node_modules/next/dist/esm/shared/lib/router/utils/app-paths.js [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "compareAppPaths",
    ()=>compareAppPaths,
    "normalizeAppPath",
    ()=>normalizeAppPath,
    "normalizeRscURL",
    ()=>normalizeRscURL
]);
(()=>{
    const e = new Error("Cannot find module '../../page-path/ensure-leading-slash'");
    e.code = 'MODULE_NOT_FOUND';
    throw e;
})();
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$shared$2f$lib$2f$segment$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/esm/shared/lib/segment.js [app-route] (ecmascript)");
;
;
function normalizeAppPath(route) {
    return ensureLeadingSlash(route.split('/').reduce((pathname, segment, index, segments)=>{
        // Empty segments are ignored.
        if (!segment) {
            return pathname;
        }
        // Groups are ignored.
        if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$shared$2f$lib$2f$segment$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["isGroupSegment"])(segment)) {
            return pathname;
        }
        // Parallel segments are ignored.
        if (segment[0] === '@') {
            return pathname;
        }
        // The last segment (if it's a leaf) should be ignored.
        if ((segment === 'page' || segment === 'route') && index === segments.length - 1) {
            return pathname;
        }
        return `${pathname}/${segment}`;
    }, ''));
}
function compareAppPaths(a, b) {
    const aHasSlot = a.includes('/@');
    const bHasSlot = b.includes('/@');
    if (aHasSlot && !bHasSlot) return -1;
    if (!aHasSlot && bHasSlot) return 1;
    return a.localeCompare(b);
}
function normalizeRscURL(url) {
    return url.replace(/\.rsc($|\?)/, '$1');
}
}),
"[project]/node_modules/next/dist/esm/lib/constants.js [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ACTION_SUFFIX",
    ()=>ACTION_SUFFIX,
    "APP_DIR_ALIAS",
    ()=>APP_DIR_ALIAS,
    "CACHE_ONE_YEAR_SECONDS",
    ()=>CACHE_ONE_YEAR_SECONDS,
    "DOT_NEXT_ALIAS",
    ()=>DOT_NEXT_ALIAS,
    "ESLINT_DEFAULT_DIRS",
    ()=>ESLINT_DEFAULT_DIRS,
    "GSP_NO_RETURNED_VALUE",
    ()=>GSP_NO_RETURNED_VALUE,
    "GSSP_COMPONENT_MEMBER_ERROR",
    ()=>GSSP_COMPONENT_MEMBER_ERROR,
    "GSSP_NO_RETURNED_VALUE",
    ()=>GSSP_NO_RETURNED_VALUE,
    "HTML_CONTENT_TYPE_HEADER",
    ()=>HTML_CONTENT_TYPE_HEADER,
    "INFINITE_CACHE",
    ()=>INFINITE_CACHE,
    "INSTRUMENTATION_HOOK_FILENAME",
    ()=>INSTRUMENTATION_HOOK_FILENAME,
    "JSON_CONTENT_TYPE_HEADER",
    ()=>JSON_CONTENT_TYPE_HEADER,
    "MATCHED_PATH_HEADER",
    ()=>MATCHED_PATH_HEADER,
    "MIDDLEWARE_FILENAME",
    ()=>MIDDLEWARE_FILENAME,
    "MIDDLEWARE_LOCATION_REGEXP",
    ()=>MIDDLEWARE_LOCATION_REGEXP,
    "NEXT_BODY_SUFFIX",
    ()=>NEXT_BODY_SUFFIX,
    "NEXT_CACHE_IMPLICIT_TAG_ID",
    ()=>NEXT_CACHE_IMPLICIT_TAG_ID,
    "NEXT_CACHE_REVALIDATED_TAGS_HEADER",
    ()=>NEXT_CACHE_REVALIDATED_TAGS_HEADER,
    "NEXT_CACHE_REVALIDATE_TAG_TOKEN_HEADER",
    ()=>NEXT_CACHE_REVALIDATE_TAG_TOKEN_HEADER,
    "NEXT_CACHE_ROOT_PARAM_TAG_ID",
    ()=>NEXT_CACHE_ROOT_PARAM_TAG_ID,
    "NEXT_CACHE_SOFT_TAG_MAX_LENGTH",
    ()=>NEXT_CACHE_SOFT_TAG_MAX_LENGTH,
    "NEXT_CACHE_TAGS_HEADER",
    ()=>NEXT_CACHE_TAGS_HEADER,
    "NEXT_CACHE_TAG_MAX_ITEMS",
    ()=>NEXT_CACHE_TAG_MAX_ITEMS,
    "NEXT_CACHE_TAG_MAX_LENGTH",
    ()=>NEXT_CACHE_TAG_MAX_LENGTH,
    "NEXT_DATA_SUFFIX",
    ()=>NEXT_DATA_SUFFIX,
    "NEXT_INTERCEPTION_MARKER_PREFIX",
    ()=>NEXT_INTERCEPTION_MARKER_PREFIX,
    "NEXT_META_SUFFIX",
    ()=>NEXT_META_SUFFIX,
    "NEXT_NAV_DEPLOYMENT_ID_HEADER",
    ()=>NEXT_NAV_DEPLOYMENT_ID_HEADER,
    "NEXT_QUERY_PARAM_PREFIX",
    ()=>NEXT_QUERY_PARAM_PREFIX,
    "NEXT_RESUME_HEADER",
    ()=>NEXT_RESUME_HEADER,
    "NEXT_RESUME_STATE_LENGTH_HEADER",
    ()=>NEXT_RESUME_STATE_LENGTH_HEADER,
    "NON_STANDARD_NODE_ENV",
    ()=>NON_STANDARD_NODE_ENV,
    "PAGES_DIR_ALIAS",
    ()=>PAGES_DIR_ALIAS,
    "PRERENDER_REVALIDATE_HEADER",
    ()=>PRERENDER_REVALIDATE_HEADER,
    "PRERENDER_REVALIDATE_ONLY_GENERATED_HEADER",
    ()=>PRERENDER_REVALIDATE_ONLY_GENERATED_HEADER,
    "PROXY_FILENAME",
    ()=>PROXY_FILENAME,
    "PROXY_LOCATION_REGEXP",
    ()=>PROXY_LOCATION_REGEXP,
    "PUBLIC_DIR_MIDDLEWARE_CONFLICT",
    ()=>PUBLIC_DIR_MIDDLEWARE_CONFLICT,
    "ROOT_DIR_ALIAS",
    ()=>ROOT_DIR_ALIAS,
    "RSC_ACTION_CLIENT_WRAPPER_ALIAS",
    ()=>RSC_ACTION_CLIENT_WRAPPER_ALIAS,
    "RSC_ACTION_ENCRYPTION_ALIAS",
    ()=>RSC_ACTION_ENCRYPTION_ALIAS,
    "RSC_ACTION_PROXY_ALIAS",
    ()=>RSC_ACTION_PROXY_ALIAS,
    "RSC_ACTION_VALIDATE_ALIAS",
    ()=>RSC_ACTION_VALIDATE_ALIAS,
    "RSC_CACHE_WRAPPER_ALIAS",
    ()=>RSC_CACHE_WRAPPER_ALIAS,
    "RSC_DYNAMIC_IMPORT_WRAPPER_ALIAS",
    ()=>RSC_DYNAMIC_IMPORT_WRAPPER_ALIAS,
    "RSC_MOD_REF_PROXY_ALIAS",
    ()=>RSC_MOD_REF_PROXY_ALIAS,
    "RSC_SEGMENTS_DIR_SUFFIX",
    ()=>RSC_SEGMENTS_DIR_SUFFIX,
    "RSC_SEGMENT_SUFFIX",
    ()=>RSC_SEGMENT_SUFFIX,
    "RSC_SUFFIX",
    ()=>RSC_SUFFIX,
    "SERVER_PROPS_EXPORT_ERROR",
    ()=>SERVER_PROPS_EXPORT_ERROR,
    "SERVER_PROPS_GET_INIT_PROPS_CONFLICT",
    ()=>SERVER_PROPS_GET_INIT_PROPS_CONFLICT,
    "SERVER_PROPS_SSG_CONFLICT",
    ()=>SERVER_PROPS_SSG_CONFLICT,
    "SERVER_RUNTIME",
    ()=>SERVER_RUNTIME,
    "SSG_FALLBACK_EXPORT_ERROR",
    ()=>SSG_FALLBACK_EXPORT_ERROR,
    "SSG_GET_INITIAL_PROPS_CONFLICT",
    ()=>SSG_GET_INITIAL_PROPS_CONFLICT,
    "STATIC_STATUS_PAGE_GET_INITIAL_PROPS_ERROR",
    ()=>STATIC_STATUS_PAGE_GET_INITIAL_PROPS_ERROR,
    "TEXT_PLAIN_CONTENT_TYPE_HEADER",
    ()=>TEXT_PLAIN_CONTENT_TYPE_HEADER,
    "UNSTABLE_REVALIDATE_RENAME_ERROR",
    ()=>UNSTABLE_REVALIDATE_RENAME_ERROR,
    "WEBPACK_LAYERS",
    ()=>WEBPACK_LAYERS,
    "WEBPACK_RESOURCE_QUERIES",
    ()=>WEBPACK_RESOURCE_QUERIES,
    "WEB_SOCKET_MAX_RECONNECTIONS",
    ()=>WEB_SOCKET_MAX_RECONNECTIONS
]);
const TEXT_PLAIN_CONTENT_TYPE_HEADER = 'text/plain';
const HTML_CONTENT_TYPE_HEADER = 'text/html; charset=utf-8';
const JSON_CONTENT_TYPE_HEADER = 'application/json; charset=utf-8';
const NEXT_QUERY_PARAM_PREFIX = 'nxtP';
const NEXT_INTERCEPTION_MARKER_PREFIX = 'nxtI';
const MATCHED_PATH_HEADER = 'x-matched-path';
const PRERENDER_REVALIDATE_HEADER = 'x-prerender-revalidate';
const PRERENDER_REVALIDATE_ONLY_GENERATED_HEADER = 'x-prerender-revalidate-if-generated';
const RSC_SEGMENTS_DIR_SUFFIX = '.segments';
const RSC_SEGMENT_SUFFIX = '.segment.rsc';
const RSC_SUFFIX = '.rsc';
const ACTION_SUFFIX = '.action';
const NEXT_DATA_SUFFIX = '.json';
const NEXT_META_SUFFIX = '.meta';
const NEXT_BODY_SUFFIX = '.body';
const NEXT_NAV_DEPLOYMENT_ID_HEADER = 'x-nextjs-deployment-id';
const NEXT_CACHE_TAGS_HEADER = 'x-next-cache-tags';
const NEXT_CACHE_REVALIDATED_TAGS_HEADER = 'x-next-revalidated-tags';
const NEXT_CACHE_REVALIDATE_TAG_TOKEN_HEADER = 'x-next-revalidate-tag-token';
const NEXT_RESUME_HEADER = 'next-resume';
const NEXT_RESUME_STATE_LENGTH_HEADER = 'x-next-resume-state-length';
const NEXT_CACHE_TAG_MAX_ITEMS = 128;
const NEXT_CACHE_TAG_MAX_LENGTH = 256;
const NEXT_CACHE_SOFT_TAG_MAX_LENGTH = 1024;
const NEXT_CACHE_IMPLICIT_TAG_ID = '_N_T_';
const NEXT_CACHE_ROOT_PARAM_TAG_ID = '_N_RP_';
const CACHE_ONE_YEAR_SECONDS = 31536000;
const INFINITE_CACHE = 0xfffffffe;
const MIDDLEWARE_FILENAME = 'middleware';
const MIDDLEWARE_LOCATION_REGEXP = `(?:src/)?${MIDDLEWARE_FILENAME}`;
const PROXY_FILENAME = 'proxy';
const PROXY_LOCATION_REGEXP = `(?:src/)?${PROXY_FILENAME}`;
const INSTRUMENTATION_HOOK_FILENAME = 'instrumentation';
const PAGES_DIR_ALIAS = 'private-next-pages';
const DOT_NEXT_ALIAS = 'private-dot-next';
const ROOT_DIR_ALIAS = 'private-next-root-dir';
const APP_DIR_ALIAS = 'private-next-app-dir';
const RSC_MOD_REF_PROXY_ALIAS = 'private-next-rsc-mod-ref-proxy';
const RSC_ACTION_VALIDATE_ALIAS = 'private-next-rsc-action-validate';
const RSC_ACTION_PROXY_ALIAS = 'private-next-rsc-server-reference';
const RSC_CACHE_WRAPPER_ALIAS = 'private-next-rsc-cache-wrapper';
const RSC_DYNAMIC_IMPORT_WRAPPER_ALIAS = 'private-next-rsc-track-dynamic-import';
const RSC_ACTION_ENCRYPTION_ALIAS = 'private-next-rsc-action-encryption';
const RSC_ACTION_CLIENT_WRAPPER_ALIAS = 'private-next-rsc-action-client-wrapper';
const PUBLIC_DIR_MIDDLEWARE_CONFLICT = `You can not have a '_next' folder inside of your public folder. This conflicts with the internal '/_next' route. https://nextjs.org/docs/messages/public-next-folder-conflict`;
const SSG_GET_INITIAL_PROPS_CONFLICT = `You can not use getInitialProps with getStaticProps. To use SSG, please remove your getInitialProps`;
const SERVER_PROPS_GET_INIT_PROPS_CONFLICT = `You can not use getInitialProps with getServerSideProps. Please remove getInitialProps.`;
const SERVER_PROPS_SSG_CONFLICT = `You can not use getStaticProps or getStaticPaths with getServerSideProps. To use SSG, please remove getServerSideProps`;
const STATIC_STATUS_PAGE_GET_INITIAL_PROPS_ERROR = `can not have getInitialProps/getServerSideProps, https://nextjs.org/docs/messages/404-get-initial-props`;
const SERVER_PROPS_EXPORT_ERROR = `pages with \`getServerSideProps\` can not be exported. See more info here: https://nextjs.org/docs/messages/gssp-export`;
const GSP_NO_RETURNED_VALUE = 'Your `getStaticProps` function did not return an object. Did you forget to add a `return`?';
const GSSP_NO_RETURNED_VALUE = 'Your `getServerSideProps` function did not return an object. Did you forget to add a `return`?';
const UNSTABLE_REVALIDATE_RENAME_ERROR = 'The `unstable_revalidate` property is available for general use.\n' + 'Please use `revalidate` instead.';
const GSSP_COMPONENT_MEMBER_ERROR = `can not be attached to a page's component and must be exported from the page. See more info here: https://nextjs.org/docs/messages/gssp-component-member`;
const NON_STANDARD_NODE_ENV = `You are using a non-standard "NODE_ENV" value in your environment. This creates inconsistencies in the project and is strongly advised against. Read more: https://nextjs.org/docs/messages/non-standard-node-env`;
const SSG_FALLBACK_EXPORT_ERROR = `Pages with \`fallback\` enabled in \`getStaticPaths\` can not be exported. See more info here: https://nextjs.org/docs/messages/ssg-fallback-true-export`;
const ESLINT_DEFAULT_DIRS = [
    'app',
    'pages',
    'components',
    'lib',
    'src'
];
const SERVER_RUNTIME = {
    edge: 'edge',
    experimentalEdge: 'experimental-edge',
    nodejs: 'nodejs'
};
const WEB_SOCKET_MAX_RECONNECTIONS = 12;
/**
 * The names of the webpack layers. These layers are the primitives for the
 * webpack chunks.
 */ const WEBPACK_LAYERS_NAMES = {
    /**
   * The layer for the shared code between the client and server bundles.
   */ shared: 'shared',
    /**
   * The layer for server-only runtime and picking up `react-server` export conditions.
   * Including app router RSC pages and app router custom routes and metadata routes.
   */ reactServerComponents: 'rsc',
    /**
   * Server Side Rendering layer for app (ssr).
   */ serverSideRendering: 'ssr',
    /**
   * The browser client bundle layer for actions.
   */ actionBrowser: 'action-browser',
    /**
   * The Node.js bundle layer for the API routes.
   */ apiNode: 'api-node',
    /**
   * The Edge Lite bundle layer for the API routes.
   */ apiEdge: 'api-edge',
    /**
   * The layer for the middleware code.
   */ middleware: 'middleware',
    /**
   * The layer for the instrumentation hooks.
   */ instrument: 'instrument',
    /**
   * The layer for assets on the edge.
   */ edgeAsset: 'edge-asset',
    /**
   * The browser client bundle layer for App directory.
   */ appPagesBrowser: 'app-pages-browser',
    /**
   * The browser client bundle layer for Pages directory.
   */ pagesDirBrowser: 'pages-dir-browser',
    /**
   * The Edge Lite bundle layer for Pages directory.
   */ pagesDirEdge: 'pages-dir-edge',
    /**
   * The Node.js bundle layer for Pages directory.
   */ pagesDirNode: 'pages-dir-node'
};
const WEBPACK_LAYERS = {
    ...WEBPACK_LAYERS_NAMES,
    GROUP: {
        builtinReact: [
            WEBPACK_LAYERS_NAMES.reactServerComponents,
            WEBPACK_LAYERS_NAMES.actionBrowser
        ],
        serverOnly: [
            WEBPACK_LAYERS_NAMES.reactServerComponents,
            WEBPACK_LAYERS_NAMES.actionBrowser,
            WEBPACK_LAYERS_NAMES.instrument,
            WEBPACK_LAYERS_NAMES.middleware
        ],
        neutralTarget: [
            // pages api
            WEBPACK_LAYERS_NAMES.apiNode,
            WEBPACK_LAYERS_NAMES.apiEdge
        ],
        clientOnly: [
            WEBPACK_LAYERS_NAMES.serverSideRendering,
            WEBPACK_LAYERS_NAMES.appPagesBrowser
        ],
        bundled: [
            WEBPACK_LAYERS_NAMES.reactServerComponents,
            WEBPACK_LAYERS_NAMES.actionBrowser,
            WEBPACK_LAYERS_NAMES.serverSideRendering,
            WEBPACK_LAYERS_NAMES.appPagesBrowser,
            WEBPACK_LAYERS_NAMES.shared,
            WEBPACK_LAYERS_NAMES.instrument,
            WEBPACK_LAYERS_NAMES.middleware
        ],
        appPages: [
            // app router pages and layouts
            WEBPACK_LAYERS_NAMES.reactServerComponents,
            WEBPACK_LAYERS_NAMES.serverSideRendering,
            WEBPACK_LAYERS_NAMES.appPagesBrowser,
            WEBPACK_LAYERS_NAMES.actionBrowser
        ]
    }
};
const WEBPACK_RESOURCE_QUERIES = {
    edgeSSREntry: '__next_edge_ssr_entry__',
    metadata: '__next_metadata__',
    metadataRoute: '__next_metadata_route__',
    metadataImageMeta: '__next_metadata_image_meta__'
};
;
}),
"[project]/node_modules/next/dist/esm/build/templates/app-route.js { INNER_APP_ROUTE => \"[project]/src/app/[[...slug]]/route.ts [app-route] (ecmascript)\" } [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "handler",
    ()=>handler,
    "patchFetch",
    ()=>patchFetch,
    "routeModule",
    ()=>routeModule,
    "serverHooks",
    ()=>serverHooks,
    "workAsyncStorage",
    ()=>workAsyncStorage,
    "workUnitAsyncStorage",
    ()=>workUnitAsyncStorage
]);
(()=>{
    const e = new Error("Cannot find module 'next/dist/esm/server/route-modules/app-route/module.compiled'");
    e.code = 'MODULE_NOT_FOUND';
    throw e;
})();
(()=>{
    const e = new Error("Cannot find module 'next/dist/esm/server/route-kind'");
    e.code = 'MODULE_NOT_FOUND';
    throw e;
})();
(()=>{
    const e = new Error("Cannot find module 'next/dist/esm/server/lib/patch-fetch'");
    e.code = 'MODULE_NOT_FOUND';
    throw e;
})();
(()=>{
    const e = new Error("Cannot find module 'next/dist/esm/server/request-meta'");
    e.code = 'MODULE_NOT_FOUND';
    throw e;
})();
(()=>{
    const e = new Error("Cannot find module 'next/dist/esm/server/lib/trace/tracer'");
    e.code = 'MODULE_NOT_FOUND';
    throw e;
})();
(()=>{
    const e = new Error("Cannot find module 'next/dist/esm/server/app-render/manifests-singleton'");
    e.code = 'MODULE_NOT_FOUND';
    throw e;
})();
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$shared$2f$lib$2f$router$2f$utils$2f$app$2d$paths$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/esm/shared/lib/router/utils/app-paths.js [app-route] (ecmascript)");
(()=>{
    const e = new Error("Cannot find module 'next/dist/esm/server/base-http/node'");
    e.code = 'MODULE_NOT_FOUND';
    throw e;
})();
(()=>{
    const e = new Error("Cannot find module 'next/dist/esm/server/web/spec-extension/adapters/next-request'");
    e.code = 'MODULE_NOT_FOUND';
    throw e;
})();
(()=>{
    const e = new Error("Cannot find module 'next/dist/esm/server/lib/trace/constants'");
    e.code = 'MODULE_NOT_FOUND';
    throw e;
})();
(()=>{
    const e = new Error("Cannot find module 'next/dist/esm/server/instrumentation/utils'");
    e.code = 'MODULE_NOT_FOUND';
    throw e;
})();
(()=>{
    const e = new Error("Cannot find module 'next/dist/esm/server/send-response'");
    e.code = 'MODULE_NOT_FOUND';
    throw e;
})();
(()=>{
    const e = new Error("Cannot find module 'next/dist/esm/server/web/utils'");
    e.code = 'MODULE_NOT_FOUND';
    throw e;
})();
(()=>{
    const e = new Error("Cannot find module 'next/dist/esm/server/lib/cache-control'");
    e.code = 'MODULE_NOT_FOUND';
    throw e;
})();
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$lib$2f$constants$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/esm/lib/constants.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$next$2f$dist$2f$shared$2f$lib$2f$no$2d$fallback$2d$error$2e$external$2e$js__$5b$external$5d$__$28$next$2f$dist$2f$shared$2f$lib$2f$no$2d$fallback$2d$error$2e$external$2e$js$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)");
(()=>{
    const e = new Error("Cannot find module 'next/dist/esm/server/response-cache'");
    e.code = 'MODULE_NOT_FOUND';
    throw e;
})();
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f5b5b2e2e2e$slug$5d5d2f$route$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/app/[[...slug]]/route.ts [app-route] (ecmascript)");
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
// We inject the nextConfigOutput here so that we can use them in the route
// module.
const nextConfigOutput = "";
const routeModule = new AppRouteRouteModule({
    definition: {
        kind: RouteKind.APP_ROUTE,
        page: "/[[...slug]]/route",
        pathname: "/[[...slug]]",
        filename: "route",
        bundlePath: ""
    },
    distDir: ("TURBOPACK compile-time value", ".next/dev") || '',
    relativeProjectDir: ("TURBOPACK compile-time value", "") || '',
    resolvedPagePath: "[project]/src/app/[[...slug]]/route.ts",
    nextConfigOutput,
    // The static import is used for initialization (methods, dynamic, etc.).
    userland: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f5b5b2e2e2e$slug$5d5d2f$route$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__,
    // In Turbopack dev mode, also provide a getter that calls require() on every
    // request. This re-reads from devModuleCache so HMR updates are picked up,
    // and the async wrapper unwraps async-module Promises (ESM-only
    // serverExternalPackages) automatically.
    ...("TURBOPACK compile-time truthy", 1) ? {
        getUserland: ()=>__turbopack_context__.A("[project]/src/app/[[...slug]]/route.ts [app-route] (ecmascript, async loader)")
    } : "TURBOPACK unreachable"
});
// Pull out the exports that we need to expose from the module. This should
// be eliminated when we've moved the other routes to the new format. These
// are used to hook into the route.
const { workAsyncStorage, workUnitAsyncStorage, serverHooks } = routeModule;
function patchFetch() {
    return _patchFetch({
        workAsyncStorage,
        workUnitAsyncStorage
    });
}
;
async function handler(req, res, ctx) {
    if (ctx.requestMeta) {
        setRequestMeta(req, ctx.requestMeta);
    }
    if (routeModule.isDev) {
        addRequestMeta(req, 'devRequestTimingInternalsEnd', process.hrtime.bigint());
    }
    let srcPage = "/[[...slug]]/route";
    // turbopack doesn't normalize `/index` in the page name
    // so we need to to process dynamic routes properly
    // TODO: fix turbopack providing differing value from webpack
    if ("TURBOPACK compile-time truthy", 1) {
        srcPage = srcPage.replace(/\/index$/, '') || '/';
    } else if (srcPage === '/index') {
        // we always normalize /index specifically
        srcPage = '/';
    }
    const multiZoneDraftMode = ("TURBOPACK compile-time value", false);
    const prepareResult = await routeModule.prepare(req, res, {
        srcPage,
        multiZoneDraftMode
    });
    if (!prepareResult) {
        res.statusCode = 400;
        res.end('Bad Request');
        ctx.waitUntil == null ? void 0 : ctx.waitUntil.call(ctx, Promise.resolve());
        return null;
    }
    const { buildId, params, nextConfig, parsedUrl, isDraftMode, prerenderManifest, routerServerContext, isOnDemandRevalidate, revalidateOnlyGenerated, resolvedPathname, clientReferenceManifest, serverActionsManifest } = prepareResult;
    const normalizedSrcPage = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$shared$2f$lib$2f$router$2f$utils$2f$app$2d$paths$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["normalizeAppPath"])(srcPage);
    let isIsr = Boolean(prerenderManifest.dynamicRoutes[normalizedSrcPage] || prerenderManifest.routes[resolvedPathname]);
    const render404 = async ()=>{
        // TODO: should route-module itself handle rendering the 404
        if (routerServerContext == null ? void 0 : routerServerContext.render404) {
            await routerServerContext.render404(req, res, parsedUrl, false);
        } else {
            res.end('This page could not be found');
        }
        return null;
    };
    if (isIsr && !isDraftMode) {
        const isPrerendered = Boolean(prerenderManifest.routes[resolvedPathname]);
        const prerenderInfo = prerenderManifest.dynamicRoutes[normalizedSrcPage];
        if (prerenderInfo) {
            if (prerenderInfo.fallback === false && !isPrerendered) {
                if (nextConfig.adapterPath) {
                    return await render404();
                }
                throw new __TURBOPACK__imported__module__$5b$externals$5d2f$next$2f$dist$2f$shared$2f$lib$2f$no$2d$fallback$2d$error$2e$external$2e$js__$5b$external$5d$__$28$next$2f$dist$2f$shared$2f$lib$2f$no$2d$fallback$2d$error$2e$external$2e$js$2c$__cjs$29$__["NoFallbackError"]();
            }
        }
    }
    let cacheKey = null;
    if (isIsr && !routeModule.isDev && !isDraftMode) {
        cacheKey = resolvedPathname;
        // ensure /index and / is normalized to one key
        cacheKey = cacheKey === '/index' ? '/' : cacheKey;
    }
    const supportsDynamicResponse = routeModule.isDev === true || // If this is not SSG or does not have static paths, then it supports
    // dynamic HTML.
    !isIsr;
    // This is a revalidation request if the request is for a static
    // page and it is not being resumed from a postponed render and
    // it is not a dynamic RSC request then it is a revalidation
    // request.
    const isStaticGeneration = isIsr && !supportsDynamicResponse;
    // Before rendering (which initializes component tree modules), we have to
    // set the reference manifests to our global store so Server Action's
    // encryption util can access to them at the top level of the page module.
    if (serverActionsManifest && clientReferenceManifest) {
        setManifestsSingleton({
            page: srcPage,
            clientReferenceManifest,
            serverActionsManifest
        });
    }
    const method = req.method || 'GET';
    const tracer = getTracer();
    const activeSpan = tracer.getActiveScopeSpan();
    const isWrappedByNextServer = Boolean(routerServerContext == null ? void 0 : routerServerContext.isWrappedByNextServer);
    const isMinimalMode = Boolean(getRequestMeta(req, 'minimalMode'));
    const incrementalCache = getRequestMeta(req, 'incrementalCache') || await routeModule.getIncrementalCache(req, nextConfig, prerenderManifest, isMinimalMode);
    incrementalCache == null ? void 0 : incrementalCache.resetRequestCache();
    globalThis.__incrementalCache = incrementalCache;
    const context = {
        params,
        previewProps: prerenderManifest.preview,
        renderOpts: {
            experimental: {
                authInterrupts: Boolean(nextConfig.experimental.authInterrupts)
            },
            cacheComponents: Boolean(nextConfig.cacheComponents),
            supportsDynamicResponse,
            incrementalCache,
            cacheLifeProfiles: nextConfig.cacheLife,
            waitUntil: ctx.waitUntil,
            onClose: (cb)=>{
                res.on('close', cb);
            },
            onAfterTaskError: undefined,
            onInstrumentationRequestError: (error, _request, errorContext, silenceLog)=>routeModule.onRequestError(req, error, errorContext, silenceLog, routerServerContext)
        },
        sharedContext: {
            buildId
        }
    };
    const nodeNextReq = new NodeNextRequest(req);
    const nodeNextRes = new NodeNextResponse(res);
    const nextReq = NextRequestAdapter.fromNodeNextRequest(nodeNextReq, signalFromNodeResponse(res));
    try {
        let parentSpan;
        const invokeRouteModule = async (span)=>{
            return routeModule.handle(nextReq, context).finally(()=>{
                if (!span) return;
                span.setAttributes({
                    'http.status_code': res.statusCode,
                    'next.rsc': false
                });
                const rootSpanAttributes = tracer.getRootSpanAttributes();
                // We were unable to get attributes, probably OTEL is not enabled
                if (!rootSpanAttributes) {
                    return;
                }
                if (rootSpanAttributes.get('next.span_type') !== BaseServerSpan.handleRequest) {
                    console.warn(`Unexpected root span type '${rootSpanAttributes.get('next.span_type')}'. Please report this Next.js issue https://github.com/vercel/next.js`);
                    return;
                }
                const route = rootSpanAttributes.get('next.route');
                if (route) {
                    const name = `${method} ${route}`;
                    span.setAttributes({
                        'next.route': route,
                        'http.route': route,
                        'next.span_name': name
                    });
                    span.updateName(name);
                    // Propagate http.route to the parent span if one exists (e.g.
                    // a platform-created HTTP span in adapter deployments).
                    if (parentSpan && parentSpan !== span) {
                        parentSpan.setAttribute('http.route', route);
                        parentSpan.updateName(name);
                    }
                } else {
                    span.updateName(`${method} ${srcPage}`);
                }
            });
        };
        const handleResponse = async (currentSpan)=>{
            var _cacheEntry_value;
            const responseGenerator = async ({ previousCacheEntry })=>{
                try {
                    if (!isMinimalMode && isOnDemandRevalidate && revalidateOnlyGenerated && !previousCacheEntry) {
                        res.statusCode = 404;
                        // on-demand revalidate always sets this header
                        res.setHeader('x-nextjs-cache', 'REVALIDATED');
                        res.end('This page could not be found');
                        return null;
                    }
                    const response = await invokeRouteModule(currentSpan);
                    req.fetchMetrics = context.renderOpts.fetchMetrics;
                    let pendingWaitUntil = context.renderOpts.pendingWaitUntil;
                    // Attempt using provided waitUntil if available
                    // if it's not we fallback to sendResponse's handling
                    if (pendingWaitUntil) {
                        if (ctx.waitUntil) {
                            ctx.waitUntil(pendingWaitUntil);
                            pendingWaitUntil = undefined;
                        }
                    }
                    const cacheTags = context.renderOpts.collectedTags;
                    // If the request is for a static response, we can cache it so long
                    // as it's not edge.
                    if (isIsr) {
                        const blob = await response.blob();
                        // Copy the headers from the response.
                        const headers = toNodeOutgoingHttpHeaders(response.headers);
                        if (cacheTags) {
                            headers[__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$lib$2f$constants$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NEXT_CACHE_TAGS_HEADER"]] = cacheTags;
                        }
                        if (!headers['content-type'] && blob.type) {
                            headers['content-type'] = blob.type;
                        }
                        const revalidate = typeof context.renderOpts.collectedRevalidate === 'undefined' || context.renderOpts.collectedRevalidate >= __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$lib$2f$constants$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["INFINITE_CACHE"] ? false : context.renderOpts.collectedRevalidate;
                        const expire = typeof context.renderOpts.collectedExpire === 'undefined' || context.renderOpts.collectedExpire >= __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$lib$2f$constants$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["INFINITE_CACHE"] ? undefined : context.renderOpts.collectedExpire;
                        // Create the cache entry for the response.
                        const cacheEntry = {
                            value: {
                                kind: CachedRouteKind.APP_ROUTE,
                                status: response.status,
                                body: Buffer.from(await blob.arrayBuffer()),
                                headers
                            },
                            cacheControl: {
                                revalidate,
                                expire
                            }
                        };
                        return cacheEntry;
                    } else {
                        // send response without caching if not ISR
                        await sendResponse(nodeNextReq, nodeNextRes, response, context.renderOpts.pendingWaitUntil);
                        return null;
                    }
                } catch (err) {
                    // if this is a background revalidate we need to report
                    // the request error here as it won't be bubbled
                    if (previousCacheEntry == null ? void 0 : previousCacheEntry.isStale) {
                        const silenceLog = false;
                        await routeModule.onRequestError(req, err, {
                            routerKind: 'App Router',
                            routePath: srcPage,
                            routeType: 'route',
                            revalidateReason: getRevalidateReason({
                                isStaticGeneration,
                                isOnDemandRevalidate
                            })
                        }, silenceLog, routerServerContext);
                    }
                    throw err;
                }
            };
            const cacheEntry = await routeModule.handleResponse({
                req,
                nextConfig,
                cacheKey,
                routeKind: RouteKind.APP_ROUTE,
                isFallback: false,
                prerenderManifest,
                isRoutePPREnabled: false,
                isOnDemandRevalidate,
                revalidateOnlyGenerated,
                responseGenerator,
                waitUntil: ctx.waitUntil,
                isMinimalMode
            });
            // we don't create a cacheEntry for ISR
            if (!isIsr) {
                return null;
            }
            if ((cacheEntry == null ? void 0 : (_cacheEntry_value = cacheEntry.value) == null ? void 0 : _cacheEntry_value.kind) !== CachedRouteKind.APP_ROUTE) {
                var _cacheEntry_value1;
                throw Object.defineProperty(new Error(`Invariant: app-route received invalid cache entry ${cacheEntry == null ? void 0 : (_cacheEntry_value1 = cacheEntry.value) == null ? void 0 : _cacheEntry_value1.kind}`), "__NEXT_ERROR_CODE", {
                    value: "E701",
                    enumerable: false,
                    configurable: true
                });
            }
            if (!isMinimalMode) {
                res.setHeader('x-nextjs-cache', isOnDemandRevalidate ? 'REVALIDATED' : cacheEntry.isMiss ? 'MISS' : cacheEntry.isStale ? 'STALE' : 'HIT');
            }
            // Draft mode should never be cached
            if (isDraftMode) {
                res.setHeader('Cache-Control', 'private, no-cache, no-store, max-age=0, must-revalidate');
            }
            const headers = fromNodeOutgoingHttpHeaders(cacheEntry.value.headers);
            if (!(isMinimalMode && isIsr)) {
                headers.delete(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$lib$2f$constants$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NEXT_CACHE_TAGS_HEADER"]);
            }
            // If cache control is already set on the response we don't
            // override it to allow users to customize it via next.config
            if (cacheEntry.cacheControl && !res.getHeader('Cache-Control') && !headers.get('Cache-Control')) {
                headers.set('Cache-Control', getCacheControlHeader(cacheEntry.cacheControl));
            }
            await sendResponse(nodeNextReq, nodeNextRes, new Response(cacheEntry.value.body, {
                headers,
                status: cacheEntry.value.status || 200
            }));
            return null;
        };
        // TODO: activeSpan code path is for when wrapped by
        // next-server can be removed when this is no longer used
        if (isWrappedByNextServer && activeSpan) {
            await handleResponse(activeSpan);
        } else {
            parentSpan = tracer.getActiveScopeSpan();
            await tracer.withPropagatedContext(req.headers, ()=>tracer.trace(BaseServerSpan.handleRequest, {
                    spanName: `${method} ${srcPage}`,
                    kind: SpanKind.SERVER,
                    attributes: {
                        'http.method': method,
                        'http.target': req.url
                    }
                }, handleResponse), undefined, !isWrappedByNextServer);
        }
    } catch (err) {
        if (!(err instanceof __TURBOPACK__imported__module__$5b$externals$5d2f$next$2f$dist$2f$shared$2f$lib$2f$no$2d$fallback$2d$error$2e$external$2e$js__$5b$external$5d$__$28$next$2f$dist$2f$shared$2f$lib$2f$no$2d$fallback$2d$error$2e$external$2e$js$2c$__cjs$29$__["NoFallbackError"])) {
            const silenceLog = false;
            await routeModule.onRequestError(req, err, {
                routerKind: 'App Router',
                routePath: normalizedSrcPage,
                routeType: 'route',
                revalidateReason: getRevalidateReason({
                    isStaticGeneration,
                    isOnDemandRevalidate
                })
            }, silenceLog, routerServerContext);
        }
        // rethrow so that we can handle serving error page
        // If this is during static generation, throw the error again.
        if (isIsr) throw err;
        // Otherwise, send a 500 response.
        await sendResponse(nodeNextReq, nodeNextRes, new Response(null, {
            status: 500
        }));
        return null;
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__0b1.7pw._.js.map