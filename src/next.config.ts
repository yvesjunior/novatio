import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep the native-ish pg driver out of the bundler; load it at runtime.
  serverExternalPackages: ["pg"],
};

// `/404` is rewritten by `middleware.ts`. We can't use config-level rewrites
// for that path because Next.js prerenders `/404` and serves it from cache,
// which bypasses next.config rewrites. Middleware runs before cache lookup.

export default nextConfig;
