# CLAUDE.md

Notes for any Claude Code session on this project. Read this first.

---

## TL;DR

A Next.js 16 app that **serves a scraped WordPress + Elementor site** (Novatio demo) verbatim. Every URL is mapped through a single catch-all route handler to the corresponding `index.html` under `static_site/archcraft/<slug>/index.html`. **No React components render the pages today.** Visual parity with the legacy demo is the contract.

The demo this was scraped from: <https://demo.casethemes.net/archcraft/>.

---

## The hard-won rule: visual parity is the contract

> **The end output (what the user sees in the browser) must not visibly change unless explicitly requested.** Layout, typography, colors, spacing, imagery, and animations all stay the same.

A previous attempt to "graduate" everything to idiomatic React + Tailwind was rolled back because the rebuild drifted visually. **Don't suggest or attempt that again unless the user explicitly opts in to specific routes.** The graduation path exists per-route (see [Graduating a page to React](#graduating-a-page-to-react)) but is opt-in.

If you're considering a change that would alter pixels, **stop and ask first**.

---

## Architecture

The Next.js app's "project root" is `src/` — `package.json`, `node_modules/`, all configs, and all source live there. The repo root holds only `infra/` (Dockerfile), `docker-compose.yml`, `.env`, and `src/`. **All paths below are relative to `src/`** unless otherwise noted.

```
<repo-root>/
├── docker-compose.yml         compose orchestrates the web service
├── .env                       WEB_PORT, lead-notification keys, etc.
├── infra/web/Dockerfile       multi-stage Node 22 alpine build
└── src/                       app root
    ├── app/
    │   ├── [[...slug]]/route.ts    ← the only "real" code: catch-all GET/POST handler
    │   ├── api/lead/route.ts       ← lead-qualification POST endpoint
    │   ├── layout.tsx              ← minimal <html><body> wrapper
    │   └── globals.css             ← single @import "tailwindcss"
    ├── scripts/
    │   └── build-partials.mjs      ← stamps partials into HTML at build time
    ├── public/
    │   ├── chatbot.js              ← floating lead-qual widget
    │   └── wp-content              ← symlink → ../static_site/archcraft/wp-content
    ├── static_site/archcraft/
    │   ├── partials/{header,footer}.html   ← single source of truth for shared chrome
    │   ├── home-two/index.html             ← served at /
    │   ├── about-us/, contact-us/, ...     ← 26 routable pages, one per dir
    │   ├── wp-content/                     ← Elementor + plugin + theme CSS / JS / uploads
    │   └── wp-includes/                    ← WordPress core JS (jQuery, etc.)
    ├── tests/
    │   └── visual.spec.ts          ← 6 routes × 3 viewports = 18 baseline screenshots
    └── playwright.config.ts        ← chromium, port 3001, 0.5% pixel-diff tolerance
```

**Request flow:**
1. Browser hits `/about-us/` (etc.).
2. `/wp-content/*` resolves directly via the `public/wp-content` symlink (Next serves these as-is, no handler invocation).
3. Everything else hits `[[...slug]]/route.ts` which reads `static_site/archcraft/about-us/index.html` and returns it verbatim.
4. The handler also stubs three legacy XHR endpoints (CF7 schema, woosw AJAX, an Elementor bundle) to silence dead-plugin 404s.
5. Header / footer markup is already inlined into the HTML by `scripts/build-partials.mjs` (runs on `predev` / `prebuild`).

---

## Common tasks

### Run the project

**Local (host)** — npm/Node have to be invoked from `src/`:

```bash
cd src
npm install          # first time only
npm run dev          # Next.js on :3000 (predev re-stamps partials)
```

**Docker (production-style)** — run from the repo root:

```bash
docker compose up -d --build
# App on http://localhost:${WEB_PORT}/  (default WEB_PORT=3001 from .env)
docker compose logs -f web
docker compose down
```

The Dockerfile is at [`infra/web/Dockerfile`](../infra/web/Dockerfile); compose context is the repo root, so it can `COPY src/`. Env vars come from the root `.env` via `env_file:` (compose injects them at runtime — they're never baked into the image).

Don't bother spinning up a separate static reference server — there is no separate reference anymore. Next serves the same HTML. If you need to compare against the live demo, open <https://demo.casethemes.net/archcraft/> in another tab.

### Edit shared header / footer

```
static_site/archcraft/partials/header.html
static_site/archcraft/partials/footer.html
```

These are the source of truth. After editing, `npm run build:partials` stamps them into all 26 HTML pages (also auto-runs via `npm run dev` and `npm run build`). The script is idempotent — wraps inlined content in `<!-- partial:NAME -->...<!-- /partial:NAME -->` so re-runs swap the latest content.

> The home page's `<header>` is intentionally NOT a partial — it's a unique transparent variant only used on `/`. The footer IS a partial everywhere including the home page.

### Edit a single page

`static_site/archcraft/<route>/index.html`. The HTML is one giant line per file (auto-generated by WordPress) — **don't hand-edit**, use Python regex scripts. Pattern that's worked many times:

```bash
python3 << 'EOF'
import re
with open('static_site/archcraft/<route>/index.html') as f: c = f.read()
c = re.sub(r'<old-pattern>', '<new>', c, flags=re.DOTALL)
with open('static_site/archcraft/<route>/index.html', 'w') as f: f.write(c)
EOF
```

### Verify changes

```bash
npm run test:visual          # diff against baselines (~7s)
npm run test:visual:update   # accept current output as new baseline
```

The Playwright config auto-starts a Next dev server on `:3001` for testing. Tests compare 6 routes × 3 viewports.

### Graduating a page to React

When a single route genuinely needs interactivity that the legacy markup can't deliver:

1. Create `src/app/<route>/page.tsx`.
2. Next.js routes to it instead of the catch-all (longer-specific routes win).
3. Build that route's UI in JSX. Take screenshots before/after — **ensure visual parity with the previous output**.
4. Update the relevant Playwright baseline.

Don't graduate routes preemptively. Don't graduate "to clean things up". Wait for a real reason.

---

## What was ripped out (do not re-add)

The legacy WordPress site shipped with hundreds of plugin assets that did nothing visible because their backends don't exist locally. We stripped:

- ~391 `<script src=...>` tags for WooCommerce frontend, woo-smart-compare/quick-view, contact-form-7, and woosw plugin code.
- ~329 `<link rel=stylesheet>` tags for the same plugins.
- ~208 inline `<script id="...-extra">` config blocks tied to those plugins.
- 101 orphan `<div class="woosc-popup ...">` and `woosw-area` blocks that became visible once their JS was gone.
- The "Buy on Envato" overlay (`.pxl-buy-now` anchor).
- 5 standalone JS bundles (woosc/woosq/woosw frontends, contact-form-7, swv).
- All `demo.casethemes.net` references (oEmbed link tags + 13 `url()` references in Elementor CSS).
- The runtime partial loader (`partials/components.js`) — superseded by build-time inlining.

**These removals are gated by visual tests** — every removal was confirmed to leave pixels unchanged.

If your task involves adding back any of:
- WooCommerce shop functionality
- Real contact form / newsletter submission
- A wishlist or product comparison feature

…you'll need a real backend, and you should ask the user before touching the catch-all approach.

---

## Lead-qualification chatbot

A floating chat widget on every page. Source of truth:
- [`public/chatbot.js`](public/chatbot.js) — vanilla JS widget, scripted Q&A, classifier
- [`src/app/api/lead/route.ts`](src/app/api/lead/route.ts) — POST endpoint, persists to `leads.json`, fans out to enabled notification channels
- [`scripts/build-partials.mjs`](scripts/build-partials.mjs) — injects `<script src="/chatbot.js" defer>` into every HTML page (idempotent, wrapped in `<!-- inject:chatbot -->...<!-- /inject:chatbot -->` markers)

To add a new question, edit the `FLOW` array in `chatbot.js`. To change classification rules, edit the `classify()` function. To add a notification channel (Slack, Resend, generic webhook are already there), copy one of the existing `notifyX` functions in `route.ts`.

When testing the bot, leads land in `leads.json` next to wherever the Node process runs from — `src/leads.json` for local dev, `/app/leads.json` inside the container (gitignored either way). Delete that file between test runs to start fresh.

## Stubbed endpoints

`src/app/[[...slug]]/route.ts` returns 200s for these dead-but-still-pinged endpoints:

| Path | Stub response |
|---|---|
| `GET /wp-content/.../shared-frontend-handlers.<hash>.bundle.min.js` | empty JS comment (real file at that path also exists with the same content) |
| `GET /wp-json/contact-form-7/v1/contact-forms/*/feedback/schema` | `{}` |
| `POST /?wc-ajax=*` | `{success:true,data:""}` |

If you see new 404 noise in the browser console, check whether more endpoints need stubs.

---

## Known intentional gaps

- WooCommerce pages render demo content but **no backend** (no real cart persistence, payment, etc.).
- Newsletter and contact forms POST to `#` — the visual is preserved but submissions go nowhere.
- `Squada One` font is referenced in legacy CSS but never loaded — falls back to Albert Sans (matches demo behavior).
- A few WordPress assets were missing on the demo we scraped from too; those are stripped (no visible breakage).

---

## What NOT to do

1. **Don't propose an idiomatic React + Tailwind rebuild of the whole site.** It's been tried twice. The user explicitly chose the catch-all approach for visual fidelity. Per-route graduation only, on demand.
2. **Don't hand-edit the WordPress HTML files** — they're one massive line, auto-generated. Use Python regex and verify with visual tests.
3. **Don't add CI/CD or deployment configs** unless asked. The user prefers manual control here.
4. **Don't introduce new dependencies** unless the user says yes. Tailwind v4 is installed but unused — leave it. lucide-react is installed but unused — leave it.
5. **Don't touch `wp-content/uploads/`** to "optimize" images. The visual contract requires the same images at the same dimensions.
6. **Don't commit changes** unless the user explicitly asks (per the global Claude Code instructions).
7. **Don't suggest deleting `static_site/`** — it's the source of truth for every page rendered.

---

## Useful greps / one-liners

Find every reference to an asset:
```bash
grep -rln "<file-pattern>" static_site/archcraft/ --include="*.html" --include="*.css" --include="*.js"
```

Find pages that reference a specific class:
```bash
grep -l 'class-name' static_site/archcraft/*/index.html
```

Strip a script tag across all pages:
```python
import os, re
ROOT = 'static_site/archcraft'
pat = re.compile(r'<script[^>]+<unique-substring>[^>]*></script>')
for dp, _, fs in os.walk(ROOT):
    for f in fs:
        if not f.endswith('.html'): continue
        fp = os.path.join(dp, f)
        c = open(fp).read()
        new, n = pat.subn('', c)
        if n: open(fp, 'w').write(new)
```

Re-fetch a missing asset from the live demo:
```python
import urllib.request
url = 'https://demo.casethemes.net/archcraft/wp-content/uploads/...'
data = urllib.request.urlopen(url, timeout=20).read()
open('static_site/archcraft/wp-content/uploads/...', 'wb').write(data)
```

After any HTML change, **always run `npm run test:visual`** before declaring done.

---

## Session-end checklist

When wrapping up a session, verify:

- [ ] `npx tsc --noEmit` clean
- [ ] `npm run lint` clean
- [ ] `npm run test:visual` 18/18 pass (or baselines deliberately updated and explained)
- [ ] No new console errors / 404s introduced (check browser DevTools or the Playwright traces)
- [ ] If partials changed: `npm run build:partials` ran successfully
- [ ] User explicitly asked to commit before any `git commit` was run
