#!/usr/bin/env bash
#
# Prepares a fresh Ubuntu 24.04 droplet for UTBSA.
#
# Run as your sudo user (deploy), NOT as root:
#   scp deploy/bootstrap.sh deploy@DROPLET_IP:~
#   ssh deploy@DROPLET_IP
#   chmod +x bootstrap.sh && ./bootstrap.sh
#
# Installs packages, creates the database, makes the directories, and sets up
# swap. It does NOT touch your code or your .env — those come after.
#
# Safe to run twice.

set -euo pipefail

echo "════ UTBSA droplet bootstrap ════"
echo

# ── swap ──────────────────────────────────────────────────────
# 1 GB is tight for Node plus Postgres, and tighter still if you add staging.
# Swap is cheap insurance against the build being killed mid-way.
if [ ! -f /swapfile ]; then
  echo "→ swap (2 GB)"
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile > /dev/null
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab > /dev/null
else
  echo "→ swap already present"
fi

# ── packages ──────────────────────────────────────────────────
echo "→ system packages"
sudo apt-get update -qq
sudo apt-get install -y -qq postgresql nginx git curl ufw \
     certbot python3-certbot-nginx apache2-utils rsync

if ! command -v node > /dev/null || [ "$(node -v | cut -d. -f1)" != "v20" ]; then
  echo "→ Node 20  (Ubuntu's own package is too old for Next 14)"
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - > /dev/null
  sudo apt-get install -y -qq nodejs
fi
echo "   node $(node -v), npm $(npm -v)"

# ── firewall ──────────────────────────────────────────────────
echo "→ firewall"
sudo ufw allow OpenSSH > /dev/null
sudo ufw allow 'Nginx Full' > /dev/null
sudo ufw --force enable > /dev/null
echo "   ssh and http/https open, everything else closed"

# ── database ──────────────────────────────────────────────────
DB_PASS_FILE=~/.utbsa-db-password
if [ ! -f "$DB_PASS_FILE" ]; then
  DB_PASS=$(openssl rand -base64 32 | tr -d '/+=' | head -c 32)
  echo "$DB_PASS" > "$DB_PASS_FILE"
  chmod 600 "$DB_PASS_FILE"
else
  DB_PASS=$(cat "$DB_PASS_FILE")
  echo "→ reusing the database password from $DB_PASS_FILE"
fi

echo "→ database"
sudo -u postgres psql -qtA <<SQL
select 'create database utbsa' where not exists (select from pg_database where datname='utbsa')\gexec
SQL
sudo -u postgres psql -qtA <<SQL
do \$\$ begin
  if not exists (select from pg_roles where rolname='utbsa') then
    create user utbsa with encrypted password '${DB_PASS}';
  else
    alter user utbsa with encrypted password '${DB_PASS}';
  end if;
end \$\$;
SQL
sudo -u postgres psql -qtA -c "grant all privileges on database utbsa to utbsa;"
sudo -u postgres psql -qtA -d utbsa -c "grant all on schema public to utbsa;"
echo "   database utbsa, user utbsa"

# ── app user and directories ──────────────────────────────────
echo "→ directories"
if ! id utbsa > /dev/null 2>&1; then
  sudo adduser --system --group --no-create-home --home /srv/utbsa utbsa
fi
sudo mkdir -p /srv/utbsa /var/log/utbsa /var/lib/utbsa/uploads/avatars /var/backups/utbsa
sudo chown -R "$USER":utbsa /srv/utbsa /var/log/utbsa
sudo chown -R utbsa:utbsa /var/lib/utbsa
sudo chmod 775 /var/log/utbsa

# ── generated secrets ─────────────────────────────────────────
SECRET=$(openssl rand -base64 48)

echo
echo "════ done ════"
echo
echo "Put these in /srv/utbsa/.env.production — and in Bitwarden."
echo
echo "DATABASE_URL=postgres://utbsa:${DB_PASS}@localhost:5432/utbsa"
echo "SESSION_SECRET=${SECRET}"
echo
echo "The database password is also saved at $DB_PASS_FILE"
echo
echo "Next:"
echo "  1. get the code into /srv/utbsa"
echo "  2. write .env.production  (chmod 600)"
echo "  3. npm ci && npm run build && npm run db:migrate && npm run db:seed"
echo "  4. rm -rf public/uploads && ln -s /var/lib/utbsa/uploads public/uploads"
echo "  5. systemd, nginx, certbot"
