# Next.js Rebuild Plan

This plan is the source of truth for porting the ArchCraft static site under
[`static_site/demo.casethemes.net/archcraft/`](static_site/demo.casethemes.net/archcraft/) into a real Next.js + React app
under [`src/app/`](src/app/). It is written to be followed across multiple sessions —
each phase is self-contained and verifiable. **Always update the checkboxes
below as work lands so the next session knows where to pick up.**

---

## 0. Approach (revised) & non-goals

> **The original Phase 2 (idiomatic React rebuild) drifted visually from the demo and was rolled back.** We're now on the **Quick port** approach: Next.js routes serve the existing static HTML files unmodified, so visuals are 1:1 with the legacy site.

**How this version works**
- A single catch-all route handler at [`src/app/[[...slug]]/route.ts`](src/app/[[...slug]]/route.ts) reads HTML files from `static_site/demo.casethemes.net/archcraft/<slug>/index.html` and serves them verbatim.
- `/` maps to `home-two/index.html` (the previous home).
- All `/wp-content/*` static assets resolve via the `public/wp-content` symlink (Next serves them directly without hitting the route handler).
- Header / footer / partials still live in `static_site/.../partials/` and are loaded client-side as before.
- React components are NOT involved in rendering pages today. The Next.js app is, at this point, a thin wrapper that gives us routing + build + future-extension surface area.

**Goals — in priority order**
1. **Visual & behavioral parity** with the live demo. Same markup → same pixels.
2. Routes go through Next.js so we have a real Next app for future per-page React enhancements.
3. Incremental migration: each individual page can later be replaced with a proper React page component (overrides the catch-all) when there's a real reason to.

**Non-goals**
- A full idiomatic React/Tailwind rebuild of every page (rolled back; design parity matters more right now).
- Replicating Elementor's editor or its JSON schema.
- Implementing real WooCommerce backends.
- Server-side data fetching (CMS, DB).
- Performance work that changes visible output.

---

## 1. Decisions (locked in)

| Topic | Choice | Reason |
|---|---|---|
| Framework | Next.js 16 (already installed) — App Router, RSC by default | Already in `package.json` |
| Language | TypeScript | Already configured |
| Styling | **Existing CSS bundles from `static_site/`** (Elementor, theme, plugin CSS as-shipped). Tailwind v4 is installed but unused for the app today — leave it for future per-page rebuilds. | Quick-port keeps the legacy CSS pipeline untouched so visuals match exactly |
| Routing | App Router. **Single catch-all route handler** at `src/app/[[...slug]]/route.ts`. No per-page `page.tsx` files — Next is a passthrough. | Lets every URL resolve to the legacy HTML without per-route boilerplate |
| Static assets | `public/wp-content` is a symlink to `static_site/.../wp-content`. The route handler resolves HTML; Next's static handling resolves everything under `wp-content/`. | Zero copying, no path rewriting in HTML |
| Theme JS libs (stellar, swiper, jQuery, etc.) | **Keep as-is.** They're already loaded by the legacy HTML and they make the visuals work. | Same reason — visual parity |
| Forms | Forms POST to nothing (the demo does too). | No regression |
| Per-page React enhancements | Add a normal `src/app/<route>/page.tsx` whenever a specific page needs to graduate to a React component. The catch-all only matches if nothing more specific does, so a real page.tsx wins automatically. | Incremental migration path |

---

## 2. Reference artifacts to keep open while rebuilding

| What | Where | Why |
|---|---|---|
| Live home page (visual ground truth) | `static_site/demo.casethemes.net/archcraft/home-two/index.html` | The exact rendered output we're matching |
| Inner-page header partial | `static_site/.../partials/header.html` | Shows full menu structure, mega-menu, dropdowns |
| Footer partial | `static_site/.../partials/footer.html` | Shows newsletter, link columns, copyright pill |
| Color/spacing tokens | Inline `<style>` in `home-two/index.html` (search `body{` and `:root{`) | Source of truth for design tokens |
| Working dev preview | `npx serve static_site/demo.casethemes.net/archcraft -l 3000` (already configured in `.claude/launch.json`) | Side-by-side comparison while rebuilding |

---

## 3. Phased plan

Each phase ends in a verifiable state. Don't start the next phase until the current one's "Done when" condition is met.

### Phase 0 — Pre-flight ☑ (done)
- [x] Read `home-two/index.html` and skim `partials/{header,footer}.html` to internalize the visual target.
- [x] Inventory inline styles: extract design tokens (colors, font sizes, spacing) — see [§7](#7-design-tokens) for results.
- [x] Static-server URL for visual diffing: `http://localhost:3000` (managed by `.claude/launch.json` profile `static`). Will run Next dev on `:3001` during rebuild.

**Done when:** A short token list exists (can live at the bottom of this file, see [§7](#7-design-tokens)). ✓

---

### Phase 1 — Foundation ☒ (rolled back — see status log)
Goal: Next.js app boots with Tailwind tokens + fonts + base layout. No real content yet.

- [x] **Migrate static assets** — symlinked `public/wp-content` → `static_site/.../wp-content` so existing `/wp-content/...` paths resolve under Next dev too. (No copy yet; can promote to a real copy or keep the symlink.)
- [x] **Tailwind theme** — Tailwind v4 uses `@theme` in CSS. Tokens registered in [`src/app/globals.css`](src/app/globals.css). `tailwind.config.ts` not needed.
- [x] **`src/lib/tokens.ts`** — TS mirror of the same tokens for use in component code.
- [x] **`src/app/layout.tsx`** — `next/font/google` Albert Sans (weights 400/500/600/700/900) + Header/Footer placeholders + `<main>` wrap.
- [x] **`src/app/page.tsx`** — replaced redirect with a stub showing the design tokens.
- [x] **`src/app/globals.css`** — `@theme` block + base resets.
- [x] **`.claude/launch.json`** — added `next` config (port 3001) for side-by-side preview with `static` (port 3000).

**Done when:** `npm run dev` shows a styled blank page at `/` with header/footer stubs and the right fonts. ✓ Verified at `http://localhost:3001/` — Albert Sans loaded, brand `#CAA05C` rendering, no console errors.

---

### Phase 2 — Layout components ☒ (rolled back — see status log)
Goal: Reusable `<Header />` and `<Footer />` that visually match the inner-page demo.

- [x] **[`src/components/layout/Header.tsx`](src/components/layout/Header.tsx)** — server component using a client `<MainNav />` child for usePathname active state.
  - [x] Logo (link to `/`)
  - [x] Primary nav: Home / Pages / Services / Blog / Contact Us
  - [x] "Pages" mega-menu (3 columns), "Services" / "Blog" simple dropdowns — all CSS hover/focus-within (no JS state needed for desktop)
  - [x] Right-side: phone block, GET A QUOTE button, search icon, sidebar/grid icon
  - [x] Active state via `<NavLink />` + `usePathname()` (`aria-current="page"` + gold accent)
  - [x] Sticky header (`position: sticky`, top:0)
  - [x] Mobile hamburger drawer in [`MobileNav.tsx`](src/components/layout/MobileNav.tsx)
- [x] **[`src/components/layout/Footer.tsx`](src/components/layout/Footer.tsx)** — server component
  - [x] Gold newsletter card with email + Subscribe button (form action="#" stub for now)
  - [x] 4-column links grid: logo+blurb / Pages / Services / Blog (sourced from `FOOTER_COLUMNS` in nav.ts)
  - [x] Big "ARCHCRAFT" wordmark
  - [x] Floating "© 2026 Case-Themes – ArchCraft" pill at bottom edge, real CSS centering (no Elementor `--e-con-transform-translateX` hack needed)
- [x] **[`src/components/layout/PageTitle.tsx`](src/components/layout/PageTitle.tsx)** — server component
  - [x] `title` + optional `breadcrumb` props
  - [x] Background image with dark overlay; defaults to `/wp-content/uploads/2026/03/pagetitle.webp`
- [x] **[`src/components/ui/Button.tsx`](src/components/ui/Button.tsx)** — `primary` / `secondary` / `outline` / `ghost` variants × `sm` / `md` / `lg` sizes; renders as `<Link>` if `href` is set else `<button>`
- [x] **[`src/components/ui/Container.tsx`](src/components/ui/Container.tsx)** — `sm` (1076px) / `md` (1296px) / `lg` (1530px) / `xl` (1856px) sizes
- [x] **[`src/components/ui/Logo.tsx`](src/components/ui/Logo.tsx)** — light/dark variants pointing at the existing PNG logos
- [x] **[`src/lib/nav.ts`](src/lib/nav.ts)** — single source of truth for `MAIN_NAV` and `FOOTER_COLUMNS`
- [x] **[`src/components/layout/NavLink.tsx`](src/components/layout/NavLink.tsx)** — client wrapper around `next/link` with active-state via `usePathname()`
- [x] **[`src/lib/cn.ts`](src/lib/cn.ts)** — tiny className combiner

**Done when:** Visiting any route renders the proper header + footer and at least the home page route + one stub inner page (`/_test`) work end-to-end. ✓ Verified on `/` — header height 96px (matches demo's 95), gold CTA `#CAA05C`, footer 1099px tall with newsletter + 4 link columns + ARCHCRAFT wordmark + centered copyright pill, no console/server errors.

---

### Phase 3 — Home page ☐
Goal: `/` (i.e. `src/app/page.tsx`) matches `home-two/index.html` visually.

Build sections in this order. Each is a component under `src/components/sections/`:

- [ ] **`Hero`** — full-bleed background image, large heading "Shaping Architecture With Vision & Innovation", subtitle, two CTAs ("EXPLORE MORE" gold, "START PROJECTS" white), avatar stack on right side, stats card (1.0k+ Client Satisfaction)
- [ ] **`HeroPillNav`** — the floating dark pill with Home / Pages / Services / Blog / Contact Us. Same dropdown behavior as the header. **This is unique to the home page.**
- [ ] **`AboutSection`** — 2-column intro with image
- [ ] **`ServicesShowcase`** — grid of service cards
- [ ] **`PortfolioShowcase`** — masonry-ish portfolio grid
- [ ] **`StatsBar`** — counter stats
- [ ] **`PartnersBar`** — logo strip
- [ ] **`BlogShowcase`** — 3 latest blog cards
- [ ] **`CtaSection`** — "Ready to start?" full-width banner
- [ ] **Newsletter** — already in footer, but home page might have an inline variant (check the demo)

For each section: hard-code content in `src/content/home.ts` and import. No CMS.

**Done when:** `/` renders all sections in the right order, top-to-bottom diff against the demo screenshot is acceptable (allow some animation/parallax drift).

---

### Phase 4 — Inner pages ☐
Each inner page reuses `<PageTitle />` then renders page-specific content. Build in this priority order — earlier ones unblock common patterns:

| # | Route | File | Source content |
|---|---|---|---|
| 1 | `/contact-us` | `src/app/contact-us/page.tsx` | `static_site/.../contact-us/index.html` — extract heading, contact info blocks, form fields |
| 2 | `/about-us` | `src/app/about-us/page.tsx` | `static_site/.../about-us/index.html` |
| 3 | `/services` (list) | `src/app/services/page.tsx` | `static_site/.../services/index.html` |
| 4 | `/service/[slug]` | `src/app/service/[slug]/page.tsx` | `static_site/.../service/furniture-fixture-selection/index.html` is the only known instance |
| 5 | `/our-team` | `src/app/our-team/page.tsx` | `static_site/.../our-team/index.html` |
| 6 | `/team-single` | `src/app/team-single/page.tsx` | `static_site/.../team-single/index.html` |
| 7 | `/blog` and `/blog-grid` | `src/app/blog/page.tsx`, `src/app/blog-grid/page.tsx` | List pages — generate from a `src/content/blog.ts` array |
| 8 | `/blog/[slug]` | `src/app/blog/[slug]/page.tsx` | Sample post: `static_site/.../10-interior-design-trends.../index.html` |
| 9 | `/pricing-plan` | `src/app/pricing-plan/page.tsx` | `static_site/.../pricing-plan/index.html` |
| 10 | `/gallery` | `src/app/gallery/page.tsx` | `static_site/.../gallery/index.html` |
| 11 | `/faq` | `src/app/faq/page.tsx` | Accordion list — `static_site/.../faq/index.html` |
| 12 | `/portfolio/[slug]` | `src/app/portfolio/[slug]/page.tsx` | Two known: `modern-residential-villa`, `crafted-with-passion` |
| 13 | `/projects-01`, `/projects-02` | similar | |
| 14 | `/home-three` (alt home) | similar to home but different sections | |
| 15 | `/home-two-onepage` | one-pager scrolly version of home — defer if low priority |
| 16 | WooCommerce stubs: `/shop`, `/cart`, `/checkout`, `/my-account`, `/wishlist`, `/product/[slug]` | Visual stubs only. Tag them as "non-functional demo" inline. |
| 17 | `not-found.tsx` (root) | `src/app/not-found.tsx` | Use the astronaut illustration from `/uploads/themes/.../404-image.webp` |

**Build pattern for each page:**
1. Read the source HTML, identify section components needed
2. Reuse existing components from `src/components/sections/` where possible; create new ones in the same dir if the pattern is reusable
3. Hard-code the page's text in `src/content/<page>.ts`
4. The page file itself stays thin: `<PageTitle /> + <SectionA /> + <SectionB /> + ...`

**Done when:** Every menu item in the header navigates to a real Next.js route that renders without console errors.

---

### Phase 5 — Polish & cleanup ☐
- [ ] **Visual diff pass** — compare every route side-by-side with the static site, file issues for drift
- [ ] **Mobile pass** — every page works at 375px wide
- [ ] **Lighthouse pass** — aim for 90+ on Performance, Accessibility, Best Practices, SEO on the home page
- [ ] **Dead code removal**
  - [ ] Delete `static_site/` once parity is reached and the user confirms
  - [ ] Delete `serve.json`, remove the `static` entry from `.claude/launch.json`
  - [ ] Remove the `redirect` import from any leftover code
- [ ] **`README.md`** — describe how to run dev, build, where content lives, and what's intentionally fake (WooCommerce stubs)
- [ ] **`package.json` scripts** — verify `dev`, `build`, `start`, `lint` all pass

**Done when:** `npm run build` succeeds with zero warnings, `npm run dev` shows the full site, and `static_site/` is gone (or explicitly kept as reference with a note).

---

## 4. File-tree target

```
src/
  app/
    layout.tsx
    page.tsx                      ← home
    globals.css
    not-found.tsx                 ← 404 page
    about-us/page.tsx
    blog/
      page.tsx                    ← blog list
      [slug]/page.tsx             ← blog post
    blog-grid/page.tsx
    cart/page.tsx
    checkout/page.tsx
    contact-us/page.tsx
    faq/page.tsx
    gallery/page.tsx
    home-three/page.tsx
    home-two/page.tsx             ← optional alias of /
    home-two-onepage/page.tsx
    my-account/page.tsx
    our-team/page.tsx
    portfolio/[slug]/page.tsx
    pricing-plan/page.tsx
    product/[slug]/page.tsx
    projects-01/page.tsx
    projects-02/page.tsx
    service/[slug]/page.tsx
    services/page.tsx
    shop/page.tsx
    team-single/page.tsx
    wishlist/page.tsx
  components/
    layout/
      Header.tsx
      Footer.tsx
      MegaMenu.tsx                ← client
      MobileNav.tsx               ← client
      PageTitle.tsx
    sections/
      Hero.tsx
      HeroPillNav.tsx             ← client (dropdown interactivity)
      AboutSection.tsx
      ServicesShowcase.tsx
      PortfolioShowcase.tsx
      StatsBar.tsx
      PartnersBar.tsx
      BlogShowcase.tsx
      CtaSection.tsx
      Newsletter.tsx
      Faq.tsx                     ← client (accordion)
      ContactForm.tsx             ← client (form state)
      TeamGrid.tsx
      Pricing.tsx
    ui/
      Button.tsx
      Container.tsx
      Card.tsx
      Logo.tsx
  content/
    home.ts
    about.ts
    services.ts
    blog.ts                       ← exports a list of posts; blog/[slug] reads from here
    portfolio.ts
    team.ts
    faq.ts
    pricing.ts
  lib/
    nav.ts                        ← single source of truth for menu structure
    cn.ts                         ← classNames helper if needed
public/
  uploads/                        ← from static_site/.../wp-content/uploads/
  brand/
    logo-light.svg
    logo-dark.svg
    404-image.webp
```

---

## 5. Conventions

- **The visual output is frozen.** This is a code refactor, not a redesign. Don't "improve" the look, don't drop animations, don't simplify layouts that look complex. If the old version had it, the new version has it.
- **Server components by default.** Only mark `'use client'` when an interaction (state, effect, event handler) actually requires it.
- **Content lives in `src/content/`** as plain TS objects. Each page imports what it needs. This keeps content separable for a future CMS migration without rewriting components.
- **Single source for nav.** `src/lib/nav.ts` exports `MAIN_NAV` and `FOOTER_NAV` arrays. Header, Footer, MobileNav, and HeroPillNav all consume these — no duplicating links.
- **Tailwind first.** If the same combination of classes shows up 3+ times, extract a component, not a `@apply`.
- **No magic strings for routes.** Optional but ideal: a `routes.ts` with `routes.aboutUs = '/about-us'` etc., consumed via `<Link href={routes.aboutUs}>`.
- **No `dangerouslySetInnerHTML`.** That defeats the rebuild's purpose. If a section is genuinely too complex to port, leave it as a TODO and rebuild it manually.
- **Don't import from `static_site/`** anywhere in `src/`. The static site is reference-only.

---

## 6. Anti-patterns (don't do these)

- Don't recreate Elementor's `--width`, `--display`, `--padding-*` CSS variables — they exist because of Elementor's runtime, not because the design needs them.
- Don't load jQuery, Stellar, Swiper-as-jQuery, or any of the WP plugins. Carousels via Embla; parallax via plain CSS or `IntersectionObserver`; popups via Radix or hand-rolled.
- Don't ship `wp-content/plugins/woocommerce/*` styles — there's no WooCommerce.
- Don't reuse the inline 12-block `<style>` from the WP HTML; rebuild styles in Tailwind.
- Don't keep `*.webp` files >500KB unoptimized; reprocess them with `sharp` if they're below-the-fold.

---

## 7. Design tokens

Mined from the home page CSS (`home-two/index.html` + its 39 linked stylesheets, ~3.9 MB of CSS) during Phase 0. Counts in comments are how many declarations referenced each value, which signals importance.

```ts
// src/lib/tokens.ts — single source of truth for design constants.
// These mirror what's in tailwind.config.ts and globals.css.

export const tokens = {
  colors: {
    // Brand palette
    brand:       '#CAA05C',  // gold — primary accent (×34 in CSS)
    brandDark:   '#1C1C1D',  // primary dark — header bg, body text (×23)
    bgLight:     '#F6F6F6',  // light gray bg behind cards (×33)
    bgWhite:     '#FFFFFF',  // pure white surfaces (×639)

    // Text
    textBody:    '#515151',  // body paragraph text (×10)
    textMuted:   '#767676',  // captions, dimmed text (×13)
    textDark:    '#222222',  // alt body text (×28)

    // Borders / dividers
    borderLight: '#EBEBEB',  // common border color (×54)
    borderMid:   '#D9D9D9',  // mid-tone border (×21)
    borderDark:  '#E5E5E5',  // pale dividers (×12)
  },

  fonts: {
    // The demo uses ONE typeface for everything. Squada One was referenced in
    // some legacy rules but never actually loaded; we don't need it.
    sans: '"Albert Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    // Icon fonts — load via font-awesome / bootstrap-icons CSS, no need to expose as tokens
  },

  // Type scale — keys are the rendered px size; values describe the role.
  // Use as Tailwind extensions: e.g. text-h1 = text-[60px].
  fontSize: {
    xs:    '12px',  // small labels (×23)
    sm:    '14px',  // captions, secondary text (×91)
    md:    '15px',  // form labels (×82)
    base:  '16px',  // base body (×161, most-used)
    lg:    '18px',  // large body, menu links (×100)
    xl:    '20px',  // emphasis body (×126)
    h6:    '22px',
    h5:    '24px',  // small headings (×78)
    h4:    '32px',  // section subheadings (×17)
    h3:    '40px',  // section headings (×12)
    h2:    '48px',  // page-title hero (×6)
    h1:    '60px',  // hero headlines (×16)
    display: '100px', // oversized display text (×6)
  },

  fontWeight: {
    normal:    400, // (×169)
    medium:    500, // (×153) — menu, buttons
    semibold:  600, // (×104)
    bold:      700, // (×78) — headings
    black:     900, // (×17) — display
  },

  lineHeight: {
    tight:   1,    // display headings
    snug:    1.2,  // headings (×62)
    normal:  1.4,  // dense body (×45)
    relaxed: 1.5,  // long-form body (×15)
  },

  radius: {
    none:    '0',
    sm:      '2px',  // (×62)
    md:      '8px',  // (×30)
    lg:      '12px', // (×43)
    xl:      '20px', // card / button (×51)
    pill:    '32px', // floating footer pill border-top
    round:   '50%',  // avatars / circular buttons (×106)
    full:    '9999px',
  },

  // Layout / containers
  container: {
    // The demo's main content sits inside a flex container with --width:1856px
    // capped at calc(100% - 64px). At 1600px viewport this resolves to ~1530px.
    maxLg: '1856px', // wide sections (hero, full-bleed)
    max:   '1530px', // standard content width (most pages)
    maxMd: '1296px', // footer link block
    maxSm: '1076px', // newsletter form area
  },

  // Tailwind v4 default breakpoints (sm=640, md=768, lg=1024, xl=1280, 2xl=1536)
  // align well with the demo (which uses 575/767/991/1024/1200/1366/1500/1600).
  // Use Tailwind defaults — no custom breakpoint config needed.
  breakpoints: 'tailwind-default',

  // Animation
  motion: {
    duration: {
      fast:    '150ms',
      base:    '300ms', // most hover/focus transitions (×191)
      slow:    '500ms',
    },
    ease: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
} as const;
```

**How to apply:**
1. Copy this object into `src/lib/tokens.ts` during Phase 1.
2. Configure `tailwind.config.ts` to consume these (extend `theme.colors`, `theme.fontSize`, `theme.fontWeight`, etc.).
3. In components, prefer Tailwind utilities (`text-brand`, `bg-brandDark`, `text-h2`) over importing the raw object. Import the raw object only for inline styles where Tailwind doesn't fit (e.g., dynamic per-prop values).

---

## 8. Verification at every step

**Visual parity is a hard gate at every step.** Run two servers side-by-side and diff them:

```bash
# Terminal 1 — static reference (already configured in .claude/launch.json):
npx serve static_site/demo.casethemes.net/archcraft -l 3000

# Terminal 2 — Next.js build:
PORT=3001 npm run dev
```

Open both side-by-side. For every component / page, the following must match:

1. **Layout** — same column count, same widths, same z-order of overlapping elements
2. **Typography** — same font family, same `font-size` and `line-height` on every element (verify in DevTools "Computed")
3. **Colors** — exact match for brand colors, backgrounds, borders (sample with the eyedropper tool, not by eye)
4. **Spacing** — within ±2px is acceptable; anything more is a bug
5. **Imagery** — same images at the same sizes (`next/image` resizes are fine as long as the rendered dimensions match)
6. **Interactive states** — hover, focus, active, disabled — all match
7. **Animations** — reveal-on-scroll, parallax background scroll, dropdown open/close, carousel transitions — match in direction, duration, and easing
8. **Responsive breakpoints** — at 375px, 768px, 1024px, 1440px the layouts match the static site

If something can't match exactly, **stop and ask the user**. Don't ship "close enough" without explicit approval.

**Suggested workflow:** for each component, take a screenshot of the static site, take a screenshot of the new component, overlay them in an image editor (or use `cmp`/`compare` from ImageMagick) — only commit when the diff is empty/trivial.

---

## 9. Open questions to resolve with the user before kicking off

These don't need to be answered today — note them, ask before the relevant phase:

_Per [§0](#0-goals--non-goals): visual output is frozen, so most of these now have a default answer of "match the demo." Listed here only to surface places where "match the demo" is ambiguous._

1. **Mobile breakpoints** — match the demo's exact breakpoints (375 / 768 / 1024 / 1440). _Default: yes, match._
2. **`/home-three` and `/home-two-onepage`** — same priority as other inner pages? _Default: yes, build them since they're in the menu._
3. **WooCommerce pages** — visually identical to demo (same fake items in cart, same product page layout) but no real backend. Cart "add" buttons can be inert or use local state. _Confirm with user before Phase 4._
4. **Newsletter / contact form submit** — visually identical (same form fields, same success/error states) but the actual submission is a no-op (server action that returns success). _Confirm with user before Phase 4._
5. **Squada One font** — currently falls back on demo too, so "match demo" = also let it fall back. _Default: don't load Squada._
6. **`srcset` variants** — `next/image` generates its own. Final rendered visual size must match the demo at every breakpoint.
7. **Search popup** — the icon opens a popup on demo. Replicate the popup visually; search itself can be a no-op input that filters nothing. _Confirm before building._
8. **Embla vs. demo's Swiper** — Embla replaces Swiper internally but the user-visible carousel (slide count, direction, dots, autoplay timing, easing) must match.

---

## 10. Status log

Append a one-liner here as each phase completes, dated, with the commit hash.

- **2026-05-03 — Phase 0 done.** Mined design tokens from ~3.9 MB of CSS across home-two + 39 linked stylesheets. Brand color `#CAA05C` gold + `#1C1C1D` dark dominate; type uses Albert Sans only (Squada One never actually loaded — dropped from plan); standard scale 12/14/16/18/20/24/32/40/48/60px; 300ms is the base transition duration. Container max ≈ 1530px on standard pages. Tokens written to [§7](#7-design-tokens). _(uncommitted)_
- **2026-05-03 — Phase 1 done.** Next.js boots cleanly on `:3001`. Tokens wired via Tailwind v4 `@theme` in `globals.css` + mirror in `src/lib/tokens.ts`. Albert Sans loaded via `next/font/google`. Layout shell with Header/Footer placeholders renders. Asset path strategy: symlinked `public/wp-content` → `static_site/.../wp-content` (defer real copy until needed). _(uncommitted)_
- **2026-05-03 — Phase 2 done.** Real `<Header />` (sticky, dropdowns via CSS hover/focus-within, mobile drawer with collapsibles, active-state via usePathname), real `<Footer />` (newsletter card + 4 link columns + ARCHCRAFT wordmark + floating copyright pill), `<PageTitle />`, `<Button />` (4 variants × 3 sizes), `<Container />`, `<Logo />`. Single source of truth for menus in `src/lib/nav.ts`. Verified end-to-end at `/`. _(uncommitted)_
- **2026-05-03 — Phase 1 + 2 rolled back, pivoted to Quick port.** User feedback: Phase 2 React rebuild "is nothing like the original." Deleted `src/lib/`, `src/components/`, `src/content/`. Restored layout.tsx + page.tsx → catch-all route handler at `src/app/[[...slug]]/route.ts` reads HTML directly from `static_site/demo.casethemes.net/archcraft/<slug>/index.html` and serves it verbatim. `/` → home-two, all inner pages preserved. Visuals are now 1:1 with the legacy site because the HTML is unchanged. `public/wp-content` symlink kept. Verified `/`, `/about-us/`, `/blog-grid/`, `/contact-us/`, `/services/`, `/faq/` all return 200 with correct titles. _(uncommitted)_

---

## 11. For the "another session" handoff

When opening a fresh session to continue:

1. Read this file top to bottom.
2. Run `git log --oneline -20` to see recent commits.
3. Find the first unchecked checkbox in [§3](#3-phased-plan) — that's where to resume.
4. Run both dev servers (static + Next.js) for visual comparison.
5. Update the checkbox + [§10 status log](#10-status-log) when work lands.
