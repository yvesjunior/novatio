#!/usr/bin/env sh
# One-time data migration: copy submissions (leads / contacts / newsletter) from
# the OLD containerized Postgres into the HOST's Postgres that production now uses
# (docker-compose.prod.yml no longer runs a db container).
#
# Run this ON THE BOX that currently holds the data — the source container must be
# running. It dumps the container DB (schema + data + Drizzle migration state) and
# loads it into TARGET_DATABASE_URL. The source is left untouched.
#
# IMPORTANT: point it at a FRESH/empty target database, and run it BEFORE the app
# first boots against the host DB. The dump carries the __drizzle_migrations table,
# so the app's boot migration then no-ops and your rows are preserved. If the app
# already created empty tables in the target, drop & recreate that database first
# (or the load will error on "relation already exists").
#
# Usage:
#   TARGET_DATABASE_URL=postgres://user:pass@localhost:5432/nanopods ./migrate-db.sh
#
# Optional overrides: SRC_CONTAINER (default nanopods-house-db), SRC_USER, SRC_DB.
set -eu

SRC_CONTAINER="${SRC_CONTAINER:-nanopods-house-db}"
SRC_USER="${SRC_USER:-nanopods}"
SRC_DB="${SRC_DB:-nanopods}"
: "${TARGET_DATABASE_URL:?set TARGET_DATABASE_URL to the host Postgres connection string}"

STAMP="$(date +%Y%m%d-%H%M%S)"
DUMP="nanopods-${STAMP}.sql"

echo "[1/3] Dumping '${SRC_DB}' from container '${SRC_CONTAINER}' -> ${DUMP}"
docker exec "${SRC_CONTAINER}" pg_dump -U "${SRC_USER}" "${SRC_DB}" > "${DUMP}"
echo "      dump size: $(du -h "${DUMP}" | cut -f1)"

echo "[2/3] Loading into the target host Postgres (source is untouched)"
psql "${TARGET_DATABASE_URL}" -v ON_ERROR_STOP=1 -f "${DUMP}"

echo "[3/3] Done. Backup kept at ${DUMP}."
echo "Verify:  psql \"${TARGET_DATABASE_URL}\" -c 'select count(*) from leads;'"
