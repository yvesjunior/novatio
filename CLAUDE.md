# CLAUDE.md

> Full project notes live at [`src/CLAUDE.md`](src/CLAUDE.md). Read that one first.

## Quick orientation

The Next.js app's project root is `src/` — `package.json`, `node_modules/`, all configs and source live there. Only Docker/infra files sit at the repo root:

```
.
├── docker-compose.yml      compose orchestrates the web service
├── .env                    WEB_PORT and runtime config
├── infra/web/Dockerfile    multi-stage Node 22 build (context = repo root)
└── src/                    Next.js app (cd here to run npm)
```

## Run

```bash
# Docker
docker compose up -d --build      # http://localhost:${WEB_PORT}/  (default 3001)

# Local
cd src && npm install && npm run dev
```

For the visual-parity rule, architecture, what to edit/not edit, and per-task playbooks, see [`src/CLAUDE.md`](src/CLAUDE.md). For dev-facing onboarding, see [`src/README.md`](src/README.md).
