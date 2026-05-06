module.exports = [
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
(()=>{
    const e = new Error("Cannot find module 'next/dist/esm/shared/lib/router/utils/app-paths'");
    e.code = 'MODULE_NOT_FOUND';
    throw e;
})();
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
(()=>{
    const e = new Error("Cannot find module 'next/dist/esm/lib/constants'");
    e.code = 'MODULE_NOT_FOUND';
    throw e;
})();
(()=>{
    const e = new Error("Cannot find module 'next/dist/esm/shared/lib/no-fallback-error.external'");
    e.code = 'MODULE_NOT_FOUND';
    throw e;
})();
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
    const normalizedSrcPage = normalizeAppPath(srcPage);
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
                throw new NoFallbackError();
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
                            headers[NEXT_CACHE_TAGS_HEADER] = cacheTags;
                        }
                        if (!headers['content-type'] && blob.type) {
                            headers['content-type'] = blob.type;
                        }
                        const revalidate = typeof context.renderOpts.collectedRevalidate === 'undefined' || context.renderOpts.collectedRevalidate >= INFINITE_CACHE ? false : context.renderOpts.collectedRevalidate;
                        const expire = typeof context.renderOpts.collectedExpire === 'undefined' || context.renderOpts.collectedExpire >= INFINITE_CACHE ? undefined : context.renderOpts.collectedExpire;
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
                headers.delete(NEXT_CACHE_TAGS_HEADER);
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
        if (!(err instanceof NoFallbackError)) {
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

//# sourceMappingURL=%5Broot-of-the-server%5D__0nrhr7f._.js.map