# Kobocent films

Three 30-second portrait films (1080×1920, 30 fps), made on 2026-11-16 for social posts and the landing page's
"See it working" section. They are **illustrated walkthroughs**: faithful recreations of the real screens with example
amounts, drawn in the browser frame by frame, so they can be re-rendered whenever the product or the copy changes.

| Film | What it shows | Landing page copy |
|---|---|---|
| 1 `?v=1` | Pay an electricity bill: meter check, exact cost, hold to pay, token, cashback | `public/videos/pay-bills.mp4` |
| 2 `?v=2` | Withdraw to a bank: amount → exact naira, name check, hold to send, bank alert | `public/videos/withdraw.mp4` |
| 3 `?v=3` | Kobo Pal: airtime from one typed sentence, "what is a stablecoin?", freeze a lost phone | `public/videos/kobo-pal.mp4` |
| 4 `?v=4` | Trading: paste a token, our read out of 100, buy with USDC, take profit and stop loss, automatic exit | `public/videos/trade.mp4` |
| 5 `?v=5` | Earn: flexible or locked, stake, earnings build every hour, withdraw with earnings | `public/videos/earn.mp4` |
| 6 `?v=6` | Cashback: 0.2% adds up, the switch at checkout, pay less | `public/videos/cashback.mp4` |
| 7 `?v=7` | Send to any wallet: paste, network, 1.5% fee shown, tick the address check, hold to send | `public/videos/send.mp4` |
| 8 `?v=8` | First deposit: verify once, own account number, bank transfer, naira in and USDC out | `public/videos/add-money.mp4` |
| 9 `?v=9` | Account protection: freeze, unfreeze with security questions, move to a new wallet | `public/videos/protect.mp4` |

The catalogue page is **/videos** (`src/app/videos/page.tsx`), fed by `src/data/videos.ts`; the landing page shows the first three.
**Film 4 was rebuilt on 2026-11-17 to mirror the real screens** (founder: the first cut did not): buy in `TradePanel`
(Pay with, Speed, amount, Review, "Hold to buy", fee 1%), then the `StrategyPanel` "Protect your ZURI" card — suggested
levels with "Protect with these", or "Set my own levels" (take profit chips, trail, stop loss chips, "Protect ZURI"), then the
status going to "Trailing — target reached". **Before drawing any screen, read its component and copy its labels.**

Films 4–9 reuse the three music styles in new keys. Film 4 ends with "Trading is risky. Not financial advice." and film 5
with "Rates can change and are not guaranteed." Keep both lines.

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
