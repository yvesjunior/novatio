# Bilingual (EN/FR) implementation plan — Path D

**Approach chosen:** Server-side translation injection. Keep one set of HTML files (current EN). Wrap translatable strings with `data-i18n` markers. The catch-all route handler detects locale and substitutes strings from JSON dictionaries before responding.

**Guiding principles**

- Visual parity preserved — EN content already in HTML stays as the fallback. Adding markers doesn't change rendering for EN.
- One source of truth per page. No mirrored `/fr/` HTML directories.
- Translators edit JSON only.
- SEO-friendly — both `/fr/<slug>/` URLs and a cookie-based default render the same content.
- Fail open: if a translation key is missing, fall back to the EN text in the HTML.

Source content already available in repo (use to seed FR translations):
- [`content/services.md`](services.md) — services page EN+FR
- [`content/about.md`](about.md) — owner-provided FR (mission, vision, brand story, values, differentiators) + EN drafts
- Original FR provided in chat for hero, contact info ("Lundi–Vendredi, 8h–18h"), etc.

---

## Phase 0 — Decisions to lock at start of session (5 min)

Before touching code, confirm with user:

1. **URL strategy** — recommended: support both. Cookie-based default at `/path/` + explicit `/fr/path/` URLs for sharing/SEO. (If user prefers cookie-only, skip URL prefix logic.)
2. **Default locale** — `en` (recommended) or browser auto-detect via `Accept-Language`.
3. **Pilot page** — recommended: home (most visible, most strings — gets the engine fully exercised).

---

## Phase 1 — i18n engine (route handler) — ~30–60 min

### 1.1 Create i18n directory and seed dictionaries

```
src/i18n/
  en.json     # mostly empty initially — populated as pages get markers
  fr.json     # mostly empty initially
```

Start with global keys that apply across pages:

```json
// src/i18n/en.json
{
  "common.read_more": "READ MORE",
  "common.discover_models": "DISCOVER OUR MODELS",
  "common.discover_work": "DISCOVER OUR WORK",
  "common.get_a_quote": "GET A QUOTE",
  "footer.brand": "Make modular housing accessible everywhere in North America — from urban areas to the most remote communities."
}
```

```json
// src/i18n/fr.json
{
  "common.read_more": "EN SAVOIR PLUS",
  "common.discover_models": "DÉCOUVRIR NOS MODÈLES",
  "common.discover_work": "DÉCOUVRIR NOS PROJETS",
  "common.get_a_quote": "DEMANDER UNE SOUMISSION",
  "footer.brand": "Rendre l'habitat modulaire accessible partout en Amérique du Nord — des zones urbaines aux communautés les plus éloignées."
}
```

### 1.2 Update [`src/app/[[...slug]]/route.ts`](../src/app/[[...slug]]/route.ts)

Add at the top:

```ts
import { promises as fs } from 'node:fs';

// Cache the dictionaries in memory (only one file each)
let _dicts: Record<string, Record<string, string>> | null = null;
async function loadDicts() {
  if (_dicts) return _dicts;
  const i18nDir = path.join(process.cwd(), 'i18n');
  const en = JSON.parse(await fs.readFile(path.join(i18nDir, 'en.json'), 'utf-8'));
  const fr = JSON.parse(await fs.readFile(path.join(i18nDir, 'fr.json'), 'utf-8'));
  _dicts = { en, fr };
  return _dicts;
}
```

Add a locale detector:

```ts
function detectLocale(req: NextRequest, slug: string[]): { locale: 'en' | 'fr'; cleanedSlug: string[] } {
  // 1. URL prefix /fr/...
  if (slug[0] === 'fr') return { locale: 'fr', cleanedSlug: slug.slice(1) };
  if (slug[0] === 'en') return { locale: 'en', cleanedSlug: slug.slice(1) };
  // 2. Cookie
  const cookieLocale = req.cookies.get('locale')?.value;
  if (cookieLocale === 'fr' || cookieLocale === 'en') {
    return { locale: cookieLocale, cleanedSlug: slug };
  }
  // 3. Default
  return { locale: 'en', cleanedSlug: slug };
}
```

Add a substitution function (applied only when locale === 'fr'):

```ts
function applyTranslations(html: string, dict: Record<string, string>): string {
  // Inner-text replacement: <tag ... data-i18n="key" ...>...</tag>
  // Handles both whitespace + nested simple HTML inside the tag
  html = html.replace(
    /(<[A-Za-z][^>]*\sdata-i18n="([^"]+)"[^>]*>)([\s\S]*?)(<\/[A-Za-z]+>)/g,
    (match, openTag, key, _origInner, closeTag) => {
      // Skip if marker is also doing attribute-only substitution
      if (/data-i18n-attr=/.test(openTag)) return match;
      const v = dict[key];
      return v !== undefined ? openTag + v + closeTag : match;
    }
  );

  // Attribute replacement: <tag ... data-i18n="key" data-i18n-attr="data-text" ...>
  html = html.replace(
    /<[A-Za-z][^>]*\sdata-i18n="([^"]+)"\s+data-i18n-attr="([^"]+)"[^>]*>/g,
    (match, key, attr) => {
      const v = dict[key];
      if (v === undefined) return match;
      const re = new RegExp(`(\\s${attr}=")[^"]*(")`);
      return match.replace(re, `$1${v}$2`);
    }
  );

  return html;
}
```

Wire into `GET`:

```ts
const { locale, cleanedSlug } = detectLocale(_req, slug ?? []);
const file = await resolveStaticFile(cleanedSlug);
if (!file) return new Response('Not Found', { status: 404 });
const ext = path.extname(file).toLowerCase();
const contentType = MIME[ext] ?? 'application/octet-stream';
if (ext === '.html') {
  let body = await fs.readFile(file, 'utf-8');
  if (locale !== 'en') {
    const dicts = await loadDicts();
    body = applyTranslations(body, dicts[locale] ?? {});
  }
  // Set cookie if locale was detected from URL prefix
  const headers: Record<string, string> = { 'content-type': contentType };
  return new Response(body, { headers });
}
// ... rest unchanged
```

### 1.3 Test the engine

Without any HTML markers yet, the engine should be a no-op for both EN and FR:
- `curl http://localhost:3001/` → 200, EN content
- `curl http://localhost:3001/fr/` → 200, EN content (no FR markers yet)
- `curl http://localhost:3001/ -H 'Cookie: locale=fr'` → 200, EN content
- All pages still serve correctly.

**Don't move to Phase 2 until this passes.**

### 1.4 Rebuild Docker

`route.ts` change requires `docker compose up -d --build` (per [`src/CLAUDE.md`](../src/CLAUDE.md) live-mount note).

---

## Phase 2 — Language toggle widget — ~20–30 min

### 2.1 Add EN | FR pill to header partial

Edit [`partials/header.html`](../src/static_site/archcraft/partials/header.html) — pick a spot (e.g., next to `GET A QUOTE` button or the search icon). Markup:

```html
<div class="pxl-locale-toggle" style="display:inline-flex;gap:8px;align-items:center;font-size:0.85em;">
  <button type="button" onclick="document.cookie='locale=en;path=/;max-age=31536000';location.reload();" class="pxl-locale-en">EN</button>
  <span>|</span>
  <button type="button" onclick="document.cookie='locale=fr;path=/;max-age=31536000';location.reload();" class="pxl-locale-fr">FR</button>
</div>
```

Optional: highlight the active locale by reading the cookie in inline JS:

```html
<script>
  (function() {
    var loc = (document.cookie.match(/locale=(\w+)/) || [])[1] || 'en';
    var el = document.querySelector('.pxl-locale-' + loc);
    if (el) el.style.fontWeight = '700';
  })();
</script>
```

### 2.2 Apply same treatment to home page embedded header

`home/index.html` carries its own embedded menu copy (per CLAUDE.md gotcha). Need manual edit there too — `npm run build:partials` won't propagate.

### 2.3 Re-stamp partials

```bash
cd src && npm run build:partials
```

### 2.4 Spot-check

- Visit `/`, click FR, reload — cookie set, home re-renders with FR (will look unchanged since no `data-i18n` markers yet).
- Click EN, reload — back to EN.

---

## Phase 3 — Pilot page: home page — ~1–2 hours

### 3.1 Catalog translatable strings

Go through [`home/index.html`](../src/static_site/archcraft/home/index.html) section by section. List each visible string + its key. Suggested key naming:

- `home.hero.title`, `home.hero.tagline`, `home.hero.cta`
- `home.hero.stat1.value`, `home.hero.stat1.label`, `home.hero.stat2.value`, `home.hero.stat2.label`
- `home.about.eyebrow`, `home.about.heading`, `home.about.body`, `home.about.cta`, `home.about.counter.label`
- `home.achievement.eyebrow`, `home.achievement.heading`, `home.achievement.body`, `home.achievement.cta`
- `home.portfolio.eyebrow`, `home.portfolio.heading`, `home.portfolio.cta`
- `home.faq.eyebrow`, `home.faq.heading`, `home.faq.body`
- `home.faq.q1`, `home.faq.a1`, ..., `home.faq.q5`, `home.faq.a5`
- `home.newsletter.heading`, `home.newsletter.body`, `home.newsletter.cta`
- `footer.useful_links.heading`, `footer.useful_links.portfolio`, ... (these go in shared footer keys)

Save the catalog to a checklist file or as comments in `en.json` for visibility.

### 3.2 Add `data-i18n` markers to home/index.html

For each string in the catalog, find the wrapping element (`<h2>`, `<p>`, `<span>`, etc.) and add `data-i18n="..."` attribute. Don't change visible text.

For letter-spaced button labels (e.g. `<span>D</span><span>I</span>...`), put `data-i18n` on the `pxl--btn-text` parent span and use the original label string as the value. Substitution will replace inner letter-spans as a whole — but rendering relies on those per-letter spans for animation. **Decision required**: either (a) sacrifice the letter-by-letter animation for translated buttons, or (b) generate per-letter spans server-side after substitution. Recommend (a) for simplicity initially; the loss is cosmetic.

### 3.3 Populate `en.json` + `fr.json` for home

EN values come from current visible HTML (just copy them). FR values come from sources already in repo:
- `content/about.md` — mission, vision, brand story (all already EN+FR)
- `content/services.md` — service-related copy
- Owner-provided FR copy from chat — hero tagline, contact info, etc.
- For FAQs and copy without a French source — flag for the user, leave the EN text in `fr.json` until translated.

### 3.4 Test

- `curl http://localhost:3001/` → EN, no visible change vs before
- `curl http://localhost:3001/fr/` → FR, all marked strings translated
- Browser: click FR toggle, page reloads in French. Click EN, back to English.
- Compare visually side by side — no layout breakage.
- Check button hovers / animations — letter-spaced buttons may behave differently in FR (per Phase 3.2 decision).

---

## Phase 4 — Roll out per page — ~30–60 min per page

Repeat Phase 3 (catalog → mark up → translate → test) for each remaining page in this priority order:

1. `services/index.html` — already has FR source ready in `content/services.md`
2. `about-us/index.html` — already has FR source ready in `content/about.md`
3. `contact-us/index.html` — owner-provided FR copy in earlier session
4. `careers/index.html` — short, low-priority
5. `faq/index.html` — needs FR translation help from owner
6. `gallery/index.html` — minimal text
7. `portfolio/index.html` — has some text
8. Sub-pages: `portfolio/crafted-with-passion/`, `portfolio/modern-residential-villa/`
9. `error-404/index.html` — short

Shared keys (header menu, footer, CTAs) only need to be cataloged once and live in `en.json` / `fr.json`.

---

## Phase 5 — SEO + polish — ~30 min

### 5.1 Add `hreflang` alternate links

Inject in `<head>` (via partial or middleware):

```html
<link rel="alternate" hreflang="en" href="https://example.com/about-us/" />
<link rel="alternate" hreflang="fr" href="https://example.com/fr/about-us/" />
<link rel="alternate" hreflang="x-default" href="https://example.com/about-us/" />
```

### 5.2 `<html lang="...">` should reflect current locale

Server-side substitute `<html lang="en-US">` → `<html lang="fr-CA">` when `locale === 'fr'`. One regex in the substitution layer.

### 5.3 Update `<title>` tag

Treat as a translatable key per page (`home.title`, `about.title`, etc.).

### 5.4 Update sitemap (if exists)

List both URL variants of each page.

### 5.5 Browser-language auto-detection (optional)

If user requested it in Phase 0: in middleware, on first visit (no cookie), parse `Accept-Language` and redirect to `/fr/...` or set the cookie.

---

## Acceptance criteria for "done"

- [ ] `/` and `/fr/` both serve 200, with content visibly translated
- [ ] Toggle widget in header sets cookie and reloads with new locale
- [ ] Direct visit to `/fr/about-us/` works without cookie
- [ ] Missing translation keys fall back gracefully to EN (page never breaks)
- [ ] All marked strings on the home page have a French translation
- [ ] No visual regression on EN pages
- [ ] `<html lang>` reflects locale
- [ ] Cache headers reasonable (`Cache-Control: public, max-age=300` minimum)

## What NOT to do

- ❌ Don't try to also rewrite the HTML structure to "clean it up" while adding markers — pure additive edits only. Visual contract.
- ❌ Don't auto-translate (machine translation) for the brand-story / mission / vision — those are owner-authored, FR is authoritative.
- ❌ Don't introduce a translation library (i18next, next-intl) at this stage — keep dependencies minimal. The 30-line engine is sufficient.
- ❌ Don't ship without testing both EN and FR on every page touched.

## Rollback strategy

- All changes are additive (new `data-i18n` attributes, new JSON files, new `route.ts` logic). Reverting:
  - `git checkout -- src/app/[[...slug]]/route.ts` to drop engine
  - Remove `src/i18n/` directory
  - Remove `data-i18n` attributes from HTML (one regex pass: `\s+data-i18n(?:-attr)?="[^"]*"`)
  - Remove toggle widget from `partials/header.html`

## Estimated total effort

- Phase 0: 5 min (decisions)
- Phase 1: 30–60 min (engine + test)
- Phase 2: 20–30 min (toggle widget)
- Phase 3: 1–2 hours (home page pilot, ~25 strings)
- Phase 4: 30–60 min × 8 pages ≈ 4–8 hours
- Phase 5: 30 min (SEO polish)

**Total: roughly 1 full day for full bilingual coverage. Phases 1–3 alone (engine + home page proof) ≈ 2–3 hours and produce a working demo.**
