# A staging site at test.utoledobsa.org

Same droplet, second copy: its own database, its own port, its own systemd
service, and — the important part — **no ability to email a real member**.

Set this up *after* production is working, not before.

---

## The danger this is built around

A staging site with real SMTP credentials can email your entire membership.
Clicking "send reminders" to see whether it works would send a hundred real
people a real email from a test system, and there is no recall.

So staging sets `MAIL_REDIRECT_TO`. Every message goes to that one address
regardless of who it was addressed to, with the intended recipient in the
subject line:

```
To:      you@example.com
Subject: [staging → rafid@rockets.utoledo.edu] UTBSA dues — no rush
```

The doctor **fails** if `STAGING=true` and mail is live without a redirect,
and also fails if `MAIL_REDIRECT_TO` is ever set in production.

---

## 1. Droplet size

Two Next.js apps plus Postgres on 1 GB is tight. Either resize to the $12
2 GB droplet, or add swap:

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

Swap is enough for a staging site that is idle most of the time.

## 2. Database

```bash
sudo -u postgres createdb utbsa_staging -O utbsa
```

## 3. The code

```bash
cd /srv
sudo -u deploy git clone YOUR_REPO_URL utbsa-staging
cd utbsa-staging
npm ci

sudo mkdir -p /var/lib/utbsa-staging/uploads/avatars
sudo chown -R utbsa:utbsa /var/lib/utbsa-staging
rm -rf public/uploads
ln -s /var/lib/utbsa-staging/uploads public/uploads
```

## 4. Environment

`/srv/utbsa-staging/.env.production`:

```bash
NODE_ENV=production
STAGING=true

DATABASE_URL=postgres://utbsa:YOUR_DB_PASSWORD@localhost:5432/utbsa_staging

# A DIFFERENT secret from production. Sharing it means a production session
# cookie works on staging and vice versa.
SESSION_SECRET=

NEXT_PUBLIC_SITE_URL=https://test.utoledobsa.org
NEXT_PUBLIC_PROD_URL=https://utoledobsa.org

MAIL_TRANSPORT=smtp
SMTP_HOST=email-smtp.us-east-2.amazonaws.com
SMTP_PORT=2587   # NOT 587 — DigitalOcean blocks it
SMTP_USER=
SMTP_PASS=
MAIL_FROM="UTBSA staging <noreply@utoledobsa.org>"

# THE IMPORTANT LINE. Without it, staging emails real members.
MAIL_REDIRECT_TO=your.own@email.com
```

```bash
chmod 600 .env.production
sudo chown utbsa:utbsa .env.production
```

## 5. Build and run

```bash
npm run build
npm run db:migrate
npm run db:seed
npm run db:demo          # demo data is fine here — that is the point
npm run doctor           # should say "staging cannot email real members"

sudo cp deploy/utbsa-staging.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now utbsa-staging
```

## 6. DNS and nginx

Cloudflare → DNS:

| Type | Name | Content | Proxy |
|---|---|---|---|
| A | `test` | DROPLET_IP | **DNS only** |

```bash
sudo apt install -y apache2-utils
sudo htpasswd -c /etc/nginx/.htpasswd-staging utbsa
# store that password in Bitwarden

sudo cp deploy/nginx-staging.conf /etc/nginx/sites-available/utbsa-staging
sudo ln -s /etc/nginx/sites-available/utbsa-staging /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

sudo certbot --nginx -d test.utoledobsa.org
```

The HTTP password stops anyone stumbling in. `robots.ts` returns
`Disallow: /` when `STAGING=true`, and nginx sends `X-Robots-Tag: noindex`.

A staging site in Google results for "UTBSA" is worse than no site — members
find it, sign up, and wonder why nothing works.

---

## Working with it

**Deploy to staging first, always:**

```bash
cd /srv/utbsa-staging && git pull && npm ci && npm run build \
  && npm run db:migrate && npm run doctor && sudo systemctl restart utbsa-staging
```

Test. Then production:

```bash
cd /srv/utbsa && ./deploy/deploy.sh
```

**Testing against realistic data:**

```bash
sudo cp deploy/refresh-staging.sh /usr/local/bin/utbsa-refresh-staging
sudo chmod +x /usr/local/bin/utbsa-refresh-staging
sudo /usr/local/bin/utbsa-refresh-staging
```

Copies production down and **scrubs every email address and phone number**,
then deletes all sessions and tokens. Names and amounts stay, so the data
still looks real.

Even with the mail redirect, real addresses should not sit in a database on a
host with a weaker password and an HTTP login.

---

## The rule

**A migration runs on staging before it runs on production.** That is the
whole reason this exists. Migrations are the one thing that cannot be rolled
back by restarting.
