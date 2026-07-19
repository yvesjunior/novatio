#!/usr/bin/env bash
#
# build-prod-image.sh — build the linux/amd64 production image and save a tarball.
#
# Run on your Mac (arm64). Builds the same image the prod compose uses, with
# static_site + i18n baked in, for the amd64 GCP VM. Optionally ships it.
#
#   ./build-prod-image.sh            # build + save nanopods-web-amd64.tar.gz
#   ./build-prod-image.sh --ship     # also stream to the VM and recreate the container
#
# Override defaults via env vars, e.g.:
#   VM=ecommerce ZONE=us-central1-a ./build-prod-image.sh --ship
#
set -euo pipefail
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

IMAGE="${IMAGE:-nanopods-house-web:latest}"
PLATFORM="${PLATFORM:-linux/amd64}"
OUT="${OUT:-nanopods-web-amd64.tar.gz}"
VM="${VM:-ecommerce}"
ZONE="${ZONE:-us-central1-a}"
REMOTE_DIR="${REMOTE_DIR:-/home/kiwanomotortracking/workspace/project/novatio}"

SHIP=0
[[ "${1:-}" == "--ship" ]] && SHIP=1

log(){ printf '\n\033[1;33m▶ %s\033[0m\n' "$*"; }

command -v docker >/dev/null || { echo "✗ docker not found" >&2; exit 1; }
docker buildx version >/dev/null 2>&1 || { echo "✗ docker buildx not available" >&2; exit 1; }

log "Building $IMAGE for $PLATFORM"
docker buildx build --platform "$PLATFORM" -f infra/web/Dockerfile -t "$IMAGE" --load .

log "Image details"
docker image inspect "$IMAGE" --format 'arch={{.Os}}/{{.Architecture}}  size={{.Size}} bytes'

log "Saving -> $OUT"
docker save "$IMAGE" | gzip > "$OUT"
ls -lh "$OUT"

if [[ "$SHIP" -eq 1 ]]; then
  command -v gcloud >/dev/null || { echo "✗ gcloud not found (needed for --ship)" >&2; exit 1; }
  log "Streaming image to $VM ($ZONE) — no tarball stored on the VM"
  docker save "$IMAGE" | gzip | gcloud compute ssh "$VM" --zone "$ZONE" -- 'gunzip | sudo docker load'
  log "Recreating the container on $VM"
  gcloud compute ssh "$VM" --zone "$ZONE" -- "cd '$REMOTE_DIR' && sudo docker compose -f docker-compose.prod.yml up -d --force-recreate && sudo docker compose -f docker-compose.prod.yml ps"
  log "✓ Shipped and running on $VM."
else
  cat <<EOF

✓ Built $OUT. To ship it to the VM (no tarball stored remotely):

  docker save $IMAGE | gzip | gcloud compute ssh $VM --zone $ZONE -- 'gunzip | sudo docker load'
  gcloud compute ssh $VM --zone $ZONE -- "cd '$REMOTE_DIR' && sudo docker compose -f docker-compose.prod.yml up -d --force-recreate"

…or just re-run:  ./build-prod-image.sh --ship
EOF
fi
