# The missing bundle — apply this one last

Every one of your four failures comes from this bundle not being on disk.

```bash
cd ~/Desktop/Projects/utbsa-own
cp -r ~/Downloads/utbsa-misc2/. .

ls lib/calendar.ts components/money/add-to-calendar.tsx      # both should exist
npm run db:migrate                                            # runs 018
rm -rf .next
npm run doctor                                                # 96 passed
npm run dev
```

It ships the newest version of every file it touches, so applying it after the
others cannot undo anything.

---

## What it contains

| Failure | Fixed by |
|---|---|
| `lib/calendar.ts` missing | the calendar helpers |
| `app/events/[slug]/calendar/route.ts` missing | the `.ics` download route |
| migration `018_appeals.sql` has not run | the migration |
| a rejected member has no way to reply | the appeal form |

Plus **Requests → Status changes** in the admin nav, which you already have.

## The three features

**Add to calendar** on the RSVP box once someone says yes, and on the event
page for anyone signed out. Three routes, because Google and Outlook take a URL
while Apple Calendar wants a downloaded file — offering one strands half your
members.

**A rejected member can reply.** They could already sign in and read the
reason; now there is *"Ask us to look again"*, which lands in `/admin/messages`
attached to their account, so whoever reads it has the record rather than a
name typed into a public form. One open appeal at a time.

**Status changes** rather than Requests, which is what the tab holds.

## After this

Two notes will remain, both correct:

- **1 student or alum has no personal address** — your own account, made before
  the two-address rule. Add one at `/portal/profile`.
- **email prints to the terminal** — waiting on the UTBSA account.
