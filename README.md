# nanopods-house

A Next.js 16 app that serves the Novatio architecture-studio demo (originally a WordPress + Elementor site) verbatim. The site is **legacy HTML, served through Next.js**: a single catch-all route handler maps every URL to the matching `static_site/archcraft/<slug>/index.html`. Visual parity with the [legacy demo](https://demo.casethemes.net/archcraft/) is the contract.

## Quickstart

### Docker (recommended)

```bash
docker compose up -d --build
# Open http://localhost:3001  (or whatever WEB_PORT is set to in .env)
```

### Local (host)

The Next.js project root is `src/` — npm runs from there.

```bash
cd src
npm install
npm run dev          # http://localhost:3000
```

## Repo layout

```
.
├── docker-compose.yml          dev/local: builds from source, live-mounts static_site + i18n
├── docker-compose.prod.yml     prod: builds from source on the VM, uses the host Postgres
├── build-prod-image.sh         build the amd64 image + (optionally) ship it to the VM
├── deploy.sh                   build & run on the VM with the dev compose
├── .env                        WEB_PORT + LEAD_/ADMIN_/IMAGEKIT_/DATABASE_URL (gitignored)
├── infra/
│   ├── web/Dockerfile          multi-stage Node 22 alpine build (bakes static_site + i18n)
│   └── web/entrypoint.sh       runs DB migrations on boot, then starts Next
└── src/                        app root — package.json, configs, code, assets
    ├── app/
    │   ├── [[...slug]]/route.ts    catch-all + server-side EN/FR translation
    │   ├── admin/                  admin dashboard (UI) — gated by middleware
    │   ├── api/admin/              admin API (login, portfolio, categories, content, submissions, upload, account)
    │   ├── api/portfolio/route.ts  public: portfolio index from the DB (drives /portfolio/ grid)
    │   ├── api/categories/route.ts public: category list from the DB (drives the filter)
    │   ├── api/lead/route.ts       chatbot lead endpoint (+ notifications, persists to Postgres)
    │   ├── api/contact/route.ts    contact-form endpoint (persists to Postgres)
    │   ├── api/newsletter/route.ts newsletter subscribe (persists to Postgres)
    │   └── api/mailer.ts           SendGrid sender + branded HTML email template
    ├── lib/                        auth, db (Drizzle), schema, imagekit, products, categories, content
    ├── drizzle/                    generated SQL migrations (applied on boot)
    ├── scripts/seed-content.mjs    one-time: load repo files → products/categories tables
    ├── middleware.ts               gates /admin + /api/admin behind a signed session cookie
    ├── i18n/{en,fr}.json           translation dictionaries (keyed by data-i18n attrs)
    ├── public/
    │   ├── chatbot.js              floating / inline lead-qual widget
    │   └── wp-content              symlink → ../static_site/archcraft/wp-content
    ├── scripts/build-partials.mjs  inlines shared header/footer into every HTML page
    ├── static_site/archcraft/
    │   ├── partials/{header,footer}.html   single source of truth for shared chrome
    │   ├── home/                           → /  (renamed from `home-two/`)
    │   ├── about-us/, contact-us/, ...     → matching URLs (9 pages)
    │   └── wp-content/                     Elementor / plugin / theme CSS / JS / uploads
    ├── tests/visual.spec.ts        Playwright visual regression
    └── playwright.config.ts        chromium, port 3001
```

## How requests flow

1. Browser hits `/about-us/` (or any URL).
2. `/wp-content/*` resolves directly via the `src/public/wp-content` symlink — Next serves these as static files.
3. Everything else hits `src/app/[[...slug]]/route.ts`, which reads `src/static_site/archcraft/<slug>/index.html` and returns it verbatim.
4. The handler stubs three legacy XHR endpoints (CF7 schema, woosw AJAX, an Elementor bundle) so dead-plugin 404s don't appear in the console.
5. Header/footer markup is inlined into the HTML at build time by `scripts/build-partials.mjs` (runs on `predev` and `prebuild`).

## Admin dashboard

A password-protected dashboard at **`/admin`** manages content without touching code. Gated by
`src/middleware.ts` (signed session cookie); log in with `ADMIN_USERNAME` / `ADMIN_PASSWORD`.

- **Portfolio** — add / edit / delete models, stored in the **`products`** table (Postgres); the
  public `/portfolio/` grid reads them via `/api/portfolio`. Images upload to **ImageKit** (folder
  `maisonnovatio/portfolio/<sku>/`, URLs stored in the row's `spec`); removed images are cleaned off the CDN.
- **Categories** — add / rename / reorder / delete, stored in the **`categories`** table; consumed
  by validation, the admin form, and the public `/portfolio/` filter (via `/api/categories`).
- **Pages** — per-page **bilingual (EN/FR)** text editor. Edits are stored as a sparse overlay in
  the **`page_content`** table and applied at serve time on top of the base (English HTML +
  `i18n/fr.json`), so only the edited text changes — layout never changes.

All content edits persist to Postgres and are **live immediately with no rebuild** — see **Database** and **Deploy**.
- **Leads / Contacts / Newsletter** — read-only tables of the Postgres submissions, with CSV export.
- **Settings** — change the admin password (writes an HMAC override to `data/admin-auth.json`).

Required env: `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`, the `IMAGEKIT_*` keys, and
`DATABASE_URL` (see **Database** and **Deploy**).

## Database

Both form submissions **and site content** persist to **Postgres** via **Drizzle**
(`src/lib/schema.ts`). Tables: `leads` / `contacts` / `newsletter_subscribers` (submissions) and
`products` / `categories` / `page_content` (content). Migrations in `src/drizzle/` are applied
automatically on container boot by `infra/web/entrypoint.sh` (idempotent). Content is served from the
DB at runtime (`/api/portfolio`, `/api/categories`, and the page overlay in `route.ts`), so admin
edits are live with no rebuild. The `spec.json` / `_index.json` / `_categories.json` files remain in
the repo only as the **seed source** (see `npm run db:seed`).

- **Dev / local:** `docker-compose.yml` runs a containerized `postgres:16` service; `DATABASE_URL`
  defaults to it. Host `npm run dev` points at the published port (`POSTGRES_PORT`, default 5432).
- **Production:** uses the **host's** Postgres (no DB container) — see **Deploy → Production**.
- Seed content from the repo files: `npm run db:seed`. One-time legacy JSON→Postgres import
  (old `leads.json` etc.): `npm run db:import`.

## Editing pages

> For most content edits, use the **Pages** tab in the [Admin dashboard](#admin-dashboard) — it's
> safe and needs no code. The notes below are the low-level mechanics.

- **Header / footer:** edit `static_site/archcraft/partials/{header,footer}.html`. Next `npm run dev` or `npm run build` re-stamps them. On demand: `npm run build:partials`. The script wraps inlined content in `<!-- partial:NAME -->...<!-- /partial:NAME -->` so re-runs swap the latest content (idempotent).
- **A single page:** edit `static_site/archcraft/<route>/index.html`. The HTML is one giant line per file (auto-generated by WordPress) — use Python regex scripts, not hand-editing. After editing: `npm run test:visual`.
- **Bilingual text (EN/FR):** the **base** is EN inline in the HTML + FR in `src/i18n/fr.json`, keyed by `data-i18n` attributes and substituted server-side in `route.ts`. Editable copy should be changed in the **Pages** admin tab — those edits are stored as a `page_content` DB overlay applied on top of the base at serve time (live, no rebuild). Editing the base files directly still works for the initial text but requires a rebuild to reach prod.
- **Graduating a page to React:** create `src/app/<route>/page.tsx`. Next.js routes there instead of the catch-all. See [CLAUDE.md](CLAUDE.md) § Graduating a page.

## Lead capture & email (chatbot + contact form)

Two things capture visitor leads, both POST JSON and email it to you:

- **Chatbot** — a floating widget on every page ([public/chatbot.js](src/public/chatbot.js)) runs 5 scripted questions (+ a free-text message), classifies HOT / WARM / COLD, and POSTs to [`/api/lead`](src/app/api/lead/route.ts). On `/contact-us/` the same widget renders **inline** instead of floating (it mounts into a `<div data-novatio-contact-form>` placeholder and drops straight into the project flow).
- **Contact endpoint** — [`/api/contact`](src/app/api/contact/route.ts) accepts `{name, email, message}` for a plain contact form.

Both build a branded HTML email via the shared template in [`app/api/mailer.ts`](src/app/api/mailer.ts) (tables + inline styles, email-client-safe) and send through whichever channel is configured. The lead email includes the contact info, project answers, the visitor's message, and a summary of the questions they asked, with `reply-to` set to the visitor.

Every submission also **persists to Postgres** (`leads` / `contacts` / `newsletter_subscribers` tables) and is viewable in the [Admin dashboard](#admin-dashboard) with CSV export. Email remains the real-time notification path for leads; the DB is the durable record.

Set notification channels in the root `.env` (compose injects them into the container; locally Next reads `src/.env.local`). Full setup notes live in [`src/.env.example`](src/.env.example):

- `LEAD_SENDGRID_API_KEY` + `LEAD_FROM_EMAIL` + `LEAD_TO_EMAIL` — email via [SendGrid](https://sendgrid.com) **(current setup)**. `LEAD_FROM_EMAIL` must be a verified Single Sender or on an authenticated domain (e.g. `maisonnovatio.ca`, set up via the 3 CNAME records SendGrid provides). `LEAD_TO_EMAIL` is the inbox that receives leads.
- `LEAD_RESEND_API_KEY` + `LEAD_FROM_EMAIL` + `LEAD_TO_EMAIL` — email via [Resend](https://resend.com) (alternative)
- `LEAD_SLACK_WEBHOOK_URL` — Slack incoming-webhook URL
- `LEAD_GENERIC_WEBHOOK_URL` — any URL that accepts the lead JSON

All configured channels fire in parallel; one failing doesn't block the others. With none set, leads are only logged to the server console. To add a channel, copy one of the `notifyX` functions in `src/app/api/lead/route.ts`.

## Tests

```bash
cd src
npm run test:visual           # diff every route against baseline screenshots
npm run test:visual:update    # accept current output as new baseline
```

## Deploy

The app runs in Docker; inside the container it listens on `:3000`, published on the host as `WEB_PORT`.

### Local / dev-style

```bash
docker compose up -d --build      # builds from source; runs a Postgres container + web
docker compose logs -f web
docker compose down               # default http://localhost:3001
```
`static_site/` and `i18n/` are volume-mounted, so base-content edits are live (i18n JSON edits need `docker compose restart web` — dicts are cached). The dev compose also runs a containerized `postgres:16`.

### Production — GCP VM, built from source, host Postgres

The production box is a GCP Compute Engine VM behind a host **reverse proxy** (Nginx on 80/443).
Production **builds the image from the git code on the VM** (no shipped image) and uses the VM's
**host Postgres** (no DB container). It runs [`docker-compose.prod.yml`](docker-compose.prod.yml),
which has a `build:` from source and maps `host.docker.internal` → the host gateway so the container
can reach the host DB.

**Content is dynamic — stored in Postgres, not in the image.** Portfolio items, categories, and page
text are edited in the `/admin` dashboard, persist to the host DB, and go live **immediately with no
rebuild**. Portfolio images live on ImageKit (their URLs are stored in the DB), so there's nothing
image-related to ship either. **You only rebuild for _code_ changes.**

**Deploy / update (code changes):**
```bash
cd <project-dir>
git pull
docker compose -f docker-compose.prod.yml up -d --build
```
This rebuilds + recreates the web container; `infra/web/entrypoint.sh` runs DB migrations on boot (idempotent).

**First-time setup on the VM:**

1. **Host Postgres** — create the database + role, and make sure Postgres accepts the container's
   connection (listen on the docker bridge/gateway; allow it in `pg_hba.conf`):
   ```bash
   sudo -u postgres psql -c "CREATE ROLE nanopods LOGIN PASSWORD 'a-strong-password';"
   sudo -u postgres psql -c "CREATE DATABASE nanopods OWNER nanopods;"
   ```
2. **`.env`** (gitignored — create on the server, never commit secrets):
   - `WEB_PORT=<a free host port>` — not 80/443 (the proxy owns those); check `docker ps`.
   - `LEAD_SENDGRID_API_KEY` / `LEAD_FROM_EMAIL` / `LEAD_TO_EMAIL` — lead email.
   - `ADMIN_USERNAME` / `ADMIN_PASSWORD` / `ADMIN_SESSION_SECRET` — admin login (`openssl rand -hex 32` for the secret).
   - `IMAGEKIT_PUBLIC_KEY` / `IMAGEKIT_PRIVATE_KEY` / `IMAGEKIT_URL_ENDPOINT` — image storage (same account as dev ⇒ same images).
   - `DATABASE_URL` — the **host** Postgres, reached as `host.docker.internal` (NOT `localhost`, which is the container itself): `postgres://<user>:<pass>@host.docker.internal:5432/<db>`.
3. **Boot** — `docker compose -f docker-compose.prod.yml up -d --build` (migrations create the tables on the host DB).
4. **Seed the content** into the host DB, once — pick one:
   - **From the committed base files** (simplest): `docker compose -f docker-compose.prod.yml exec web node scripts/seed-content.mjs` — loads the portfolio + categories that ship in the image into the DB.
   - **Or import a dev dump**: `psql "$DATABASE_URL" -f nanopods-dev-export.sql` — the same content (+ any submissions) exported from dev. See [`migrate-db.sh`](migrate-db.sh) to copy a whole dev DB across hosts.
5. **Reverse proxy** — route the domain → `localhost:<WEB_PORT>`, TLS via certbot. The domain's DNS
   `A` record must point only at the VM (no GoDaddy "forwarding" parking IPs), then:
   `certbot --nginx -d maisonnovatio.ca -d www.maisonnovatio.ca`.

After that, day-to-day content changes are made in `/admin` (no deploy); only code changes need a `git pull` + rebuild.

### Scripts (repo root)

| Script | Where | What |
|---|---|---|
| [`migrate-db.sh`](migrate-db.sh) | box with a source DB | Copy a whole DB (content + submissions) from one Postgres to another (e.g. dev → the prod host). Dumps + loads, preserving Drizzle migration state. |
| [`deploy.sh`](deploy.sh) | the VM | Convenience wrapper for `docker compose up -d --build`. |
| [`build-prod-image.sh`](build-prod-image.sh) | your Mac | **Legacy** — builds + ships a prebuilt `linux/amd64` image to the VM. No longer the deploy path (prod builds from source); kept for reference. |

`.env` and `*.tar.gz` are gitignored so secrets and image artifacts are never committed.

## Known intentional gaps

- WooCommerce pages render demo content with no backend (no real cart, payment, etc.).
- The **contact page is wired** (inline chatbot → `/api/lead` → email + Postgres). The footer **newsletter** form is wired to `/api/newsletter` → Postgres (de-duped by email); no outbound mailing-list integration yet — the list can be exported from the admin.
- A few WordPress XHRs 404 silently and don't affect the page (the catch-all stubs the noisy ones).
- `Squada One` font is referenced in legacy CSS but never loaded; falls back to Albert Sans.

## Repo notes

- `.claude/` is local-only (gitignored at the root).
- Origin uses the `github-yvesjunior` SSH host alias from `~/.ssh/config` (forces the right key for the `yvesjunior/novatio` remote).
- See [CLAUDE.md](CLAUDE.md) for AI-collab notes — visual-parity rule, what was ripped out, what *not* to do.
