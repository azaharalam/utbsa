# Phase 2 — merging into your codebase

**29 new files. Nothing you have written is overwritten.**

There are also **5 small edits** to existing files, listed at the bottom as
copy-paste commands, because I do not have your current versions and will not
clobber your work.

---

## Merge safely with git

```bash
cd ~/Desktop/Projects/utbsa-own

# 1. Save where you are. If you have never committed:
git init                        # skip if already a repo
git add -A
git commit -m "Phase 1 complete"

# 2. Work on a branch, so main is always one command away
git checkout -b phase-2

# 3. Drop the new files in
unzip -o ~/Downloads/utbsa-phase2.zip -d /tmp/p2
cp -r /tmp/p2/. .

# 4. Look at exactly what landed
git status

# 5. Apply the 5 edits below, then
npm run db:migrate
npx tsc --noEmit
npm run dev
```

**If anything goes wrong:**

```bash
git checkout main               # back to Phase 1, instantly
git branch -D phase-2           # throw the branch away
```

Your database will still have migration 004 applied. To undo that too:

```bash
npm run db:reset && npm run db:migrate && npm run db:seed
```

When you are happy:

```bash
git add -A
git commit -m "Phase 2 — dues, donations, ledger, RSVP"
git checkout main && git merge phase-2
```

---

## The 5 edits to existing files

Run this whole block from the project root. It is idempotent — running it twice
does nothing the second time.

```bash
python3 - <<'PY'
import pathlib

def edit(path, pairs):
    p = pathlib.Path(path); s = p.read_text(); before = s
    for old, new in pairs:
        if new.strip() and new.split('\n')[0].strip() in s:
            print(f"  = {path} already patched"); return
        if old in s: s = s.replace(old, new)
        else: print(f"  ! {path}: could not find\n      {old.strip()[:70]}")
    if s != before:
        p.write_text(s); print(f"  + {path}")

# 1. Member type needs household_id
edit('lib/types.ts', [(
  "  status: MemberStatus;\n  role: Role;",
  "  household_id: string | null;\n  status: MemberStatus;\n  role: Role;")])

# 2 & 3. Admin and portal navigation
edit('app/admin/layout.tsx', [
 ("            { href: '/admin/members', label: 'Members' },",
  """            { href: '/admin/members', label: 'Members' },
            { href: '/admin/requests', label: 'Requests' },
            { href: '/admin/dues', label: 'Dues' },
            { href: '/admin/dues/reconcile', label: 'Reconcile' },
            { href: '/admin/donations', label: 'Donations' },
            { href: '/admin/funds', label: 'Funds' },
            { href: '/admin/ledger', label: 'Ledger' },"""),
 ("            { href: '/admin/eboard', label: 'E-board' },",
  """            { href: '/admin/eboard', label: 'E-board' },
            { href: '/admin/settings', label: 'Settings' },"""),
])

edit('app/portal/layout.tsx', [(
  "            { href: '/portal/profile', label: 'My profile' },",
  """            { href: '/portal/dues', label: 'My dues' },
            { href: '/portal/profile', label: 'My profile' },""")])

# 4. RSVP on the event page
edit('app/(site)/events/[slug]/page.tsx', [
 ("import { Card, Pill } from '@/components/ui';",
  """import { Card, Pill } from '@/components/ui';
import RsvpBox from '@/components/money/rsvp';
import { myRsvp, eventHeadcount } from '@/lib/queries/tickets';"""),
 ("""  const start = new Date(e.starts_at);
  const isPast = start < new Date();""",
  """  const start = new Date(e.starts_at);
  const isPast = start < new Date();

  const canRsvp = !!me && ['active', 'inactive', 'alumni'].includes(me.status);
  const [existing, headcount] = await Promise.all([
    canRsvp ? myRsvp(me!.id, e.id) : Promise.resolve(null),
    eventHeadcount(e.id),
  ]);"""),
 ("""      {!isPast && (
        <div className="mt-8 rounded-xl border-2 border-dashed border-stitch bg-white/60 p-5">
          <p className="mb-1 font-display font-bold">RSVP is coming</p>
          <p className="text-sm text-ink-mid">
            For now, let us know in the WhatsApp group so we can count heads for food.
          </p>
        </div>
      )}""",
  """      {!isPast && canRsvp && (
        <RsvpBox eventId={e.id} existing={existing} headcount={headcount} />
      )}

      {!isPast && !canRsvp && (
        <div className="mt-8 rounded-xl border-2 border-dashed border-stitch bg-white/60 p-5">
          <p className="mb-1 font-display font-bold">Sign in to RSVP</p>
          <p className="text-sm text-ink-mid">
            Members can tell us they are coming, and how many they are bringing, so we
            order the right amount of food.
          </p>
        </div>
      )}"""),
])

# 5. Graduation request on the profile page
edit('app/portal/profile/form.tsx', [
 ("import type { Member } from '@/lib/types';",
  """import GraduateBox from '@/components/money/graduate';
import type { Member } from '@/lib/types';"""),
 ("""            <div className="mt-4"><Save label="Save privacy settings" /></div>
          </form>
        </Card>""",
  """            <div className="mt-4"><Save label="Save privacy settings" /></div>
          </form>

          <GraduateBox memberType={member.member_type} />
        </Card>"""),
])
print("done")
PY
```

If any line prints `!` it could not find the text — most likely because you
edited that file. Paste the message back and I will give you the exact edit.

---

## First run

```bash
npm run db:migrate      # applies 004_money.sql
npx tsc --noEmit        # should be silent
npm run dev
```

Then, as admin:

1. **`/admin/settings`** — leave payments off until the university answers.
2. **`/admin/dues`** — set the rate if it is not $15, then **Assess** the current term.
   You will see a confirmation first: *"87 active students × $15.00 = $1,305.00"*.
   This runs **once per term** and is guarded so a double click cannot double-charge.
3. **`/admin/dues`** — record a cash payment to check the balance moves.
4. **`/admin/dues/reconcile`** — the end-of-semester action page.
5. **`/admin/donations`** — record a gift.
6. **`/admin/ledger`** — everything above should already be there.

---

## What is in the build

| Area | Where |
|---|---|
| Dues charges, balances, waivers | `lib/queries/dues.ts` |
| Donations, donors, funds | `lib/queries/donations.ts` |
| Ledger and expenses | `lib/queries/ledger.ts` |
| RSVP, tickets, status requests | `lib/queries/tickets.ts` |
| Every form action | `app/actions/money.ts` |

**Members see:** `/portal/dues` — balance, full history, and a line explaining that
unpaid amounts carry over with no penalty.

**Admins see:** dues, reconcile, donations, funds, ledger, requests, settings.

---

## Three rules the code enforces

**Balances are never stored.** There is no `balance` column and there must never be
one. `balance = charges − payments − adjustments`, computed on every read. A stored
balance is wrong the moment anyone backdates a cash payment or issues a refund.

**Charges freeze their own amount.** `dues_charges.amount_cents` is copied from the
term at assessment. It is never joined back at read time — otherwise raising dues to
$20 in 2028 would silently rewrite what everyone owed in 2026.

**Ledger entries are written in the same transaction as the thing they record.** A
payment and its ledger row succeed together or not at all, so they cannot drift apart.

---

## Not built yet

**Stripe checkout.** `payments_enabled` is off by default and everything works without
it. Manual entry covers cash, Zelle, and cheques today. Worth waiting for the
university's answer before wiring a processor.

**CSV import.** The schema is ready — `payments.row_hash` and `import_batches` exist,
so imports will be idempotent when built. Manual entry works meanwhile.

**Ticket checkout for non-members.** `recordTicketSale` handles door sales now; online
purchase waits on the payments decision.

Say the word on any of these and I will add them.

---

## One thing to check before going live

`/admin/settings` explains it, but: at ~100 members plus a few ticketed events,
absorbing the card fee costs roughly **$200–300 a year**. Show the treasurer that
number before it appears in the books rather than after.
