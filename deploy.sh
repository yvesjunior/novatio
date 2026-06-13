#!/usr/bin/env bash
#
# deploy.sh — build & run the Novatio web app with Docker (same as development).
# Requires a .env file in this directory (WEB_PORT + LEAD_* vars).
#
set -euo pipefail

# Run from the repo root, wherever this script is called from.
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

[[ -f .env ]] || { echo "✗ .env not found in $(pwd)" >&2; exit 1; }

docker compose up -d --build

echo "✓ Running. Logs: docker compose logs -f web"
