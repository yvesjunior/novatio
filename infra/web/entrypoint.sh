#!/bin/sh
# Container entrypoint: apply DB migrations, then start Next.
# Migrations are idempotent (drizzle tracks applied ones), so this is safe on
# every boot. If DATABASE_URL is unset, db-migrate exits non-zero and we stop —
# the app needs the DB.
set -e

echo "[entrypoint] running migrations…"
node scripts/db-migrate.mjs

echo "[entrypoint] starting Next…"
exec npx next start
