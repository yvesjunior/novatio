#!/usr/bin/env node
/**
 * Inline `partials/header.html` and `partials/footer.html` into every HTML page
 * under `static_site/archcraft/`.
 *
 * Why: the runtime loader (`partials/components.js`) fetches partials AFTER the
 * HTML parses, which causes a brief unstyled flash. Stamping at build time gives
 * us partial-as-component authoring (single source of truth) without that flash.
 *
 * Idempotent: each inlined block is wrapped in
 *   <!-- partial:NAME -->...<!-- /partial:NAME -->
 * so re-running the script restamps the latest partial content.
 *
 * Run:
 *   node scripts/build-partials.mjs
 * Or automatically before `dev` / `build` via npm `predev` / `prebuild` hooks.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..", "static_site", "archcraft");
const PARTIALS_DIR = path.join(ROOT, "partials");

const PARTIALS = ["header", "footer"];

function makeMarkers(name) {
  return [`<!-- partial:${name} -->`, `<!-- /partial:${name} -->`];
}

async function loadPartials() {
  const out = {};
  for (const name of PARTIALS) {
    const fp = path.join(PARTIALS_DIR, `${name}.html`);
    out[name] = await fs.readFile(fp, "utf-8");
  }
  return out;
}

function replacePartial(html, name, content) {
  const [open, close] = makeMarkers(name);
  const block = `${open}${content}${close}`;

  // 1. If a previously-stamped block exists, swap it for the latest content.
  const blockRe = new RegExp(
    `${escapeReg(open)}[\\s\\S]*?${escapeReg(close)}`,
  );
  if (blockRe.test(html)) {
    return html.replace(blockRe, block);
  }

  // 2. Else, replace the runtime placeholder for the first occurrence.
  const placeholderRe = new RegExp(
    `<div\\s+data-component=["']${name}["']\\s*>\\s*</div>`,
    "i",
  );
  if (placeholderRe.test(html)) {
    return html.replace(placeholderRe, block);
  }

  // 3. Otherwise leave the file alone (page might intentionally lack this partial).
  return html;
}

function escapeReg(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function* walkHtml(dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const fp = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Don't recurse into the partials dir itself.
      if (path.resolve(fp) === path.resolve(PARTIALS_DIR)) continue;
      yield* walkHtml(fp);
    } else if (entry.isFile() && entry.name.endsWith(".html")) {
      yield fp;
    }
  }
}

// Site-wide tags injected into every page (just before </body>).
// Idempotent: bracketed by <!-- inject:NAME --><!-- /inject:NAME -->.
const INJECTIONS = [
  {
    name: "chatbot",
    html: '<script src="/chatbot.js" defer></script>',
  },
];

function applyInjection(html, name, snippet) {
  const open = `<!-- inject:${name} -->`;
  const close = `<!-- /inject:${name} -->`;
  const block = `${open}${snippet}${close}`;
  const re = new RegExp(`${escapeReg(open)}[\\s\\S]*?${escapeReg(close)}`);
  if (re.test(html)) return html.replace(re, block);
  // Insert just before </body>; fall back to end-of-file if no </body>.
  if (html.includes("</body>")) return html.replace("</body>", `${block}</body>`);
  return html + block;
}

async function main() {
  const partials = await loadPartials();
  let touched = 0;
  let scanned = 0;

  for await (const fp of walkHtml(ROOT)) {
    scanned++;
    const before = await fs.readFile(fp, "utf-8");
    let after = before;
    for (const name of PARTIALS) {
      after = replacePartial(after, name, partials[name]);
    }
    for (const inj of INJECTIONS) {
      after = applyInjection(after, inj.name, inj.html);
    }
    if (after !== before) {
      await fs.writeFile(fp, after);
      touched++;
    }
  }

  console.log(
    `[build-partials] scanned ${scanned} HTML files, updated ${touched}`,
  );
}

main().catch((err) => {
  console.error("[build-partials]", err);
  process.exit(1);
});
