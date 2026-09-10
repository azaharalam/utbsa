#!/usr/bin/env bash
#
# Nightly backup. Install with:
#   sudo cp deploy/backup.sh /usr/local/bin/utbsa-backup
#   sudo chmod +x /usr/local/bin/utbsa-backup
#   sudo crontab -e
#     15 3 * * * /usr/local/bin/utbsa-backup >> /var/log/utbsa/backup.log 2>&1
#
# An untested backup is not a backup. Restore one into a scratch database
# before you need to — the instructions are at the bottom of this file.

set -euo pipefail

BACKUP_DIR=/var/backups/utbsa
KEEP_DAYS=30
STAMP=$(date +%Y-%m-%d)

mkdir -p "$BACKUP_DIR"

# The database.
sudo -u postgres pg_dump -Fc utbsa > "$BACKUP_DIR/utbsa-$STAMP.dump"

# Member photos. They are not in the database and are not recoverable
# from anywhere else.
tar czf "$BACKUP_DIR/uploads-$STAMP.tar.gz" -C /srv/utbsa/public uploads

find "$BACKUP_DIR" -name '*.dump'    -mtime +$KEEP_DAYS -delete
find "$BACKUP_DIR" -name '*.tar.gz'  -mtime +$KEEP_DAYS -delete

echo "$(date -Is)  backed up to $BACKUP_DIR"

# Getting it off the machine matters as much as taking it. A backup that
# lives only on the droplet dies with the droplet. Uncomment once you have
# somewhere to put it:
#
#   rclone copy "$BACKUP_DIR" remote:utbsa-backups --max-age 2d
#
# ── restoring, to test or for real ────────────────────────────────────
#   sudo -u postgres createdb utbsa_restore_test
#   sudo -u postgres pg_restore -d utbsa_restore_test \
#        /var/backups/utbsa/utbsa-YYYY-MM-DD.dump
#   sudo -u postgres psql utbsa_restore_test -c 'select count(*) from members;'
#   sudo -u postgres dropdb utbsa_restore_test
