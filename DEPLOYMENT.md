# Deployment Guide

From this zip to a live site at **kobocent.com**.

---

## 1. Get it running locally

```bash
unzip kobocent-web.zip && cd kobocent-web
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. If it renders, you are ready to ship.

> **Note on fonts:** the app uses `next/font` to self-host Fraunces, Inter and
> IBM Plex Mono. The build fetches them from Google Fonts once at build time.
> This works on Vercel and any normal machine — it only fails on networks that
> block `fonts.googleapis.com`.

---

## 2. Push to GitHub

```bash
git init
git add .
git commit -m "Kobocent web app — initial build"
git branch -M main
git remote add origin https://github.com/Clickshift-Founder/kobocent-web.git
git push -u origin main
```

Create the empty repo on GitHub first (no README, no .gitignore — this zip has both).

---

## 3. Deploy on Vercel

1. Go to **vercel.com/new** and import the repo.
2. Vercel auto-detects Next.js — leave the build settings alone.
3. Add environment variables (Settings → Environment Variables):

| Key | Value |
|---|---|
| `NEXT_PUBLIC_STATS_API` | `https://api.clickshift.io` |
| `NEXT_PUBLIC_TELEGRAM_BOT` | `kobocentbot` |
| `NEXT_PUBLIC_SITE_URL` | `https://kobocent.com` |

4. Click **Deploy**.

---

## 4. Point kobocent.com at it

In Vercel → your project → **Settings → Domains** → add `kobocent.com` and `www.kobocent.com`.

At your registrar (Namecheap), set:

| Type | Host | Value |
|---|---|---|
| A | `@` | `76.76.21.21` |
| CNAME | `www` | `cname.vercel-dns.com` |

DNS usually propagates in 10–60 minutes. Vercel issues the SSL certificate automatically.

> Verify the exact values in Vercel's domain screen before entering them — they
> occasionally change, and Vercel shows the current ones for your project.

---

## 5. Redirect the old landing page

Once kobocent.com is live and you are happy with it, redirect the old page so you
keep any accumulated SEO value. On the **old** ClickBot site, add:

```json
{
  "redirects": [
    { "source": "/(.*)", "destination": "https://kobocent.com/$1", "permanent": true }
  ]
}
```

`permanent: true` issues a 301, which tells search engines the move is permanent
and passes ranking signals to the new domain. Do not do this until the new site
is fully working.

---

## 6. Telegram migration — @clicksolbot → @kobocentbot

You have created `@kobocentbot` and have its token. Here is the honest picture.

### What cannot be done

**Telegram does not let you transfer users between bots.** There is no migration API.
Your existing users' chat history, and their binding to `@clicksolbot`, stay where they are.
Anyone who wants to use the new bot has to press Start on it once.

### What this means practically

You have two viable paths. I would take Path A.

#### Path A — Run both, migrate gradually (recommended)

Keep `@clicksolbot` alive and pointed at the same backend. Add the new bot alongside it.

1. Point both bot tokens at your existing backend. Most bot frameworks let you run
   two `Telegraf` instances against the same handlers — or run a second process with
   a different `BOT_TOKEN` env var.
2. Because both write to the same database, a user is the *same user* on either bot,
   keyed by their Telegram user ID. Balances and history carry over automatically.
3. Broadcast to `@clicksolbot` users announcing the new name, with a direct link to
   `t.me/kobocentbot`. Repeat a few times over several weeks.
4. Change `@clicksolbot`'s bot description and `/start` message to point at the new one.
5. Once the vast majority have moved, retire the old bot.

**Why this is the safer path:** nobody loses access, nothing breaks mid-transaction,
and users move at their own pace. The cost is running two bots for a while.

#### Path B — Rename in place

BotFather lets you change a bot's *display name* (`/setname`) but **not its @username**
if the new one is taken — and you have already registered `@kobocentbot`, so this
route is closed unless you delete that bot first and rename the old one.

If you wanted this, you would: delete `@kobocentbot` in BotFather, then
`/setusername` on `@clicksolbot` to claim `kobocentbot`. Existing users keep working
with zero migration.

**The risk:** deleting and renaming is irreversible and there is a window where the
username is unclaimed. I would not do this on a bot with live user funds.

### Whichever path you pick

Update `NEXT_PUBLIC_TELEGRAM_BOT` in Vercel to the handle you land on. Every link on
the site reads from that one variable, so the whole site updates with one change.

---

## 7. Phase 2 — Web ↔ Telegram account sync

The signup form currently collects identity and hands off to Telegram. To make the
web app a real client, you need a shared identity layer. The shape I would build:

### The model

```
users
  id              uuid primary key
  phone           text unique not null
  email           text unique
  telegram_id     bigint unique          -- null until linked
  wallet_address  text not null
  created_at      bigint
```

The **account** is the primary key. Telegram ID and wallet are attributes of it, not
identities in themselves. This is what lets one person use both surfaces.

### Linking flow (web user adds Telegram)

1. Web app generates a short-lived, single-use code (e.g. 8 chars, 10-minute TTL),
   stored against the user ID.
2. It shows a deep link: `https://t.me/kobocentbot?start=link_<CODE>`.
3. The bot's `/start` handler reads the payload, looks up the code, and writes
   `telegram_id` onto that user row.
4. Code is consumed. Both surfaces now resolve to the same account.

### Linking flow (Telegram user adds web)

Reverse it: the bot issues the code, the web app has a "Link account" field.

### Why a shared secret matters

Both surfaces will call the same backend. Sign requests between the web app and
your API with a server-side secret (`TELEGRAM_LINK_SECRET` in `.env.example`) so a
forged request cannot claim someone else's Telegram ID. Never put this key in
`NEXT_PUBLIC_*` — anything with that prefix is shipped to the browser.

### Sequencing suggestion

1. Auth (phone OTP) + user table
2. Wallet creation on signup, reusing the bot's existing derivation
3. Telegram linking via the code flow above
4. Read-only dashboard on the web (balances, history) — low risk, high value
5. Only then: write operations (send, trade, stake) on the web

---

## 8. Before you go live — checklist

- [ ] Replace the four photo slots (`public/images/README.md` has the shot list)
- [ ] Swap YouTube IDs in `src/components/sections/Videos.tsx` once Kobocent films exist
- [ ] Confirm the stats API returns what `LiveStats` expects, or the cards show dashes
- [ ] Update `NEXT_PUBLIC_TELEGRAM_BOT` to your final bot handle
- [ ] Run Lighthouse and confirm the PWA installs on a real phone
- [ ] Test dark mode on both iOS Safari and Android Chrome
- [ ] Verify the redirect from the old domain only after the new site is confirmed good

---

## 9. Telegram migration — the concrete assets

You confirmed BotFather will not let you change `@clicksolbot`'s username (it is
taken, by your own new bot). Fragment could sell you an additional username, but
that solves a vanity problem, not a migration one — your users still sit on the
old bot either way.

**So: Path A. Run both, redirect the old one.** Here is what you actually need.

### 9a. Point both bots at the same backend

In your bot process, run a second Telegraf instance with the new token:

```js
// index.js
const { Telegraf } = require('telegraf');

const bots = [
  new Telegraf(process.env.BOT_TOKEN),           // @clicksolbot  (legacy)
  new Telegraf(process.env.BOT_TOKEN_KOBOCENT),  // @kobocentbot  (new)
];

// Register the SAME handlers on both — they share one database,
// so a user is the same user whichever bot they open.
bots.forEach((bot) => {
  registerAllHandlers(bot);
  bot.launch();
});
```

Add `BOT_TOKEN_KOBOCENT` to your `.env` on the VPS. Because both write to the
same tables keyed by Telegram user ID, balances and history carry across with
no migration script.

### 9b. Make the legacy bot's /start redirect

On `@clicksolbot` only, intercept `/start` before the normal onboarding:

```js
legacyBot.start(async (ctx) => {
  return ctx.replyWithMarkdown(
    `👋 *We're now Kobocent.*\n\n` +
    `ClickBot has a new name and a new home — same account, same balance, ` +
    `nothing lost.\n\n` +
    `Tap below to continue on the new bot. Your wallet and history are already there.`,
    Markup.inlineKeyboard([
      [Markup.button.url('Open Kobocent →', 'https://t.me/kobocentbot')],
      [Markup.button.callback('Stay here for now', 'legacy_stay')],
    ])
  );
});
```

Keep `legacy_stay` working normally so nobody is locked out mid-transaction.

### 9c. Update the legacy bot's profile in BotFather

- `/setdescription` → "We're now Kobocent → t.me/kobocentbot. Same account, same balance."
- `/setabouttext` → "Moved to @kobocentbot"

### 9d. Broadcast copy

Send this through your existing personalised broadcast (it already substitutes
`{firstname}`):

```
Hey {firstname} 👋

Big news: *ClickBot is now Kobocent.*

Same team, same wallet, same balance — a name that finally says what we
actually do. Your local kobo, working globally.

Nothing is lost. Your account, your funds and your history are already
waiting on the new bot.

👉 Open Kobocent: t.me/kobocentbot

Why the change? We're no longer just a trading bot. You can buy stablecoins
with Naira, send money across borders, pay bills, withdraw to any bank, trade
and earn — and "ClickBot" stopped describing that a while ago.

Everything keeps working here in the meantime. Take your time.

— Emmanuel
```

Send it two or three times over a few weeks, then retire the old bot once the
majority have moved.

### 9e. Update the website

Set `NEXT_PUBLIC_TELEGRAM_BOT=kobocentbot` in Vercel. Every Telegram link on the
site reads that one variable, so the whole site switches at once.
