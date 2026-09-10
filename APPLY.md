# The 504 on sign-in

**51 files.** Two causes, both fixed.

```bash
cd ~/Desktop/Projects/utbsa-own
cp -r ~/Downloads/utbsa-hangfix/. .
npm run build
git add -A && git commit -m "smtp timeouts, defensive form state" && git push
```

Then on staging:

```bash
cd /srv/utbsa-staging && git pull && npm ci && npm run build \
  && sudo systemctl restart utbsa-staging
```

---

## Why it hung

`sendMail` had **no timeouts**. If the SMTP host is unreachable, nodemailer
waits — the server action waits, the request waits, and nginx gives up at 60
seconds with a 504.

Now: 10s to connect, 10s for the greeting, 20s for the socket. A healthy send
takes well under a second, so this only ever fires on a real problem — and
turns a hang into an error the form can show.

The sign-in and signup actions also **catch** mail failures now. The token is
already issued, so the person can just try again, and the real reason goes to
the log instead of vanishing into a 504.

## Why the page then broke

```
TypeError: Cannot read properties of undefined (reading 'error')
```

Every form read `state.error` directly. When an action times out it returns
nothing, so `state` is undefined and reading `.error` off it **white-screens
the entire page** — a worse failure than the one that caused it.

All 48 form components now use `state?.error`. The form shows the error
instead of the page disappearing.

## First, find out why SMTP is unreachable

The timeouts stop the hang; they do not explain it. On the droplet:

```bash
# can it reach SES at all?
nc -zv email-smtp.us-east-2.amazonaws.com 587

# and does the app agree?
cd /srv/utbsa-staging && npm run mail:test -- azaharalam2233@gmail.com
```

If `nc` hangs or refuses, it is the network. Try forcing IPv4 — the same thing
that affected the fonts:

```bash
NODE_OPTIONS="--dns-result-order=ipv4first" npm run mail:test -- azaharalam2233@gmail.com
```

If that works, add to `.env.production`:

```
NODE_OPTIONS=--dns-result-order=ipv4first
```

and restart. **This is the most likely cause** — DigitalOcean assigns an IPv6
address whose route often does not work, Node tries it first, and everything
outbound stalls. It is exactly what the font downloads did.

## Two doctor checks

- **forms survive an action that returns nothing**
- **a stalled mail server fails fast**
