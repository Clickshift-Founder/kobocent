import Link from 'next/link';
import { LogoLockup } from '@/components/ui/Logo';
import { BalanceCard } from '@/components/sections/BalanceCard';

const BOT = process.env.NEXT_PUBLIC_TELEGRAM_BOT || 'clicksolbot';

/**
 * Placeholder shell for the authenticated app.
 * Phase 2 replaces this with the real dashboard behind auth.
 */
export default function AppPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="container-page flex items-center justify-between py-6">
        <Link href="/" aria-label="Kobocent home"><LogoLockup /></Link>
        <Link href="/signup" className="btn-primary !px-5 !py-2.5 !text-[14px]">Get started</Link>
      </header>

      <main className="flex-1 container-page grid lg:grid-cols-2 gap-14 items-center py-12">
        <div className="max-w-lg">
          <div className="eyebrow mb-3">Web app · in build</div>
          <h1 className="h-display text-[clamp(30px,4.4vw,46px)] mb-5">
            The full app is <span className="text-terracotta italic">on its way</span>
          </h1>
          <p className="muted text-[15.5px] leading-[1.75] mb-8">
            Everything you can do on Telegram today is coming to the web — same account, same balance,
            fully in sync. Until then, Telegram is the fastest way to start, and nothing will be lost
            when the web app opens.
          </p>
          <div className="flex flex-wrap gap-3">
            <a href={`https://t.me/${BOT}`} target="_blank" rel="noopener noreferrer" className="btn-primary">
              Continue on Telegram
            </a>
            <Link href="/" className="btn-ghost">Back to home</Link>
          </div>
        </div>
        <div className="flex justify-center lg:justify-end"><BalanceCard /></div>
      </main>
    </div>
  );
}
