# Kobocent — Web App & Landing

The front-facing layer of Kobocent (formerly ClickBot). Built to convert strangers
into users, and to be the foundation the authenticated app grows out of.

## Stack

- **Next.js 14** (App Router) — server-rendered for SEO, Vercel-native
- **TypeScript** — strict mode
- **Tailwind CSS** — brand tokens in `tailwind.config.ts`
- **PWA** — installable, offline-resilient shell

## Quick start

```bash
npm install
cp .env.example .env.local     # then edit values
npm run dev                    # http://localhost:3000
```

## Project shape

```
src/
├── app/
│   ├── layout.tsx          Fonts, metadata, theme anti-flash script
│   ├── page.tsx            The landing page (composes all sections)
│   ├── globals.css         Base styles + component classes
│   ├── signup/page.tsx     Account creation (phone-first)
│   ├── app/page.tsx        Authenticated app shell (placeholder)
│   └── api/stats/route.ts  Server proxy to the live stats API
├── components/
│   ├── ui/                 Logo, Section, Reveal, ThemeToggle
│   └── sections/           One file per landing-page section
├── data/                   Copy lives here — edit without touching components
└── lib/                    theme, stats, pwa helpers
```

## Editing content

Most copy changes need no React knowledge:

- **Verticals and their features** → `src/data/verticals.ts`
- **Money corridors** → `src/data/corridors.ts`
- **Testimonials** → `src/data/testimonials.ts`
- **Videos** → `src/components/sections/Videos.tsx` (swap the YouTube IDs)
- **Pricing** → `src/components/sections/Pricing.tsx`

## Brand tokens

Defined once in `tailwind.config.ts`:

| Token | Hex | Use |
|---|---|---|
| `terracotta` | `#C1502E` | Primary — actions, accents |
| `ink` | `#20211F` | Secondary — headings, dark surfaces |
| `cream` | `#F7F3EE` | Default light background |
| `cream-warm` | `#F0E6D8` | Cards, section alternation |
| `night` | `#1C1815` | Dark mode background |

Fonts: Fraunces (display), Inter (body), IBM Plex Mono (numbers).

## Theme

Light by default. Dark mode is a user choice, persisted to `localStorage`, with
system preference as the initial fallback. An inline script in `<head>` applies it
before first paint so there is no flash.

## Deployment

See `DEPLOYMENT.md`.
