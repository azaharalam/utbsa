# Getting it live — the whole sequence

Follow top to bottom. Roughly two hours, most of it waiting.

Fill these in as you go:

```
DROPLET_IP  = ................
DB_PASSWORD = ................    (bootstrap prints it)
SESSION_KEY = ................    (bootstrap prints it)
AWS_REGION  = ................
SMTP_USER   = ................
```

---

## Before you touch the server

Apply the outstanding code bundles locally and commit:

```bash
cd ~/Desktop/Projects/utbsa-own
for b in utbsa-menu utbsa-bulk utbsa-staging; do
  [ -d ~/Downloads/$b ] && cp -r ~/Downloads/$b/. . && echo "applied $b"
done
rm -rf .next && npm run doctor

git add -A && git commit -m "ready to deploy" && git push
```

If you have no git remote, see "Getting the code up" below — rsync works too.

---

## 1. Create the droplet

DigitalOcean → Create → Droplet

| | |
|---|---|
| Image | **Ubuntu 24.04 LTS** |
| Plan | Basic → Regular → **$6/mo** (1 GB), or $12 (2 GB) if you want staging too |
| Region | **NYC1** or **TOR1** |
| Auth | **SSH key** — add yours |
| Backups | **Enable** (+$1.20/mo — worth it) |
| Hostname | `utbsa` |

Note the IP.

## 2. Ten minutes of hardening

```bash
ssh root@DROPLET_IP

adduser deploy
usermod -aG sudo deploy
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy
```

`sudo nano /etc/ssh/sshd_config`:

```
PermitRootLogin no
PasswordAuthentication no
```

```bash
systemctl restart ssh
```

**Open a second terminal and check `ssh deploy@DROPLET_IP` works before
closing this one.**

Then add your backup SSH key (the one whose private half is in Bitwarden) to
`/home/deploy/.ssh/authorized_keys`.

## 3. Bootstrap

From your laptop:

```bash
scp deploy/bootstrap.sh deploy@DROPLET_IP:~
ssh deploy@DROPLET_IP
chmod +x bootstrap.sh && ./bootstrap.sh
```

Installs Node 20, Postgres, nginx, certbot; creates the database and a random
password; sets up swap, the firewall, and the directories.

**Copy the DATABASE_URL and SESSION_SECRET it prints. Into Bitwarden.**

## 4. Getting the code up

**With a git remote:**

```bash
cd /srv && sudo chown deploy:utbsa utbsa
git clone YOUR_REPO_URL utbsa && cd utbsa
```

**Without one**, from your laptop:

```bash
rsync -avz --exclude node_modules --exclude .next --exclude .env.local \
  ~/Desktop/Projects/utbsa-own/ deploy@DROPLET_IP:/srv/utbsa/
```

A git remote is worth having — `deploy.sh` assumes it, and it is how the next
person picks this up.

## 5. Environment

```bash
nano /srv/utbsa/.env.production
```

```bash
NODE_ENV=production
DATABASE_URL=postgres://utbsa:DB_PASSWORD@localhost:5432/utbsa
SESSION_SECRET=SESSION_KEY
NEXT_PUBLIC_SITE_URL=https://utoledobsa.org

MAIL_TRANSPORT=smtp
SMTP_HOST=email-smtp.AWS_REGION.amazonaws.com
SMTP_PORT=2587   # NOT 587 — DigitalOcean blocks it
SMTP_USER=
SMTP_PASS=
MAIL_FROM="UTBSA <noreply@utoledobsa.org>"
```

```bash
chmod 600 /srv/utbsa/.env.production
sudo chown utbsa:utbsa /srv/utbsa/.env.production
```

`NEXT_PUBLIC_SITE_URL` is baked in at **build time**. Set it before you build
or every sign-in link points at the wrong place.

## 6. Uploads, build, migrate

```bash
cd /srv/utbsa
rm -rf public/uploads
ln -s /var/lib/utbsa/uploads public/uploads

npm ci
npm run build
npm run db:migrate
npm run db:seed          # terms, funds, settings — NOT db:demo
npm run doctor
```

**Never `npm run db:demo` here.** If you have, clear it with
`npm run db:demo -- wipe`.

## 7. Run it

```bash
sudo cp deploy/utbsa.service /etc/systemd/system/
sudo nano /etc/systemd/system/utbsa.service   # check ExecStart matches `which npm`
sudo systemctl daemon-reload
sudo systemctl enable --now utbsa
sudo systemctl status utbsa
curl -I http://127.0.0.1:3000
```

Trouble: `sudo journalctl -u utbsa -n 50`

## 8. DNS

Cloudflare → utoledobsa.org → DNS → Records:

| Type | Name | Content | Proxy |
|---|---|---|---|
| A | `@` | DROPLET_IP | **DNS only** (grey) |
| A | `www` | DROPLET_IP | **DNS only** (grey) |

```bash
dig +short utoledobsa.org      # should print DROPLET_IP
```

Grey cloud. Orange breaks certbot's challenge.

## 9. nginx and HTTPS

```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/utbsa
sudo sed -i 's/YOUR_DOMAIN/utoledobsa.org/g' /etc/nginx/sites-available/utbsa
sudo ln -sf /etc/nginx/sites-available/utbsa /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

sudo certbot --nginx -d utoledobsa.org -d www.utoledobsa.org
sudo certbot renew --dry-run
```

`https://utoledobsa.org` should now load.

## 10. Backups — before launch, not after

```bash
sudo cp deploy/backup.sh /usr/local/bin/utbsa-backup
sudo chmod +x /usr/local/bin/utbsa-backup
sudo /usr/local/bin/utbsa-backup
sudo crontab -e
```

```
15 3 * * * /usr/local/bin/utbsa-backup >> /var/log/utbsa/backup.log 2>&1
```

**Then restore one** — commands are at the bottom of `backup.sh`. An untested
backup is a belief.

## 11. First admin, and the test that matters

```bash
cd /srv/utbsa
npm run db:admin -- your.email@rockets.utoledo.edu
```

Go to `https://utoledobsa.org/auth/login`, enter that address, and **check the
email arrives**. This is the one test that decides whether any of it works —
the site runs perfectly with broken mail and nobody can get in.

Then set `org_email` and the payment details at `/admin/settings`.

---

## Before you tell anyone the address

- [ ] A sign-in link reaches **someone else's** inbox, on their phone, on
      mobile data
- [ ] Join → approve → sign in works end to end
- [ ] `npm run doctor` clean
- [ ] No demo data
- [ ] Two people hold an office with full access
- [ ] A backup taken **and restored**
- [ ] Second SSH key works, from a second person
- [ ] Droplet, domain, AWS, and Gmail all on `official.utbsa@gmail.com`

---

## Afterwards

```bash
cd /srv/utbsa && ./deploy/deploy.sh
```

Builds before it migrates and restarts, so a failed build leaves the live site
untouched.

Staging comes later — `STAGING.md`.
