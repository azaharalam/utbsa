# The edit row stays open — fixed, plus an audit of every form

**3 files.** Includes the Copy removal, so apply this instead of
`utbsa-nocopy` if you have not done that one yet.

```bash
cd ~/Desktop/Projects/utbsa-own
cp -r ~/Downloads/utbsa-panelfix/. .
npm run build && npm run doctor
```

---

## The bug

The potluck editor is gated by an `editing` state that was never cleared when
the save succeeded. The confirmation appeared, the row stayed open, and it
looked as though nothing had happened.

One line: `useCloseOnSuccess(editState?.ok, () => setEditing(null))`.

Mine to own — I added that editor without wiring it up the way the other
panels are.

## The audit you asked for

**50 components use `useFormState`. 36 already resolve properly.**

Of the other 14:

| | |
|---|---|
| **Genuinely broken** | 1 — the potluck editor |
| **Worth your eyes** | 1 — `app/auth/pending/appeal.tsx` |
| **Fine as they are** | 12 |

The twelve break down as:

**Redirect away, so nothing needs closing** — `join/form.tsx`,
`arrive/form.tsx`, `login/form.tsx`. The action ends in `redirect()`.

**A single button in a row, no panel** — `quick-approve`, `requests/row`,
`members/controls`, `messages/row`, `checkin`, `quick-potluck`,
`quick-arrival`, `potluck-board`, `gift`. The row re-renders from the server.
Nothing to clear, nothing to close.

So this was not systemic. It was the one editor I added recently.

## The appeal panel

`app/auth/pending/appeal.tsx` uses `Done`, which replaces the panel's contents
— so it probably resolves fine. I would rather you looked at it than take my
word for it.

**To see it**, run `deploy/data/test-rejected.sql`, then sign in as
`rejected@yopmail.com` (the link prints in your `npm run dev` terminal) and go
to **http://localhost:3000/auth/pending**.

Delete the row afterwards:

```sql
delete from members where email = 'rejected@yopmail.com';
```

## A doctor check

**"panels close themselves once their action succeeds"** — flags any component
with an `editing`/`open`/`show`/`expanded` state and no `useCloseOnSuccess`
call.

It matches the **call**, not the import: removing the call while leaving the
import is precisely how this would come back, and my first version of the
check was fooled by exactly that. Verified both ways.
