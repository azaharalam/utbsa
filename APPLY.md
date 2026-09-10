# Giving someone an office — and a bug this found

**3 files.**

```bash
cd ~/Desktop/Projects/utbsa-own
cp -r ~/Downloads/utbsa-officer/. .
git add -A && git commit -m "db:officer replaces db:admin" && git push
```

Then on staging:

```bash
cd /srv/utbsa-staging && git pull
npm run db:officer -- azaharalam2233@gmail.com "General Secretary" full \
  --name "Md. Azahar Alam" --phone "419 246 7235"
```

---

## The bug

**`npm run db:admin` had stopped working.** It set `role = 'admin'`, and since
migration 007 that column grants nothing — access comes from the office
someone holds.

So it ran, printed "is now an active admin", and left the person with no access
at all. You would have hit this creating the first admin on production, with a
success message telling you it had worked.

## The replacement

```bash
npm run db:officer -- <email> "<Office title>" <access> [--name "..."] [--phone "..."]
```

| Access | Grants |
|---|---|
| `full` | everything, including assigning offices |
| `money` | dues, transfers, donations, funds, ledger |
| `members` | approvals, member records, posts, events |
| `content` | posts and events |
| `events` | events only |
| `none` | listed publicly, no admin access |

It finds the member by **any** of their addresses, activates and approves them,
and assigns the office for the current session. With `--name` it creates the
member if they do not exist — which is how the first officer gets in on a fresh
database, when there is nobody to do it from the admin UI.

Reassigning **ends** the previous office rather than stacking permissions, and
the old one stays in the history.

It warns when fewer than two offices hold full access.

`db:admin` still works as an alias, so anything referencing it keeps running.

## Two doctor checks

- **nobody is flagged admin without an office** — catches exactly the state the
  old script left people in
- **first-officer bootstrap** — the script is present

## After that

Assign offices from `/admin/offices` rather than the command line, so the
change is recorded in the audit log with who did it.
