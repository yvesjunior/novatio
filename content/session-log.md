# Session log

## 2026-05-07 → 2026-05-08

Big content + structure pass on the site. Final state at end of session.

### Final routable page list (10)
home (`/`), about-us, services, portfolio, contact-us, careers, faq, gallery, error-404 — plus sub-routes `portfolio/crafted-with-passion/` and `portfolio/modern-residential-villa/`.

### Header menu (final)
Home · **Pages ▾** (About Us · Gallery · FAQs · 404 Error) · Services · **Portfolio** · Contact Us.

Removed from earlier menu: Pricing Plan, Our Team (with Team Single), Projects (with Projects 01/02/Single Project), Shop subtree (Wishlist, Cart, Checkout, My account, Product Detail), Blog (renamed to Portfolio).

### Footer (final)
Useful Links: Portfolio · Meet Our Team (→ `/about-us/#design-team`) · Contact Us.
Our Company: About Us · Our Services · Careers (→ `/careers/`).
Removed: "Get in Touch!" sub-heading, "Partners Program" link. "Our Blog" relabeled "Portfolio".

### Page-level changes

**`/services/`** — completely rewritten. Hero updated, 6-card grid trimmed to 3 services (Residential Distribution / Commercial Distribution / Institutional Projects). Iconbox cards removed; carousel relabeled. Tabs section relabeled "How We Work" with 4 steps (Discover & Consultation · Concept & Design · Custom Interior Styling · Logistics and Installation). Headline "From Design to Installation". CTA → `/contact-us/`. English live; French source kept in [`content/services.md`](services.md).

**`/contact-us/`** — Google Maps query updated to `Nicolet+QC`, zoom 11. Old US address replaced with `Nicolet, Québec, Canada`. "Office Hours" widget added (replaced "Call Anytime").

**`/about-us/`** — section anchor `id="design-team"` added. Team trimmed from 4 → 3 members (removed Darlene Robertson). Social-network links removed from team cards (8 `pxl-social--wrap` blocks). VIEW ALL MEMBERS button removed. Testimonials section removed. "Our Website 75000+ VIP Customer" subsection emptied (kept yellow background container shell).

**`/` (home)** — OUR ACHIEVEMENT band restructured: 2 stat cards (Years Experience / Projects Completed) replaced by a single rounded image (`home2-img5.webp`, `border-radius: 10px`, 45% column) next to "Shaping The Future…" headline (55% column). Duplicate cards row removed. The "Get in Touch!" footer eyebrow widget removed. Plus the "Our Website 75000+ VIP Customer" subsection emptied (background container kept).

**`/careers/`** — new page, cloned from error-404 template. Heading "Join Our Team", placeholder description, "Back to Home" button.

### Site-wide contact info (live everywhere)
- Phone: **+1 (819) 448-4524** (bold, wrapped in `<strong>`)
- Hours: Lundi–Vendredi, 8h–18h (rendered at `font-size: 0.7em; opacity: 0.7`)
- Email: `renaud.theroux@overseaimportexports.com`
- Address: Nicolet, Québec, Canada
- Map link: `https://maps.app.goo.gl/...` (footer)

### Infra / routing changes

- **Renamed dir** `static_site/archcraft/home-two/` → `home/`. Updated `app/[[...slug]]/route.ts` and `partials/footer.html` (form action). Required Docker rebuild because `route.ts` is baked into the image (only `static_site/` is volume-mounted).
- **Renamed dir** `static_site/archcraft/404/` → `error-404/`. Created **`src/middleware.ts`** that rewrites `/404` → `/error-404/`. (Next 16 prerenders `/404` and bypasses `next.config.ts` rewrites; middleware runs before cache lookup.)
- All HTML pages and partials **pretty-printed** with `/tmp/pretty_html.py` — lossless (verified by stripped-whitespace diff). Bug fixed: empty block tags like `<h3 class="pxl-empty"></h3>` were getting broken into two lines and CSS rendered the resulting whitespace as a visible bar above footer link lists; collapsed back to single-line form.

### Deleted directories (intentional, on user request)
`product/`, `product/premium-velvet-accent-chair/`, `shop/`, `wishlist/`, `cart/`, `checkout/`, `my-account/`, `projects-01/`, `projects-02/`, `blog/`, `blog-grid/`. Plus the `services2/` and `home2/` draft scratch dirs after promotion.

### Docs created / updated
- [`content/services.md`](services.md) — owner-provided service copy (FR), final locked 3-service set, English Short + Long versions side by side, page narrative draft, decision log.
- [`src/CLAUDE.md`](../src/CLAUDE.md) — updated directory tree, page count, navigation listing, Docker live-mount gotcha section, what's been ripped out.
- [`src/README.md`](../src/README.md) — directory tree updated.
- [`src/tests/visual.spec.ts`](../src/tests/visual.spec.ts) — `/blog-grid/` route swapped for `/portfolio/`. Old screenshot baselines for `/blog-grid/` are stale and need `npm run test:visual:update` to regenerate.

### Pending / not done

- **97 unused images, 9.6 MB** in `wp-content/uploads/` — surfaced but NOT deleted. Biggest groups: `shop/` (47 files), `_shared/` (26), `home-three/` (8 — full unused template), `home-two/Home-Three.webp` and `home2-img1.png` (1.9 MB each). Decision pending.
- **Language strategy** — services has English live + French source; rest of site is English. Bilingual? FR-only? Not decided.
- **Online configurator URL** — currently `#` placeholder in services CTA copy. Awaits real URL.
- **`wp-content/uploads/extracted/home-two/` asset folder** — 52 internal `<link>`/`<script>` references still use the old `home-two` prefix in `home/index.html`. Coordinated rename would be invasive; left as-is.
- **Visual baseline screenshots** stale for `/blog-grid/` (route deleted from test list, but old `__screenshots__/*__blog-grid*.png` baselines still exist).

### Project-specific gotchas (reminders for next session)

- `home/index.html` carries **its own embedded copy of the menu** — `npm run build:partials` does NOT update it. When changing nav, edit `partials/header.html` AND apply the same change to `home/index.html` separately.
- Editing **`route.ts`** or anything outside `static_site/` requires `docker compose up -d --build` to take effect (only `static_site/` is volume-mounted).
- The catch-all handler returns 9-byte plain "Not Found" for unknown paths. The custom 404 design is at `/error-404/` and is also served at `/404` via middleware.
- Dead WordPress tooling endpoints are stubbed in `route.ts` (CF7 schema, woosw AJAX, shared-frontend-handlers JS). Any new console 404 noise → check whether more stubs are needed.
