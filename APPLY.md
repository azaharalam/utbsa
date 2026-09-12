# Signup confirmation never arrived for students

**2 files, no migration. Deploy this one.**

```bash
cd ~/Desktop/Projects/utbsa-own
cp -r ~/Downloads/utbsa-signupfix/. .
npm run build && npm run doctor
git add -A && git commit -m "signup confirmation goes to the personal address" && git push
```

Then on the droplet:

```bash
cd /srv/utbsa-staging && ./deploy/deploy.sh
cd /srv/utbsa && ./deploy/deploy.sh
```

---

## What it was

```ts
const primary = joiningAs === 'student' ? university : personal;
```

For a student the confirmation went to their @rockets.utoledo.edu address,
which UToledo quarantines. It never reached them and nothing bounced.

Approval and sign-in both use `members.email`, which migration 019 set to the
personal address, so those arrived normally. That is why it looked like only
signup was broken.

Only students were affected. Alumni, spouses and community members were
already getting the personal address.

| Joining as | Went to | Goes to now |
|---|---|---|
| student | ut@rockets.utoledo.edu | ut.personal@gmail.com |
| alumni | old@gmail.com | unchanged |
| spouse | spouse@gmail.com | unchanged |
| community | friend@gmail.com | unchanged |

## The fix

`const primary = personal || university;`

Same rule as `contactEmail()` and as sign-in. The university address still
identifies them and still signs them in. We just do not write to it.

The token is issued against the same address, and `verify` matches on any of a
member's addresses, so nothing else needed changing.

## A doctor check

**"signup writes to the address we can reach"** fails if that branch comes
back. Verified in both directions.

## For anyone stuck

People who signed up and got nothing already have a pending account. Once this
is deployed they can go to `/auth/login`, enter either address, and the link
will reach them. No need to sign up again.
