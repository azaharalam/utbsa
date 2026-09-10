# Sign-in links pointed at localhost

**8 files.**

```bash
cd ~/Desktop/Projects/utbsa-own
cp -r ~/Downloads/utbsa-redirfix/. .
npm run build
git add -A && git commit -m "redirect to the real site, not the proxy origin" && git push
```

Then on staging:

```bash
cd /srv/utbsa-staging && git pull && npm ci && npm run build \
  && sudo systemctl restart utbsa-staging
```

---

## What went wrong

The verify route built its redirects from `request.nextUrl.origin`.

Behind nginx, the app sees the request arriving at **127.0.0.1:3001** — so
`origin` is localhost, and every redirect sent the browser to an address that
does not exist outside the server.

Worse, the token is consumed **before** the redirect. So the first click
worked, spent the token, and dumped you on a dead URL. Clicking again gave
`error=expired`, which is why it looked like the link had expired when it had
actually succeeded.

Now the redirect uses `NEXT_PUBLIC_SITE_URL`, falling back to the
`X-Forwarded-*` headers, and only using the request origin as a last resort
for local development.

## The error page now explains itself

Landing on a bare sign-in form after clicking a link you were told would work
looks like nothing happened. It now says which of the three things went wrong:

- **expired** — used already, or over 30 minutes old. Links work once, on
  purpose. Request another.
- **missing** — the link was truncated, which some email apps do to long URLs
- **nouser** — no account for that address

## Also: the port

DigitalOcean blocks 25, 465 and 587 on **every** Droplet. Not configurable,
not a firewall setting on your side — platform policy to prevent spam.

SES also listens on **2587**, which is not blocked. One line in
`.env.production`:

```
SMTP_PORT=2587
```

`.env.example` and all three deploy guides now say so, and the doctor warns in
production if it sees 587 or 465. This is exactly the kind of thing that costs
somebody an evening in two years.

## Three doctor checks

- **sign-in links redirect to the real address**
- **a stalled mail server fails fast** (the 10s SMTP timeouts)
- a production warning when `SMTP_PORT` is one DigitalOcean blocks
