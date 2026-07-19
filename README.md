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
├── docker-compose.prod.yml     prod: runs a prebuilt image (no build, no source mounts)
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
    │   ├── api/lead/route.ts       chatbot lead endpoint (+ notifications, persists to Postgres)
    │   ├── api/contact/route.ts    contact-form endpoint (persists to Postgres)
    │   ├── api/newsletter/route.ts newsletter subscribe (persists to Postgres)
    │   └── api/mailer.ts           SendGrid sender + branded HTML email template
    ├── lib/                        auth, db (Drizzle), schema, imagekit, portfolio, categories, content
    ├── drizzle/                    generated SQL migrations (applied on boot)
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

- **Portfolio** — add / edit / delete models. Images upload to **ImageKit** (folder
  `maisonnovatio/portfolio/<sku>/`); removed images are cleaned off the CDN. Items are stored as
  `spec.json` files → built into `_index.json` (drives the public `/portfolio/` grid).
- **Categories** — add / rename / reorder / delete. Single source of truth in
  `products/_categories.json`, consumed by validation, the build, the admin form, and the public filter.
- **Pages** — per-page **bilingual (EN/FR)** text editor. English edits are applied surgically to
  the page HTML by `data-i18n` key; French writes to `i18n/fr.json`. Layout never changes.
- **Leads / Contacts / Newsletter** — read-only tables of the Postgres submissions, with CSV export.
- **Settings** — change the admin password (writes an HMAC override to `data/admin-auth.json`).

Required env: `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`, the `IMAGEKIT_*` keys, and
`DATABASE_URL` (see **Database** and **Deploy**).

## Database

Form submissions (leads, contacts, newsletter) persist to **Postgres** via **Drizzle**
(`src/lib/schema.ts`). Migrations in `src/drizzle/` are applied automatically on container boot by
`infra/web/entrypoint.sh` (idempotent). Portfolio items are **not** in the DB — they're `spec.json`
files on disk.

- **Dev / local:** `docker-compose.yml` runs a containerized `postgres:16` service; `DATABASE_URL`
  defaults to it. Host `npm run dev` points at the published port (`POSTGRES_PORT`, default 5432).
- **Production:** uses the **host's** Postgres (no DB container) — see **Deploy → Production**.
- One-time JSON→Postgres import (legacy `leads.json` etc.): `npm run db:import`.

## Editing pages

> For most content edits, use the **Pages** tab in the [Admin dashboard](#admin-dashboard) — it's
> safe and needs no code. The notes below are the low-level mechanics.

- **Header / footer:** edit `static_site/archcraft/partials/{header,footer}.html`. Next `npm run dev` or `npm run build` re-stamps them. On demand: `npm run build:partials`. The script wraps inlined content in `<!-- partial:NAME -->...<!-- /partial:NAME -->` so re-runs swap the latest content (idempotent).
- **A single page:** edit `static_site/archcraft/<route>/index.html`. The HTML is one giant line per file (auto-generated by WordPress) — use Python regex scripts, not hand-editing. After editing: `npm run test:visual`.
- **Bilingual text (EN/FR):** EN is the source-of-truth inline in the HTML; French is substituted server-side in `route.ts` from `src/i18n/fr.json`, keyed by `data-i18n` attributes (`data-i18n-also-attr` also rewrites a named attribute, e.g. `placeholder`/`data-text`). To change a string, edit the EN inline text **and** the matching key in `i18n/{en,fr}.json`. The parsed dictionaries are **cached in memory in production**, so after editing the JSON run `docker compose restart web` (dev/local) or reship the image (prod) for the change to appear in French.
- **Graduating a page to React:** create `src/app/<route>/page.tsx`. Next.js routes there instead of the catch-all. See [CLAUDE.md](src/CLAUDE.md) § Graduating a page.

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

Everything ships as a Docker image. Inside the container the app listens on `:3000`; the host port is `WEB_PORT` in `.env`.

### Local / dev-style

```bash
docker compose up -d --build      # builds from source; live-mounts static_site/ + i18n/
docker compose logs -f web
docker compose down               # default http://localhost:3001
```
Because `static_site/` and `i18n/` are volume-mounted, HTML/content edits are live. i18n JSON edits need a `docker compose restart web` (dicts are cached in memory).

### Production — GCP VM, prebuilt image

The production box is a GCP Compute Engine VM that also hosts other apps behind a host **reverse proxy** (Nginx on 80/443). Our app is **not built on the VM** (it's resource-constrained — builds OOM'd) — instead we build the image on the Mac and ship it. Production runs [`docker-compose.prod.yml`](docker-compose.prod.yml): it runs a **prebuilt `image:`** with **no `build:` and no source mounts** — `static_site/` and `i18n/` are baked into the image.

**Build + ship (from your Mac) — one command:**
```bash
./build-prod-image.sh --ship
```
That builds `linux/amd64` (the VM's arch — on Apple Silicon it runs under emulation, a few minutes), then streams the image straight into the VM's Docker (no tarball stored remotely) and recreates the container. Without `--ship` it just builds + saves `nanopods-web-amd64.tar.gz`. Override `VM` / `ZONE` / `REMOTE_DIR` / `IMAGE` via env vars.

**What it does under the hood** (also runnable by hand):
```bash
docker save nanopods-house-web:latest | gzip | \
  gcloud compute ssh ecommerce --zone us-central1-a -- 'gunzip | sudo docker load'
gcloud compute ssh ecommerce --zone us-central1-a -- \
  "cd <project-dir> && docker compose -f docker-compose.prod.yml up -d --force-recreate"
```

> **Database:** production does **not** run a Postgres container — it uses the **Postgres already
> installed on the host**. `docker-compose.prod.yml` has no `db` service; it maps
> `host.docker.internal` to the host gateway so the container can reach it. Before first boot,
> create the database + role on the host Postgres and allow the container's connection in
> `pg_hba.conf` (listen on the docker bridge/gateway). The entrypoint runs migrations on boot.

**On the VM you need** (in the project dir, alongside `docker-compose.prod.yml`):
- A `.env` (gitignored — create on the server, never commit secrets) with:
  - `WEB_PORT=<a free host port>` — not 80/443 (the proxy owns those); check `docker ps`.
  - `LEAD_SENDGRID_API_KEY` / `LEAD_FROM_EMAIL` / `LEAD_TO_EMAIL` — lead email.
  - `ADMIN_USERNAME` / `ADMIN_PASSWORD` / `ADMIN_SESSION_SECRET` — admin login (`openssl rand -hex 32` for the secret).
  - `IMAGEKIT_PUBLIC_KEY` / `IMAGEKIT_PRIVATE_KEY` / `IMAGEKIT_URL_ENDPOINT` — portfolio image storage.
  - `DATABASE_URL` — **the host Postgres**, reached as `host.docker.internal` from the container (not `localhost`, which is the container itself): `postgres://<user>:<pass>@host.docker.internal:5432/<db>`.
- The host reverse proxy routing the domain → `localhost:<WEB_PORT>`, with TLS from certbot. The domain's DNS `A` record must point only at the VM (no GoDaddy "forwarding" parking IPs), then: `certbot --nginx -d maisonnovatio.ca -d www.maisonnovatio.ca`.

> **Baked-in content gotcha:** since `static_site/` + `i18n/` live inside the prod image, content / translation / logo / team edits only reach the live site after a **rebuild + reship** (`./build-prod-image.sh --ship`). The dev compose live-mounts them; the prod image does not.

### Scripts (repo root)

| Script | Where | What |
|---|---|---|
| [`build-prod-image.sh`](build-prod-image.sh) | your Mac | Build the `linux/amd64` image + save a tarball; `--ship` to stream-deploy to the VM and recreate the container. |
| [`deploy.sh`](deploy.sh) | the VM | Build & start with the **dev** compose (`docker compose up -d --build`). Only for building *on* the server — avoid on the constrained VM; prefer shipping a prebuilt image. |

`.env` and `*.tar.gz` are gitignored so secrets and the (335 MB) image artifact are never committed.

## Known intentional gaps

- WooCommerce pages render demo content with no backend (no real cart, payment, etc.).
- The **contact page is wired** (inline chatbot → `/api/lead` → email + Postgres). The footer **newsletter** form is wired to `/api/newsletter` → Postgres (de-duped by email); no outbound mailing-list integration yet — the list can be exported from the admin.
- A few WordPress XHRs 404 silently and don't affect the page (the catch-all stubs the noisy ones).
- `Squada One` font is referenced in legacy CSS but never loaded; falls back to Albert Sans.

## Repo notes

- `.claude/` is local-only (gitignored at the root).
- Origin uses the `github-yvesjunior` SSH host alias from `~/.ssh/config` (forces the right key for the `yvesjunior/novatio` remote).
- See [CLAUDE.md](src/CLAUDE.md) for AI-collab notes — visual-parity rule, what was ripped out, what *not* to do.
