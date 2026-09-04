# UTBSA — Phase 1

Public website, member portal, and admin area for the University of Toledo
Bangladeshi Students Association.

**Next.js 14 · TypeScript · Tailwind · PostgreSQL.** No backend-as-a-service.
The database is yours, the session handling is yours, the authorization is yours.

---

## What you own here

| Piece | Where it lives |
|---|---|
| Schema and migrations | `db/migrations/*.sql`, run by `scripts/migrate.ts` |
| Sessions | `lib/session.ts` — random tokens, hashed at rest, DB-backed |
| Magic-link tokens | `lib/queries/tokens.ts` — single use, 30-minute expiry, rate limited |
| Roles and permissions | `lib/queries/members.ts` and `lib/session.ts` |
| File uploads | `app/api/upload/route.ts` — local disk |
| Email | `lib/mail.ts` — nodemailer, or printed to the terminal in development |

No vendor SDK anywhere. If you want to move hosts, you move a Postgres dump and
a folder of images.

---

## Setup — about 15 minutes

### 1. Start Postgres

Easiest is Docker:

```bash
docker compose up -d
```

That gives you Postgres 16 on `localhost:5432`, database `utbsa`, user `utbsa`,
password `utbsa_dev_password`, with data in a named volume so it survives restarts.

Already have Postgres installed locally? Skip Docker and just create a database:

```bash
createdb utbsa
```

Then point `DATABASE_URL` at it in the next step.

### 2. Configure

```bash
cp .env.example .env.local
```

Generate a session secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Paste it into `SESSION_SECRET`. Leave `MAIL_TRANSPORT=console` for now.

### 3. Install and migrate

```bash
npm install
npm run db:migrate
npm run db:seed
```

`db:migrate` applies every file in `db/migrations` that has not run yet, each in
its own transaction, and records it in a `_migrations` table. Running it twice is
safe.

### 4. Run

```bash
npm run dev
```

http://localhost:3000

### 5. Become the first admin

Go to `/join` and sign up with your real name and email.

Because `MAIL_TRANSPORT=console`, **the magic link is printed in your terminal** —
the one running `npm run dev`. It looks like this:

```
────────────────────────────────────────────────────────────
  EMAIL (not sent — MAIL_TRANSPORT is "console")
  To:      you@example.com
  Subject: Confirm your email — UTBSA
────────────────────────────────────────────────────────────
Welcome to UTBSA.

Confirm your email address by opening this link:

http://localhost:3000/auth/verify?token=xLq3...
```

Paste that URL into your browser. You will land on the "waiting for approval"
page, which is correct — nobody has approved you yet.

Now promote yourself:

```bash
npm run db:admin -- you@example.com
```

Refresh. `/portal` and `/admin` are open.

Everyone after you goes through the normal approval queue. This command exists
only to create the first admin.

---

## Everyday commands

```bash
npm run dev           # development server
npm run db:migrate    # apply pending migrations
npm run db:seed       # demo terms, events, posts (safe to re-run)
npm run db:admin -- email@example.com
npm run db:reset      # DROP EVERYTHING, dev only
npm run build         # production build
```

To start completely fresh:

```bash
npm run db:reset && npm run db:migrate && npm run db:seed
```

---

## How authentication works

There are no passwords anywhere in this codebase.

**Signing in**

1. Member submits their email.
2. We generate 32 random bytes, store `sha256(token)` in `login_tokens`, and email
   the raw token as a link.
3. They open `/auth/verify?token=…`. We hash what arrived and look for a matching
   row that is unconsumed and unexpired, marking it consumed **in the same UPDATE**
   so two simultaneous requests cannot both succeed.
4. We create a session: another 32 random bytes, `sha256` stored in `sessions`,
   raw value set as an httpOnly cookie for 30 days.

**Why hashes, not the tokens themselves**

If someone gets read access to your database — a leaked backup, a stolen laptop, a
teammate poking around — they still cannot sign in as anybody, because the stored
hash is not the cookie value. SHA-256 rather than bcrypt is deliberate: these
tokens already carry 256 bits of entropy, so there is nothing to brute-force.
Slow hashing is for low-entropy secrets like human-chosen passwords.

**Enumeration**

`/join` and `/auth/login` return the same response whether or not the address is
registered. Otherwise the form becomes a way to test which of your members exist.

**Rate limiting**

Five magic-link requests per email per hour. Without it, anyone can use your
signup form to send unlimited mail to a stranger's inbox.

---

## How authorization works — read this before adding a query

There is no row-level security. Postgres will hand any query exactly what it
asks for. **Your query layer is the only thing protecting member data.**

Three rules:

**1. Pages never write raw SQL against `members`.** They call functions in
`lib/queries/members.ts`. That file is the one place to audit.

**2. Anything that can return someone else's data takes the actor first, and
checks them.** Admin functions call `assertAdmin(actor)` at the top. That check is
duplicated with the route guard on purpose — a server action is a public HTTP
endpoint, and an attacker can call it directly without ever loading your page.

**3. Field privacy happens in the SELECT.**

```sql
case when show_phone then phone end as phone
```

A column the member switched off never leaves the database. Do not "optimise"
`directory()` into `select *`.

**Route guards** live in layouts, not middleware. Middleware runs on the Edge
runtime and cannot open a Postgres connection. `app/portal/layout.tsx` calls
`requireApproved()`; `app/admin/layout.tsx` calls `requireAdmin()`. Every child
page inherits it.

**Members cannot promote themselves.** `updateSelf()` takes a typed object with a
fixed field list. `role`, `status`, and `email` are simply not in it, so it does
not matter what a member POSTs.

**The last admin cannot be demoted.** `setRole()` counts remaining admins first.
`setStatus()` refuses to let you deactivate yourself. Both exist because locking
the whole e-board out of the admin area is a real failure mode.

---

## Email in production

Set in `.env.local`:

```
MAIL_TRANSPORT=smtp
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASS=your_api_key
MAIL_FROM="UTBSA <noreply@yourdomain.org>"
```

Resend, Postmark, and Amazon SES all work. Free tiers are far more than UTBSA
needs. Whichever you pick, set up SPF and DKIM on your domain or your approval
emails will land in spam.

---

## Deploying

**A VPS is the better fit for this build** — DigitalOcean, Hetzner, Linode, around
$6/month. You get a real filesystem, so avatar uploads work as written, and you
can run Postgres on the same box.

Rough shape:

```bash
npm ci
npm run build
npm run db:migrate
npm run start          # behind nginx or Caddy for TLS
```

Use a process manager (`pm2`, or a systemd unit) so it restarts on reboot.

**If you deploy to Vercel instead**, two things must change:

1. The filesystem is ephemeral. Replace the `writeFile` call in
   `app/api/upload/route.ts` with an S3 / Cloudflare R2 / Cloudinary upload.
   Nothing else in that file changes.
2. Use a hosted Postgres (Neon, Supabase's database alone, Railway) and set
   `DATABASE_URL` to it.

**Back up the database.** Nobody does this until the first time they need it.

```bash
pg_dump "$DATABASE_URL" | gzip > utbsa-$(date +%F).sql.gz
```

Put it in a cron job, send it somewhere off the server, and restore it once to
confirm the backup actually works.

---

## File map

```
app/
  (site)/         public pages
  auth/           login, check-email, verify (magic link lands here), pending
  portal/         member area — guarded by requireApproved() in its layout
  admin/          guarded by requireAdmin() in its layout
  actions/        server actions — every write goes through here
  api/upload/     avatar upload
components/       ui.tsx, header, footer, nav
lib/
  db.ts           connection pool
  crypto.ts       token generation and hashing
  session.ts      create/read/destroy sessions, requireMember/Approved/Admin
  audit.ts        who did what
  mail.ts         nodemailer, or console in development
  queries/        members.ts, content.ts, tokens.ts  ← authorization lives here
db/migrations/    numbered .sql files
scripts/          migrate, seed, reset, make-admin
```

---

## Adding a migration

Never edit a migration that has already run — it will not re-apply. Add a new one:

```bash
# db/migrations/002_add_dues.sql
create table dues ( ... );
```

```bash
npm run db:migrate
```

Filenames sort lexicographically, so keep the numeric prefix and zero-pad.

---

## Troubleshooting

**`ECONNREFUSED 127.0.0.1:5432`** — Postgres is not running. `docker compose up -d`.

**`relation "members" does not exist`** — migrations have not run. `npm run db:migrate`.

**No email arrives** — with `MAIL_TRANSPORT=console` there is no email. Look in the
terminal running `npm run dev` and copy the link from there.

**"Link expired" on a link you just clicked** — tokens are single use. Some
corporate mail scanners follow links before you do, which consumes them. Request a
new one; in production this is a reason to prefer a provider that does not prefetch.

**Stuck on /auth/pending** — correct until an admin approves you. First account:
`npm run db:admin -- your@email`.

**Changed `.env.local` and nothing happened** — restart the dev server. Environment
variables are read at boot.

**Too many connections** — you edited `lib/db.ts` and removed the `globalThis`
caching. Hot reload opens a fresh pool on every save without it.
