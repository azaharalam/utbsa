# Deploying no longer breaks open tabs

**3 files.** Worth having before Friday.

```bash
cd ~/Desktop/Projects/utbsa-own
cp -r ~/Downloads/utbsa-chunkfix/. .
npm run build
git add -A && git commit -m "survive a deploy with the site open" && git push
```

**For right now, a hard refresh (Ctrl+Shift+R) fixes your current page.**

---

## What happened

```
ChunkLoadError: Loading chunk 6502 failed
```

Next generates new chunk filenames on every build, and `next build` replaces
`.next` wholesale. Your tab was holding references to the old filenames, so it
asked for a file that had just been deleted — 404, and the page died.

nginx serves `/_next/static/` straight off disk with a one-year `immutable`
cache, so browsers hold those references hard.

**On Friday this would hit every member with the site open when you deploy.**
They get a blank page and a console message, which to them is just "the site
broke".

## Two fixes, both worth having

**1. The server keeps the old chunks.** `deploy.sh` now copies the previous
build's `static` directory aside, builds, then copies it back with `cp -rn` so
the new build always wins on collision. Old tabs keep working until they next
reload. Costs a few megabytes.

Verified: a chunk present only in the old build survives, and a chunk in both
keeps the new version.

**2. The browser recovers if it happens anyway** — a different server, a
cleared cache, a build outside the script. `app/global-error.tsx` catches
`ChunkLoadError` and reloads once, showing *"The site was updated while you
had it open"* rather than a blank screen. A sessionStorage guard prevents a
reload loop.

It also handles any other fatal client error with a real page — Try again,
Home — instead of the browser's default.

## Use the script from now on

```bash
cd /srv/utbsa && ./deploy/deploy.sh
```

It now detects which service it is from the directory name, so the same script
works for staging and production, and it health-checks the right port
afterwards.

Running `npm run build` by hand skips the chunk preservation.

## A doctor check

**"a stale build reloads itself instead of dying"** — fails if
`app/global-error.tsx` is missing.
