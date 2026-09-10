# Scripts never read .env.production

**2 files.** This would have hit production exactly the same way.

```bash
cd ~/Desktop/Projects/utbsa-own
cp -r ~/Downloads/utbsa-envfix/. .
git add -A && git commit -m "scripts read .env.production" && git push
```

Then on the droplet:

```bash
cd /srv/utbsa-staging
git pull
npm run db:migrate
npm run db:seed
npm run db:demo
npm run doctor
```

---

## What happened

`scripts/env.ts` loaded only `.env.local`. On the droplet that file does not
exist, so `DATABASE_URL` was never set — and `postgres` fell back to its
default, which is *connect as the current OS user*. Hence:

```
password authentication failed for user "deploy"
```

Which sounds like a Postgres problem and is actually a file that was never
read. The doctor made it worse by telling you to
`sudo systemctl start postgresql`, when Postgres was running perfectly.

The build worked because **Next.js loads `.env.production` itself**. Only the
standalone scripts were blind to it.

## Fixed

`scripts/env.ts` now looks for `.env.local`, then `.env.production`, then
`.env` — first definition wins, mirroring Next's own order. Your laptop keeps
using `.env.local`; the droplet picks up `.env.production`.

If no `DATABASE_URL` is found it now says so, listing which files it looked for
and which it found, instead of failing later with a misleading Postgres error.

`DEBUG_ENV=1 npm run doctor` prints which file was loaded.

The doctor also distinguishes a wrong password from a stopped server, rather
than suggesting the same fix for both.

## About the font warnings

Ignore them. The build retried and succeeded — `✓ Compiled successfully` and
all 49 routes. Next caches the fonts after the first successful fetch, so
later builds will not even try.
