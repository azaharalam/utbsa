#!/usr/bin/env bash
#
# Pull, build, migrate, restart. Run as the utbsa user from /srv/utbsa.
#
# Deliberately builds BEFORE migrating and restarting: if the build fails,
# the running site is untouched and nobody notices.

set -euo pipefail
cd /srv/utbsa

echo "→ pulling"
git pull --ff-only

echo "→ installing"
npm ci --omit=dev --ignore-scripts
npm install --no-save --ignore-scripts    # dev deps needed to build

echo "→ building"
npm run build

echo "→ migrating"
npm run db:migrate

echo "→ checking"
npm run doctor || echo "  (doctor reported problems — look at them)"

echo "→ restarting"
sudo systemctl restart utbsa

sleep 3
if curl -sf http://127.0.0.1:3000 > /dev/null; then
  echo "✓ up"
else
  echo "✗ not responding — sudo journalctl -u utbsa -n 50"
  exit 1
fi
