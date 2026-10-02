# Kobocent Web — Project Context

> **Read first, in this order:**
> 1. **This file** — what the web app is, its rules, and what is already known to be wrong
> 2. **`../clickbot/API.md`** — the backend contract. Every screen that shows or moves money
>    calls these routes. If a route you need is missing, it is built in the backend first.
> 3. **`../clickbot/CLAUDE.md`** — company-wide conventions and language rules (the source
>    of truth; this file repeats only what the web needs)
> 4. **`../clickbot/HANDOFF.md`** — what is deployed on the backend right now
>
> The backend lives at `C:\Users\User\projects\clickbot`. In Claude Code, work across both
> with `/add-dir ../clickbot` (or start with `claude --add-dir ../clickbot`).

---

## What this is

**Kobocent** (formerly ClickBot) — "your local kobo, working globally." A financial platform
on stablecoin rails: buy stablecoins with local currency, send across borders, pay bills,
withdraw to a bank, trade, and earn yield. Company: ClickShift Inc. (Abuja, Nigeria).

This repo is **kobocent.com**: the landing page *and* the web app (PWA), deployed on Vercel.
The Telegram bot (`@kobocentbot`; the original `@clicksolbot` runs on the same backend) is the
other surface. **Dual access: Telegram and App — one account, always in sync.** Same wallet,
same balance, same history on both, because both call the same backend.

## The one architectural rule

**The web app is thin.** It renders, collects input and calls `../clickbot`'s `/api/v1`.
It never holds private keys, recovery phrases (beyond displaying one once), business rules,
fees, rates or balances of its own. If logic is needed, it goes into a backend service
(`src/services/*` in clickbot) so the bot and the web can never disagree.

- Never put a secret behind `NEXT_PUBLIC_` — that ships to the browser.
- Never call third parties (Jupiter, Flutterwave, VTPass, RPCs) from the browser.
- The session JWT from `/api/v1/auth/*` must not live in `localStorage` (XSS). Keep it in an
  httpOnly, Secure, SameSite cookie set by a Next.js route handler that proxies to the API,
  or in memory only. The reauth token for the recovery phrase is memory-only and single-use.

## Mobile first — the requirement, not a preference

About 90% of users are on phones. Design and test at **390px first**; tap targets ≥ 44px;
nothing behind hover; respect safe-area insets on fixed elements; test on a real device.

## Language rules (commercially important — from clickbot/CLAUDE.md)

- **Never "non-custodial".** Keys are encrypted with a server-held key and the server signs.
  Approved wording, exactly: *"Your keys are encrypted, and only you can trigger a transaction."*
- Never "Building on Solana" or Solana exclusivity. Approved line: **"Multichain, powered by
  stablecoins."** Say "onchain wallet", not "Solana wallet".
- Never "trading bot". Never "bank-grade security".
- **Gasless** is the approved claim (founder decision 2026-10-01): Kobocent covers network
  fees (treasury pays gas and token-account rent; every new wallet gets 0.0025 SOL).
- $SHIFT is a **usage-reward point**, never "a token with real value". TGE Q1 2027 is a target.
- Rewards: **0.2% cashback** on bank transfers, bills and withdrawals; **20% referral
  commission** on friends' fees (trade sells, payments, bills, withdrawals, staking).
- **Do not fabricate numbers or testimonials.** If a stat cannot be fetched, show a dash.
  Testimonials appear with a name only if a real person said it and consented.

## Brand

Tokens live in `tailwind.config.ts` and must match the backend's `src/pnl/brand.js`
(terracotta `#C1502E`, hover `#9A3E22`, ink `#20211F`, cream `#F7F3EE`, warm cream `#F0E6D8`,
border `#E4D8C6`, muted `#6B5D52`, night `#1C1815` for dark mode only). If a value changes,
change it in both repos in the same change. Light by default. Logo: `public/logo-color.svg`
(large ring + small ring with a hole). Fonts: Fraunces (display), Inter (body), IBM Plex Mono.

## Stack

Next.js 14 App Router · TypeScript (strict) · Tailwind · PWA (`public/sw.js`,
`public/manifest.json`). Copy lives in `src/data/*` so text changes need no React.

## Environment (Vercel → Settings → Environment Variables)

| Key | Value | Notes |
|---|---|---|
| `NEXT_PUBLIC_API_BASE` | `https://<bot server domain>/api/v1` | **New** — the web app API |
| `NEXT_PUBLIC_TELEGRAM_BOT` | `kobocentbot` | Default in code is `kobocentbot` (2026-10-02) |
| `NEXT_PUBLIC_STATS_API` | `https://api.clickshift.io` | Public stats (`/api/stats/live`) |
| `NEXT_PUBLIC_SITE_URL` | `https://kobocent.com` | Metadata + PWA |
| `WAITLIST_ENDPOINT` / `WAITLIST_WEBHOOK` | — | Signups are **not stored** while neither is set |

Backend side (clickbot `.env`): `WEB_ORIGIN=https://kobocent.com,https://www.kobocent.com`
(CORS) and `WEB_JWT_SECRET`. Telegram Login needs BotFather → `@kobocentbot` → `/setdomain`
→ `kobocent.com`.

## How the app talks to the backend (see `../clickbot/API.md` for exact shapes)

1. **Sign in** — Telegram Login Widget for `@kobocentbot` → `POST /auth/telegram` → JWT +
   `account`. (Phone OTP and Google come later — backend decision recorded in ROADMAP.)
2. **Wallet setup** when `account.hasWallet` is false — offer **Import an existing wallet**
   first (`POST /wallet/import`), **Create a new wallet** second (`POST /wallet/create`).
3. **Home** — `GET /wallet` (balances; `404 needsWallet` → setup), `GET /wallet/addresses`.
4. **History / statement** — `GET /history?period=`, `GET /statement.pdf?period=`.
5. **Settings** — Link Telegram (`POST /link/telegram-code`, show the 8-char code and tell
   them to send it to @kobocentbot), redeem a bot code (`POST /auth/link`; replace the token
   if a new one comes back), **Show recovery phrase**: fresh Telegram login →
   `POST /auth/reauth` → `GET /wallet/recovery-phrase` with `X-Reauth-Token`. Show once, never
   store it, clear it on leave, warn about screenshots.
6. **Money on the web** (payments, bills, staking, swap, bridge in) arrives batch by batch as
   the backend ships each service + route (clickbot ROADMAP Phase 3). Never fake a screen for a
   route that does not exist yet — say "coming" and link to Telegram.

## Known issues in this repo (verified 2026-10-02, not yet fixed)

- **"Non-custodial" claims** — `src/components/sections/Hero.tsx:44` (badge),
  `src/components/sections/HowItWorks.tsx:4`, `src/app/signup/page.tsx:86`,
  `src/data/faq.ts:18` ("We cannot move your money" — not true) and `:21`,
  `src/components/sections/Faq.tsx:15`. Replace with the approved wording.
- **"Fifty countries / 50+ countries"** — `Reach.tsx`, `Testimonials.tsx`, `lib/stats.ts`, `LiveStats.tsx`: **leave as is** (founder decision 2026-10-02 — reach through a co-founder in those markets). Do not edit.
- **Corridors marked live that are not** — `src/data/corridors.ts:18` (Naira → Japanese Yen,
  `live: true`). Only dollar stablecoins and NGN in/out are live; others are "opening".
- **Testimonials** — `src/data/testimonials.ts`: named list kept (founder decision 2026-10-02); the bot's activation campaign uses the same six (clickbot `src/campaigns/testimonials.js`) — keep in step.
- "Bridge both ways / out to any chain" style copy: outbound bridging is not built (backend
  Phase 4). Inbound bridging works.
- `$SHIFT` "3× multiplier for early users" (`src/data/faq.ts:54`) — confirm it exists in the
  backend before keeping it.

## Working style (same as the backend)

- **Verify before asserting.** Read the code or the API.md entry; don't assume a route exists.
- One change per commit; **commit and push only when Emmanuel asks**. Pushing `main`
  deploys to Vercel — treat a push as a release.
- Run `npm run build` before pushing (type errors fail the Vercel build).
- Report precisely: file:line, what changed, what was not done, what could not be verified.
- Update `../clickbot/HANDOFF.md` (or a `HANDOFF.md` here once web work starts in earnest) at
  the end of every session.

## Web app v1 (built 2026-10-02)

- **Auth:** `src/components/app/TelegramLogin.tsx` (official widget) → `POST /api/auth/telegram`
  (`src/app/api/auth/telegram/route.ts`) → backend → JWT stored in the httpOnly `kc_session`
  cookie (`src/lib/server/backend.ts`). Sign out: `POST /api/auth/logout`.
- **Proxy:** `src/app/api/kc/[...path]/route.ts` — allow-listed `/api/v1` routes, Bearer from
  the cookie, `X-Reauth-Token` forwarded, PDF streamed, a new token from `auth/link` kept
  server-side. A backend 401 clears the cookie.
- **Guard:** `src/middleware.ts` — `/app/*` needs the cookie; signed-in users skip `/signin`.
- **Screens:** `/signin`, `/signup` (`AuthPanel`), `/app` (balance, Move money sheet → Telegram
  for actions not yet on the API, assets, recent activity, invite), `/app/setup` (import first),
  `/app/activity` (periods, filters, statement PDF), `/app/receive`, `/app/settings` (link
  Telegram, recovery phrase via re-auth, referral link, theme, sign out). Shell:
  `src/components/app/AppShell.tsx` (bottom tabs on phones, sidebar on desktop).
- Client helpers and API types: `src/lib/kc.ts`. Shared UI: `src/components/app/ui.tsx`.
- Telegram Login only works on the BotFather domain (kobocent.com), not on preview URLs.
- Verify before pushing: `npm ci && npx next build` (no Node on Emmanuel's machine — a portable
  Node in the Claude scratchpad was used on 2026-10-02).
