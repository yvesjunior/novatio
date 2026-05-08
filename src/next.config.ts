import type { NextConfig } from "next";

const nextConfig: NextConfig = {};

// `/404` is rewritten by `middleware.ts`. We can't use config-level rewrites
// for that path because Next.js prerenders `/404` and serves it from cache,
// which bypasses next.config rewrites. Middleware runs before cache lookup.

export default nextConfig;
