'use client';
import Link from 'next/link';
import { BalanceCard } from './BalanceCard';

const BOT = process.env.NEXT_PUBLIC_TELEGRAM_BOT || 'clicksolbot';

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-32 pb-20 sm:pt-40 sm:pb-28">
      {/* warm ambient wash — replaces the old cold navy glow */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 -left-24 h-[520px] w-[520px] rounded-full bg-terracotta/[0.07] blur-3xl" />
        <div className="absolute top-40 -right-32 h-[420px] w-[420px] rounded-full bg-terracotta/[0.05] blur-3xl" />
      </div>

      <div className="container-page grid lg:grid-cols-[1.05fr_0.95fr] gap-14 lg:gap-16 items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-terracotta/25 bg-terracotta/[0.06] px-3.5 py-1.5 mb-7">
            <span className="h-1.5 w-1.5 rounded-full bg-terracotta" />
            <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-terracotta">
              Multichain · powered by stablecoins
            </span>
          </div>

          <h1 className="h-display text-[clamp(38px,5.4vw,66px)] mb-6">
            Your local kobo,<br />
            <span className="text-terracotta italic">working globally.</span>
          </h1>

          <p className="muted text-[17px] leading-[1.75] max-w-[520px] mb-9">
            Buy stablecoins with your local currency. Send money to another country in minutes.
            Pay bills at home, withdraw to your bank, trade what you hold, and earn up to 14% on
            what sits still. One account, one balance — on Telegram or on the web.
          </p>

          <div className="flex flex-wrap gap-3 mb-10">
            <Link href="/signup" className="btn-primary">Create free account</Link>
            <a href={`https://t.me/${BOT}`} target="_blank" rel="noopener noreferrer" className="btn-ghost">
              <span>Open in Telegram</span>
            </a>
          </div>

          <div className="flex flex-wrap items-center gap-x-7 gap-y-3 text-[13px] muted">
            {['No gas fees', 'Non-custodial', 'Withdraw to any bank', '0.2% cashback'].map((t) => (
              <span key={t} className="inline-flex items-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C1502E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                {t}
              </span>
            ))}
          </div>
        </div>

        <div className="flex justify-center lg:justify-end">
          <BalanceCard />
        </div>
      </div>
    </section>
  );
}
