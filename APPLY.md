# Round-2 fixes

**22 files. One new migration. One page deleted.**

```bash
cd ~/Desktop/Projects/utbsa-own
git add -A && git commit -m "before round-2 fixes"

cp -r ~/Downloads/utbsa-fixes/. .
rm -rf app/admin/dues/reconcile        # merged into /admin/dues

npm run db:migrate                     # applies 005_drop_households.sql
npx tsc --noEmit                       # should be silent
npm run doctor                         # 38 passed
npm run db:demo                        # reload demo data for the new schema
npm run dev
```

If anything looks wrong: `git checkout .` puts every file back. The migration
stays applied; `npm run db:reset && npm run db:migrate && npm run db:seed` undoes that too.

---

## What changed

**Households are gone.** Charges, payments, and adjustments now point straight at
a member. Only students are ever charged, so the household layer bought nothing —
it just put an indirection between a charge and the person who owed it. Migration
005 moves existing payments onto the right member and drops the table.

Farhana and Sabbir, both students, now show $30 each rather than $60 as one row.

**/admin/dues/reconcile is deleted.** Its actions moved inline into the dues table.
Anyone with a non-zero balance gets an Action button — waive, adjust, or cover from
a fund. Bulk reminders sit above the table.

**Record payment** takes Semester and Year as two dropdowns instead of one term
picker. Year runs current ±5, eleven options. If that term does not exist yet it is
created automatically, so the treasurer never has to set one up first.

**Member cards** now read:

```
Rafid Hossain (admin)
rafid@example.org | +1 419 555 0142
Student · PhD in Chemical Engineering · Joined Fall 2025
```

Phone only appears if that member allowed it.

**The role dropdown is gone from /admin/members.** Admin rights follow from the
election result, not a manual toggle. Until Phase 3, create an admin with
`npm run db:admin -- email@example.com`.

**Donation form** clears after saving, and is shorter: donor email and the fund
picker are gone. Gifts land in General; move one into a restricted fund from the
dropdown on its row in the list. `student` added to donor types.

**Expense categories** are now a fixed list — Food and catering, Venue and equipment
rental, Decorations and supplies, Sports and recreation, Printing and promotion, and
Other. Picking Other requires a real note, not two words.

**Bengali title removed** from the event form.

---

## Funds and donations — the difference

They answer two different questions.

**A donation is one gift.** Who gave, how much, when. One row per gift.

**A fund is a pot the money sits in** — a label saying what it may be spent on. Its
balance is never typed in, which is why there was no amount field. It is calculated:
donations into that fund, minus spending out of it. Typing a starting number would
be inventing money.

You need funds only when money arrives with strings attached. A $500 grant from the
Office of Student Involvement **for Boishakh** is not available for a cricket
tournament, and keeping it separate is what stops it quietly being spent elsewhere.

Your model of "funds = grants from UT organizations" was right — those are donations
with donor type `university`, paid into a restricted fund. Same thing, two directions.

Both pages now say this on screen.

**How donations get created:** the form on `/admin/donations`. There is no public
donation form, which matches your plan — the contact page tells people to get in
touch, and you record the gift by hand once the money arrives.

**The "which fund" dropdown** on the expense form is just the rows in the `funds`
table: General and Dues Assistance ship with the migration, Boishakh 1434 comes
from the demo seed.
