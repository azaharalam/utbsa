# Everything discussed, in one batch

**42 files, two migrations, one SQL cleanup.** Build and doctor both clean —
111 checks passing.

```bash
cd ~/Desktop/Projects/utbsa-own
cp -r ~/Downloads/utbsa-batch/. .
npm run db:migrate
npm run build
npm run doctor
```

Push when you are ready, then staging, then production — both need
`npm run db:migrate`.

---

## 1. The five fixes

**Profile emails swapped.** Personal is now read-only; the UToledo address is
editable and treated as ordinary personal information.

This also closes a hole. The personal address is where every sign-in link
goes, *and* it signs you in. Editable from inside the account, anyone who
borrowed a signed-in phone could point it at their own inbox and hold the
account for good. It is now out of `SelfEditable` entirely, so the server
ignores it however the form is posted.

**Arrive form** — Programme is a dropdown (undergraduate, master's, PhD,
postdoc, visiting scholar, other), with an optional Department beside it. I
also removed a duplicate Department field that was already on that form.

**`info@utoledobsa.org`** — set by `cleanup.sql`; it is a settings value, not
code.

**E-board page** — "Email us at info@utoledobsa.org — it reaches everyone
listed below."

**The wording pass:**

| Where | Now reads |
|---|---|
| Portal nav | My contribution |
| Balance card | "Not yet sent" |
| Dashboard tile | "Not yet sent" / "Thank you" / "Nothing asked of you" |
| Dues page | "We ask $15 a semester. It covers food at our events for one person…" |
| Reminder email | **names no sum at all** |
| About page | "We ask students for $15 each spring and fall" |
| Election gate | "Officers are expected to have contributed for the semester." |

The carry-over is invisible to members — the page talks about the semester,
not an accumulated total. **The treasurer still sees real balances** on
`/admin/dues` and `/admin/finances`; nothing there changed.

A doctor check now fails if any member-facing page says "you owe", "your
balance", or "dues balance".

### The one thing I would still raise

The election gate stays, as you asked. It remains the hardest part of the
"not charging" position to defend: payment is a condition of standing for
office, and no wording changes that. The usual alternative is an expectation
the e-board enforces by judgement rather than a gate the software enforces.
Your call, and it is one line to change later.

## 2. Potluck

The admin defines the list; members only pick from it. That was already true
in the query layer — `addItem` needed the events permission and `claimItem`
did not — so this is mostly the missing pieces:

**Split on entry.** "Rice, 120 people, 4 ways" creates four rows of 30. A
typing shortcut and nothing more: the rows are ordinary independent dishes the
moment they exist, and nothing records that they came from a split. Remainder
rides on the last portion — 100 across 3 gives 33, 33, 34. Verified to always
sum correctly.

**Admin can assign** a dish to someone who offered in person. Members still
cannot volunteer anybody but themselves.

**A claimed dish can no longer be edited** — it refuses, naming the person.
Release it first. Otherwise they turn up with the wrong thing.

**Coverage is a plain total** — "feeds about 120", with no comparison to the
RSVP count. More people come than answer, so a ratio would say there is enough
food when there is not.

## 3. Tournaments

**Migration 020** adds `teams`, `event_players`, and the tournament fields.

Players register **per person**, not per household — `rsvps` allows one row
per household, which is right for a picnic headcount and wrong when two
spouses both play, possibly on different sides. Spectators still RSVP exactly
as before. Both models tested side by side.

- Registration closes on a date you set; everyone who registers plays
- Members can bring a guest — shown as "(guest)", never charged
- Admins create teams (name, optional logo), assign players, publish
- Only champion and runner-up are recorded. No fixtures, no scores
- The contribution and its breakdown show to **signed-in students and
  organisers only** — never on the public page

Tested end to end: 7 players from three routes, teams drawn, result recorded,
a team cannot be both champion and runner-up, withdrawal refuses once you are
on a side, late registration refuses, deleting a team returns its players to
the pool, deleting the event cascades.

## 4. `cleanup.sql` — run this on production

```bash
sudo -u postgres pg_dump -Fc utbsa > ~/before-cleanup.dump
psql "$(grep DATABASE_URL /srv/utbsa/.env.production | cut -d= -f2-)" -f cleanup.sql
```

One transaction:

1. Undoes the cancellation — removes its refund and processing-fee ledger
   rows and the audit entry, and un-cancels the events
2. Removes the seeded events and their RSVPs, dishes and ticket orders
3. Sets `org_email` to `info@utoledobsa.org`
4. Prints what is left

**It refuses if any cancelled event has ticket orders with money attached** —
those entries would be a true record of refunded money, and deleting them
would put the books out. Members, payments, donations and funds are untouched.

Tested against the same state your production is in.
