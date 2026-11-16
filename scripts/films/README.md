# Kobocent films

Three 30-second portrait films (1080×1920, 30 fps), made on 2026-11-16 for social posts and the landing page's
"See it working" section. They are **illustrated walkthroughs**: faithful recreations of the real screens with example
amounts, drawn in the browser frame by frame, so they can be re-rendered whenever the product or the copy changes.

| Film | What it shows | Landing page copy |
|---|---|---|
| 1 `?v=1` | Pay an electricity bill: meter check, exact cost, hold to pay, token, cashback | `public/videos/pay-bills.mp4` |
| 2 `?v=2` | Withdraw to a bank: amount → exact naira, name check, hold to send, bank alert | `public/videos/withdraw.mp4` |
| 3 `?v=3` | Kobo Pal: airtime from one typed sentence, "what is a stablecoin?", freeze a lost phone | `public/videos/kobo-pal.mp4` |

## Files

- `video.html` — the stage (phone frame, captions, end card) and the app styles, in the Kobocent brand.
- `scenes.js` — the three films: screens, timings, captions, taps, and the list of sound effects. `window.seek(t)` draws
  the frame at `t` seconds, so rendering is exact and repeatable.
- `music.mjs` — the soundtrack for each film, **composed in code** (no samples, nothing licensed): an afro-house groove
  with kalimba (1), warm lo-fi with electric piano (2), bright pop with an arpeggio (3), plus tap, typing and success
  sounds timed to the film.
- `render.mjs` — opens `video.html` in Chrome, captures every frame, and encodes the MP4 with the music.

## Re-rendering

Needs Node and Google Chrome. In a scratch folder (don't add these packages to the web app):

```bash
cp scripts/films/* <scratch>/ && cd <scratch>
npm init -y && npm pkg set type=module && npm i ffmpeg-static puppeteer-core
node render.mjs stills 1 4,10,16,27     # optional: check a few frames first (out/stills)
node render.mjs stills 1 0 && node music.mjs 1 && node render.mjs film 1    # → out/kobocent-1.mp4 (repeat for 2 and 3)
```

Landing-page copies are 720×1280 at CRF 25 (under 2 MB each) with a 540×960 poster:

```bash
ffmpeg -i out/kobocent-1.mp4 -vf scale=720:1280:flags=lanczos -c:v libx264 -preset slow -crf 25 -pix_fmt yuv420p -movflags +faststart -c:a aac -b:a 128k public/videos/pay-bills.mp4
ffmpeg -ss 9.8 -i out/kobocent-1.mp4 -frames:v 1 -vf scale=540:960 -q:v 4 public/videos/pay-bills.jpg
```

## Rules for the copy in the films

Same language rules as everywhere (clickbot CLAUDE.md): never "non-custodial", no bridge fee rates, "Multichain, powered
by stablecoins.", gasless only where it is true (payments, bills, withdrawals). Amounts, rates, names, meter and account
numbers are examples; the end card says "Screens are illustrations. Amounts and rates vary." Keep that line.
Cashback figures must stay 0.2% of the amount shown (₦10 on ₦5,000; ₦296 on ₦148,000; ₦2 on ₦1,000).
