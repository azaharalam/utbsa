# Deploying UTBSA on DigitalOcean

Two to three hours the first time. Do it on the 9th, not the 10th — DNS and
certificates both involve waiting, and waiting is what makes launches slip.

Replace `YOUR_DOMAIN` throughout with your actual domain.

---

## 1. The droplet

**Ubuntu 24.04, Basic, Regular SSD, $6/mo (1 GB / 1 vCPU).** That is enough:
a few hundred members and a Next.js app idle at well under 512 MB.

Choose the region nearest Toledo — **NYC1** or **TOR1**.

Add your SSH key during creation. Do not use a password.

**Enable backups** at creation ($1.20/mo). It is the cheapest insurance you
will ever buy, and it covers the mistakes the nightly `pg_dump` does not — like
deleting the droplet.

### First ten minutes

```bash
ssh root@YOUR_DROPLET_IP

adduser deploy
usermod -aG sudo deploy
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy
```

Lock down SSH — in `/etc/ssh/sshd_config`:

```
PermitRootLogin no
PasswordAuthentication no
```

```bash
systemctl restart ssh
```

**Open a second terminal and confirm `ssh deploy@YOUR_DROPLET_IP` works before
closing the first one.** Locking yourself out of a fresh droplet is a rite of
passage worth skipping.

```bash
ufw allow OpenSSH && ufw allow 'Nginx Full' && ufw enable
apt update && apt upgrade -y
```

### Before you close that terminal — a second way in

Disabling SSH passwords locks out SSH, not the machine. DigitalOcean's browser
Console is a virtual monitor attached to the droplet and does not go through
SSH at all, so **a lost laptop is recoverable**:

1. DigitalOcean → the droplet → **Access** → **Reset root password**. They
   email a temporary one.
2. **Launch Droplet Console** — a terminal in the browser.
3. Log in as root, set a new password when prompted.
4. `nano /home/deploy/.ssh/authorized_keys` and paste a new public key.

That path depends on one thing: reaching the DigitalOcean account. If that is
on a personal address with 2FA on the phone you also lost, the console will not
help you.

So do these three now, while it is easy:

**A second SSH key.** Generate one and keep the private key in a password
manager that syncs — not only on the laptop.

```bash
ssh-keygen -t ed25519 -C "utbsa backup key" -f ~/.ssh/utbsa_backup
cat ~/.ssh/utbsa_backup.pub    # append to /home/deploy/.ssh/authorized_keys
```

Store `~/.ssh/utbsa_backup` (the file without `.pub`) in 1Password or Bitwarden.
Now a dead laptop is an inconvenience rather than an incident.

**A second person on the DigitalOcean team.** Settings → Team → invite Khokon.
Two people who can reach the console.

**The account itself on `utbsa.toledo@gmail.com`**, not your personal address.
Same for the domain registrar.

That last one is the real risk, and it is the same problem the office handover
solves in the app: a droplet on a personal account is fine until that person
graduates, and then UTBSA owns a website nobody can administer or renew. Every
student organisation loses a website this way eventually.

---

## 2. Software

```bash
sudo apt install -y postgresql nginx git curl certbot python3-certbot-nginx

# Node 20 — Ubuntu's own package is too old for Next 14
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v    # expect v20.x
```

---

## 3. Database

```bash
sudo -u postgres psql
```

```sql
create database utbsa;
create user utbsa with encrypted password 'PUT_A_LONG_RANDOM_PASSWORD_HERE';
grant all privileges on database utbsa to utbsa;
\c utbsa
grant all on schema public to utbsa;
\q
```

Generate that password rather than inventing one: `openssl rand -base64 32`.

Postgres listens only on localhost by default, which is what you want. Do not
change that.

---

## 4. The app

```bash
sudo mkdir -p /srv/utbsa /var/log/utbsa
sudo adduser --system --group --no-create-home --home /srv/utbsa utbsa
sudo chown -R deploy:utbsa /srv/utbsa /var/log/utbsa

cd /srv
git clone YOUR_REPO_URL utbsa      # or rsync the folder up
cd utbsa
npm ci
```

### Uploads must outlive deploys

Member photos live in `public/uploads`. Left where they are, a `git pull` that
touches that directory takes them with it.

```bash
sudo mkdir -p /var/lib/utbsa/uploads/avatars
sudo chown -R utbsa:utbsa /var/lib/utbsa
rm -rf /srv/utbsa/public/uploads
ln -s /var/lib/utbsa/uploads /srv/utbsa/public/uploads
```

Now the photos live outside the repository and the app never notices.

---

## 5. Environment

```bash
nano /srv/utbsa/.env.production
```

```bash
NODE_ENV=production
DATABASE_URL=postgres://utbsa:THAT_PASSWORD@localhost:5432/utbsa

# A NEW one. Never the development value.
#   openssl rand -base64 48
SESSION_SECRET=

NEXT_PUBLIC_SITE_URL=https://YOUR_DOMAIN

MAIL_TRANSPORT=smtp
SMTP_HOST=
SMTP_PORT=2587   # NOT 587 — DigitalOcean blocks it
SMTP_USER=
SMTP_PASS=
MAIL_FROM="UTBSA <noreply@YOUR_DOMAIN>"
```

```bash
chmod 600 /srv/utbsa/.env.production
sudo chown utbsa:utbsa /srv/utbsa/.env.production
```

`NEXT_PUBLIC_SITE_URL` has to be the real `https://` address. Every magic link
in every email is built from it — get it wrong and nobody can sign in.

---

## 6. Build and migrate

```bash
cd /srv/utbsa
npm run build
npm run db:migrate
npm run db:seed          # terms, funds, settings — NOT the demo data
npm run doctor
```

The doctor should report email as configured now rather than printing to the
terminal. If it still says console, the env file is not being read.

**Do not run `npm run db:demo` on production.** If you already have, clear it
with `npm run db:demo -- wipe`.

---

## 7. Run it

```bash
sudo cp deploy/utbsa.service /etc/systemd/system/
sudo nano /etc/systemd/system/utbsa.service    # check the ExecStart path
sudo systemctl daemon-reload
sudo systemctl enable --now utbsa
sudo systemctl status utbsa
```

If it will not start: `sudo journalctl -u utbsa -n 50`.

---

## 8. Domain and HTTPS

Point DNS at the droplet **first** — propagation is the slow part:

| Type | Name | Value |
|---|---|---|
| A | @ | YOUR_DROPLET_IP |
| A | www | YOUR_DROPLET_IP |

Wait until `dig +short YOUR_DOMAIN` returns your IP. Then:

```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/utbsa
sudo sed -i 's/YOUR_DOMAIN/your-actual-domain.com/g' /etc/nginx/sites-available/utbsa
sudo ln -s /etc/nginx/sites-available/utbsa /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

sudo certbot --nginx -d YOUR_DOMAIN -d www.YOUR_DOMAIN
```

Certbot edits the config and installs a renewal timer. Check it:
`sudo certbot renew --dry-run`.

---

## 9. Backups, before launch

```bash
sudo cp deploy/backup.sh /usr/local/bin/utbsa-backup
sudo chmod +x /usr/local/bin/utbsa-backup
sudo /usr/local/bin/utbsa-backup          # run it once now
sudo crontab -e
```

```
15 3 * * * /usr/local/bin/utbsa-backup >> /var/log/utbsa/backup.log 2>&1
```

**Then restore it.** The commands are at the bottom of `backup.sh`. An
untested backup is a belief, not a backup, and the day you find out is the
worst possible day.

---

## 10. First admin

```bash
cd /srv/utbsa
npm run db:admin -- your.email@rockets.utoledo.edu
```

Then sign in at `https://YOUR_DOMAIN/auth/login` and **check the email
actually arrives**. This is the single most important test on this page — the
site works perfectly with broken mail, and nobody can get in.

---

## Later deploys

```bash
ssh deploy@YOUR_DROPLET_IP
cd /srv/utbsa
./deploy/deploy.sh
```

It builds before it migrates and restarts, so a failed build leaves the running
site untouched.

---

## Before you tell anyone the address

- [ ] A sign-in link arrives at a **real inbox, not yours** — test with a
      friend's address on their phone
- [ ] Join, approve, sign in works end to end from a phone on mobile data
- [ ] `npm run doctor` is clean
- [ ] Demo data is gone: `npm run db:demo -- wipe`
- [ ] Two people hold an office with full access
- [ ] A backup has been taken **and restored**
- [ ] The domain, droplet, and email account are registered to a UTBSA
      address, not a personal one — this is the thing that strands the next
      e-board
- [ ] A second SSH key exists and its private half is in a password manager
- [ ] A second person is on the DigitalOcean team
- [ ] Somebody other than you has signed in to the droplet at least once

---

## If something breaks

```bash
sudo journalctl -u utbsa -n 100 --no-pager    # app logs
sudo tail -50 /var/log/nginx/error.log        # nginx
sudo systemctl restart utbsa
npm run doctor
```

**502 Bad Gateway** — the app is not running. Check journalctl.

**Emails not arriving** — check `MAIL_TRANSPORT=smtp` is set, then look for
SMTP errors in the app log. Also check spam; a new domain has no sending
reputation, which is what SPF and DKIM records are for.

**Photos vanished after a deploy** — the symlink in step 4 was not set up.

**Sign-in links point at localhost** — `NEXT_PUBLIC_SITE_URL` is wrong. Fix it
and rebuild; it is baked in at build time.

**Locked out of SSH** — DigitalOcean → droplet → Access → Reset root password,
then Launch Droplet Console. Add a fresh public key to
`/home/deploy/.ssh/authorized_keys`. The console is not SSH, so disabling
password login does not close it.

**Locked out of DigitalOcean itself** — this is the one with no technical fix,
which is why the account belongs on the organisation's email with a second
person on the team. If it has already happened, DigitalOcean support can help,
but only if the account is verifiably yours.
