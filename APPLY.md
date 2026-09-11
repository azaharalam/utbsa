# Doctor reported a false failure

**1 file.**

```bash
cd ~/Desktop/Projects/utbsa-own
cp -r ~/Downloads/utbsa-docfix/. .
git add -A && git commit -m "fix dangling else in the mail check" && git push
```

Then on the droplet:

```bash
cd /srv/utbsa && git pull && npm run doctor
cd /srv/utbsa-staging && git pull && npm run doctor
```

---

## What it was

```
✓ email is configured to send
✗ MAIL_TRANSPORT is not smtp in production
```

Both cannot be true. A patch of mine inserted the SMTP-port check **between**
an `if` and its `else`, so the `else` stopped belonging to the transport check
and started belonging to the port check.

Port 2525 is not 587 or 465, so the `else` fired and reported the wrong thing.
Your configuration was correct the whole time.

A dangling else, caused by editing code with string replacement instead of
reading the surrounding lines. Fixed and verified against all three cases:

| Config | Result |
|---|---|
| smtp on 2525 | ✓ configured, no warning |
| smtp on 587 | ✓ configured, **plus** a warning that DigitalOcean blocks it |
| console | ✗ fails, as it should |

The port warning now also covers 25, and names both alternates — 2587 for SES,
2525 for Brevo.
