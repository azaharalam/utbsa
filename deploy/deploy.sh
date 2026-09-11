#!/usr/bin/env bash
#
# Pull, build, migrate, restart. Run as the utbsa user from /srv/utbsa.
#
#   ./deploy/deploy.sh
#
# Deliberately builds BEFORE migrating and restarting: if the build fails,
# the running site is untouched and nobody notices.

set -euo pipefail
cd "$(dirname "$0")/.."
APP_DIR="$PWD"
SERVICE="$(basename "$APP_DIR")"          # utbsa, or utbsa-staging

echo "→ deploying $SERVICE from $APP_DIR"

echo "→ pulling"
git pull --ff-only

echo "→ installing"
npm ci

# ── keep the previous build's chunks ──────────────────────────
#
# Next generates new chunk filenames every build, and `next build` replaces
# .next wholesale. Anyone with the site already open is holding references to
# the old filenames — and nginx serves /_next/static straight off disk with a
# one-year immutable cache.
#
# So without this, deploying kills every open tab: the browser asks for a
# chunk that no longer exists, gets a 404, and the page dies with
# "ChunkLoadError". app/global-error.tsx recovers by reloading, but the person
# still sees a flicker, and mid-form they lose what they typed.
#
# Copying the old chunks back means old tabs keep working until they next
# reload. Costs a few megabytes.
PREVIOUS_STATIC=""
if [ -d "$APP_DIR/.next/static" ]; then
  PREVIOUS_STATIC="$(mktemp -d)"
  cp -r "$APP_DIR/.next/static/." "$PREVIOUS_STATIC/"
  echo "→ kept the previous build's chunks"
fi

echo "→ building"
npm run build

if [ -n "$PREVIOUS_STATIC" ]; then
  # -n so the new build always wins where filenames collide.
  cp -rn "$PREVIOUS_STATIC/." "$APP_DIR/.next/static/" 2>/dev/null || true
  rm -rf "$PREVIOUS_STATIC"
  echo "→ restored them alongside the new ones"
fi

echo "→ migrating"
npm run db:migrate

echo "→ checking"
npm run doctor || echo "  (doctor reported problems — look at them)"

echo "→ restarting"
sudo systemctl restart "$SERVICE"

PORT=3000
[ "$SERVICE" = "utbsa-staging" ] && PORT=3001

sleep 3
if curl -sf "http://127.0.0.1:$PORT" > /dev/null; then
  echo "✓ $SERVICE is up on $PORT"
else
  echo "✗ not responding — sudo journalctl -u $SERVICE -n 50"
  exit 1
fi
