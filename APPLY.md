# Write to personal addresses, and fix the check-email page

**6 files, one migration.** The first part is a launch blocker.

```bash
cd ~/Desktop/Projects/utbsa-own
cp -r ~/Downloads/utbsa-personal/. .
npm run build
git add -A && git commit -m "write to personal addresses" && git push
```

Then on the droplet, **staging first**:

```bash
cd /srv/utbsa-staging && git pull && npm ci && npm run build \
  && npm run db:migrate && npm run doctor && sudo systemctl restart utbsa-staging

cd /srv/utbsa && git pull && npm ci && npm run build \
  && npm run db:migrate && npm run doctor && sudo systemctl restart utbsa
```

---

## 1. The blocker

Your rockets messages were in **quarantine**, not the inbox. You only saw them
because you went looking; a member never would.

Brevo reports "Delivered" because UToledo's server accepted the message — and
then held it. Nothing bounces, nothing is logged, nothing arrives.

Every student's contact address was a rockets address. So on Friday: students
sign up, the confirmation is quarantined, and they cannot get in. They would
not report it — they would assume the site was broken.

**Now the app writes to the personal address for everyone.** Gmail delivered
to the inbox and was opened tonight, so it works today.

The migration updates existing members, including all nine officers — without
it, the change would only affect people who join later and you would all still
be quarantined tomorrow.

**Both addresses still sign you in.** `findByEmail` matches `email`,
`university_email`, or `personal_email`. This changes where we write, not who
can get in. Verified with both of your addresses.

A doctor check now fails if any active member is written to at a
non-personal address.

### Still worth doing

Have your president ask UToledo IT to allow `utoledobsa.org` — valid SPF,
DKIM and DMARC, transactional mail only, to students who signed up themselves.
Slow, but it is the proper fix, and it would let rockets addresses work again.

## 2. The check-email page

Before, a non-member saw *"We sent a link to aa@yopmail.com"* — a flat claim
that was untrue, and a dead end.

It now says *"If there is a UTBSA account for that address, a link is on its
way"*, then a clear second section: **Not a member yet?** with Join, Try
another address, Contact us, and Home.

The ambiguity is kept on purpose — naming which addresses have accounts would
turn the form into a membership lookup — but it no longer lies, and it no
longer strands anyone.

**The `MAIL_TRANSPORT=console` note is gone.** Developer instructions on a
page members see. A doctor check now greps for that pattern outside `/admin`.

Both pages also mention the spam folder, and ask people to mark it not-spam —
which is the fastest way to build the domain's reputation.
