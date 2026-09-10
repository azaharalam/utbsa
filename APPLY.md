# Three deploy blockers

```bash
cd ~/Desktop/Projects/utbsa-own
cp -r ~/Downloads/utbsa-deployfix/. .
npm run build          # let it finish this time
git add -A && git commit -m "fix DirectoryEntry type" && git push
```

---

## 1. The type error — fixed in this bundle

`directory()` selects `arrival_semester` and `arrival_year`, but the
`DirectoryEntry` type never declared them. My copy of the directory page did
not use those fields, so my build passed and yours did not.

Both fixed: the type now declares them, and the card shows *"Since fall 2024"*.

---

## 2. `EACCES: .env.production` on the droplet

You are building as `deploy`, but the file is owned by `utbsa` with mode 600 —
so `deploy` cannot read it.

Both users need it: `deploy` to build, `utbsa` to run.

```bash
cd /srv/utbsa
sudo chown deploy:utbsa .env.production
chmod 640 .env.production
```

Owner `deploy` (read/write, for building), group `utbsa` (read, for running),
nobody else. Confirm:

```bash
ls -l .env.production     # -rw-r----- 1 deploy utbsa
```

---

## 3. Fonts failing to download

`next/font/google` fetches Noto Sans and Baloo Da 2 at build time. Your droplet
could not reach `fonts.gstatic.com`.

Almost always IPv6: DigitalOcean assigns an IPv6 address but the route does not
always work, and Node tries IPv6 first and hangs.

**Try this first:**

```bash
cd /srv/utbsa
NODE_OPTIONS="--dns-result-order=ipv4first" npm run build
```

If that fixes it, make it permanent by adding to `.env.production`:

```bash
NODE_OPTIONS=--dns-result-order=ipv4first
```

**Check whether it is really the network:**

```bash
curl -sI https://fonts.gstatic.com | head -1     # expect HTTP/2 200
curl -6 -sI https://fonts.gstatic.com | head -1  # this one may hang — that is the clue
```

**If it still fails**, the durable fix is to stop depending on Google at build
time at all — self-host the two fonts. Say the word and I will send that; it is
about fifteen minutes and it means your build never needs the internet for
anything but npm.

---

## Then

```bash
cd /srv/utbsa
git pull
npm ci
npm run build
npm run db:migrate
npm run db:seed        # NOT db:demo
npm run doctor
```
