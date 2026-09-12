# Confirm first, then the approval queue

**6 files, no migration.** Includes the signup fix, so apply this instead of
`utbsa-signupfix` if you have not done that one yet.

```bash
cd ~/Desktop/Projects/utbsa-own
cp -r ~/Downloads/utbsa-confirm/. .
npm run build && npm run doctor
git add -A && git commit -m "confirm before approval" && git push
```

Then staging, then production.

---

## Two things, and they are connected

**The signup confirmation went to the university address.** Students only.
UToledo quarantines it, so nobody could confirm. Approval and sign-in worked
because both use `members.email`, which is the personal address. That is why
it looked like only signup was broken.

`const primary = personal || university;` now, the same rule as sign-in.

**The approval queue did not check for confirmation.** Everybody who signed up
appeared there unconfirmed, while the page said "All have confirmed their
email address", which was not true of a single one of them.

Now it is `where status = 'pending' and email_verified_at is not null`.

## Why they are not simply hidden

Filtering alone would have emptied your queue and made every pending person
disappear. Somebody who mistyped their address would vanish and nobody would
notice until they asked in person.

So there is a **Waiting to confirm** panel underneath the queue, with a
**Send it again** button on each row. Out of the queue, still visible.

```
Approval queue     : Habibur Karim, Confirmed Person
Waiting to confirm : Never Confirmed, Typo Address
Nobody lost        : 4 pending, all visible
```

## The people already stuck

Anyone who signed up before this had their confirmation quarantined. Once
deployed they can go to `/auth/login` with either address and the link will
reach them. No need to sign up again, and confirming that way moves them into
the queue.

If somebody's address was mistyped, **Send it again** will not help either.
Correct the address on their record first.

## Two doctor checks

- **signup writes to the address we can reach** — fails if the university
  branch returns
- **unconfirmed signups are out of the queue but still visible** — fails both
  if they are in the queue and if they are filtered with nowhere to see them
