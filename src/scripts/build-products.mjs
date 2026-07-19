#!/usr/bin/env node
/**
 * CLI wrapper around the reusable build logic in ../lib/products-build.mjs.
 *
 * Regenerates products/_index.json from every spec.json on disk.
 * Run via `npm run build:products` (also auto-runs on `predev` / `prebuild`).
 *
 * The same buildProducts() is called at request time by the admin dashboard
 * (src/app/api/admin/portfolio/*) after an item is added or removed.
 */
import { buildProducts } from "../lib/products-build.mjs";

buildProducts().catch((e) => {
  console.error(e);
  process.exit(1);
});
