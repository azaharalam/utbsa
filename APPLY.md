# The last two bundles, combined

`utbsa-bulk` and `utbsa-staging` in one, with the newest version of every file
— including all the deploy scripts. Apply this and you are current.

```bash
cd ~/Desktop/Projects/utbsa-own
cp -r ~/Downloads/utbsa-final/. .
rm -rf .next
npm run doctor
git add -A && git commit -m "ready to deploy" && git push
```

---

## 1. Batch email that survives a rate limit

**This one matters before Friday.** SES sandbox allows **1 email per second**,
and even in production there is a rate cap.

The old dues reminder was:

```ts
for (const r of rows) {
  await sendMail({ to: r.email, ... });   // one throw kills the batch
}
```

Send to a hundred members and the rate limit trips partway. The action throws,
the treasurer sees a generic error, and **nothing indicates sixty already
went**. The natural response is to retry — which sends those sixty a second
copy and burns the quota twice.

Now each recipient is attempted independently:

```
Sent to 60 members. Stopped before 40 members. The email provider has refused
further messages for now — usually the daily limit. Nobody was written to
twice — send the rest tomorrow and only those who were missed will get it.
```

There is a 120ms pause between messages, which keeps you under the 1/second
sandbox limit without any scheduling.

## 2. Staging safety, and robots.txt

**`MAIL_REDIRECT_TO`** — when set, every email goes to that one address
regardless of who it was addressed to, with the intended recipient in the
subject. Without it, testing the dues reminder on staging emails your real
membership, and there is no recall.

The doctor fails if `STAGING=true` with live unredirected mail, and also fails
if `MAIL_REDIRECT_TO` is ever set in production.

**`app/robots.ts`** — matters for production, not just staging. It tells search
engines to index the public site but never `/admin`, `/portal`, `/auth`, or
`/pay`. You want this live on day one.

**A red banner** on every page when `STAGING=true`, so staging cannot be
mistaken for the real site.

**`lib/mail.ts`** also fixes the fallback sender from `noreply@utbsa.org` — a
domain you do not own, which SES would reject — to `noreply@utoledobsa.org`.

## 3. All the deploy scripts

`bootstrap.sh`, `deploy.sh`, `backup.sh`, the nginx configs, the systemd units,
and the three guides: `LAUNCH.md`, `DEPLOY.md`, `STAGING.md`.

They live in the repo, so the droplet gets them with the clone and the next
person inherits them.

---

## Then

```bash
git push
```

and on the droplet, after `bootstrap.sh`:

```bash
cd /srv && git clone https://github.com/azaharalam/utbsa.git utbsa
```

Your branch is **master**, not main — worth remembering.
