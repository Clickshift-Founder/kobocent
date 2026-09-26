import Link from 'next/link';
import { LogoLockup } from '@/components/ui/Logo';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

const BOT = process.env.NEXT_PUBLIC_TELEGRAM_BOT || 'clicksolbot';

const COLS = [
  {
    title: 'Product',
    links: [
      { label: 'Send & Spend', href: '#spending' },
      { label: 'Trading', href: '#trading' },
      { label: 'Staking to Earn', href: '#staking' },
      { label: 'Multichain', href: '#multichain' },
      { label: 'Get the app', href: '#download' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'ClickShift', href: 'https://clickshift.io' },
      { label: 'Community', href: 'https://t.me/ClickShiftAlerts' },
      { label: 'Privacy & Terms', href: 'https://api.clickshift.io/legal' },
      { label: 'support@clickshift.io', href: 'mailto:support@clickshift.io' },
    ],
  },
  {
    title: 'Start',
    links: [
      { label: 'Create account', href: '/signup' },
      { label: 'Open in Telegram', href: `https://t.me/${BOT}` },
      { label: 'Try practice mode', href: `https://t.me/${BOT}?start=practice` },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-cream-border dark:border-night-border py-14">
      <div className="container-page">
        <div className="grid gap-10 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
          <div>
            <LogoLockup />
            <p className="mt-4 text-[13.5px] leading-[1.75] muted max-w-[300px]">
              Your local kobo, working globally. Buy stablecoins with local currency, send across
              borders, pay bills, withdraw to any bank, trade and earn — in one account.
            </p>
            <p className="mt-3 text-[12.5px] muted max-w-[300px]">
              Formerly <strong className="font-semibold">ClickBot</strong> — same team, same wallets,
              same balances. Built by{' '}
              <a href="https://clickshift.io" className="text-terracotta hover:underline">ClickShift</a>.
            </p>
            <div className="mt-5"><ThemeToggle /></div>
          </div>

          {COLS.map((c) => (
            <div key={c.title}>
              <h3 className="eyebrow mb-4">{c.title}</h3>
              <ul className="space-y-2.5">
                {c.links.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-[13.5px] muted hover:text-terracotta transition-colors">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-6 border-t border-cream-border dark:border-night-border flex flex-wrap justify-between gap-3 font-mono text-[11.5px] muted">
          <span>© {new Date().getFullYear()} Kobocent</span>
          <span>kobocent.com · Multichain, powered by stablecoins</span>
        </div>
      </div>
    </footer>
  );
}
