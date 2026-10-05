'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BOT_URL, loadProfile, type LocalProfile } from '@/lib/kc';
import { PageHeader } from '@/components/app/PageHeader';
import { LogoMark } from '@/components/ui/Logo';
import { IconBolt, IconShield, IconTelegram, IconPlus } from '@/components/app/Icons';

/**
 * Kobo Card — coming soon (ROADMAP item 10). A debit card that spends the user's stablecoin balance,
 * virtual first, physical later. Until a card-issuing partner is live this screen builds anticipation
 * honestly: no dates, no fake waitlist numbers. Deep ink with the Kobocent mark (the Add money account
 * panel is terracotta, so the two never look like the same thing).
 */

const POWERS = [
  { t: 'Shop online, worldwide', b: 'Pay on any site that takes cards — straight from your USDC balance.', glyph: '🛍️' },
  { t: 'Apps & subscriptions', b: 'Streaming, music, cloud storage, AI tools — the monthly things that need a card.', glyph: '🎧' },
  { t: 'Travel & bookings', b: 'Flights, hotels and rides — at home and abroad.', glyph: '✈️' },
  { t: 'Bills on the same balance', b: 'Electricity, airtime, data and TV already work here — the card adds everything else.', glyph: '⚡' },
  { t: 'Tap in stores', b: 'A physical card comes after the virtual one.', glyph: '💳' },
  { t: 'You stay in control', b: 'Freeze and unfreeze in a tap, set spend limits, see every card payment as it happens.', glyph: '🛡️' },
];

export default function CardPage() {
  const [profile, setProfile] = useState<LocalProfile | null>(null);
  const [face, setFace] = useState<'virtual' | 'physical'>('virtual');
  useEffect(() => { setProfile(loadProfile()); }, []);
  const name = (profile?.firstName || profile?.username || 'Your name').toUpperCase().slice(0, 22);

  return (
    <div className="space-y-6">
      <PageHeader title="Card" subtitle="Spend your stablecoins anywhere cards are accepted." />

      {/* Card face */}
      <section className="flex flex-col items-center">
        <div className="relative w-full max-w-[380px] aspect-[1.586] rounded-[22px] overflow-hidden text-cream-warm shadow-card select-none"
          style={{ background: face === 'virtual' ? 'linear-gradient(135deg,#20211F 0%,#2C2A27 55%,#1C1815 100%)' : 'linear-gradient(135deg,#1C1815 0%,#3A332D 60%,#20211F 100%)' }}>
          <div aria-hidden className="absolute inset-0 opacity-[0.18] animate-pulse" style={{ background: 'radial-gradient(120% 80% at 85% 0%, #C1502E 0%, transparent 55%)' }} />
          <div aria-hidden className="absolute -right-10 -bottom-12 h-48 w-48 rounded-full border-[18px] border-white/[0.05]" />
          <div className="relative h-full p-5 flex flex-col">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2"><LogoMark size={26} className="text-terracotta" /><span className="font-display font-bold tracking-wide text-[16px]">Kobocent</span></div>
              <span className="rounded-full bg-terracotta px-2.5 py-1 text-[11px] font-bold tracking-wide text-white">COMING SOON</span>
            </div>
            <div className="mt-auto">
              {face === 'physical' && <div aria-hidden className="mb-3 h-8 w-11 rounded-md" style={{ background: 'linear-gradient(135deg,#D9B26B,#9C7A3C)' }} />}
              <div className="font-mono text-[17px] tracking-[0.22em] text-cream-warm/80">•••• •••• •••• ••••</div>
              <div className="mt-3 flex items-end justify-between">
                <div><div className="text-[9.5px] tracking-widest text-cream-warm/50">CARDHOLDER</div><div className="font-semibold tracking-wide text-[14px]">{name}</div></div>
                <div className="text-right"><div className="text-[9.5px] tracking-widest text-cream-warm/50">{face === 'virtual' ? 'VIRTUAL' : 'PHYSICAL'}</div><div className="font-semibold text-[14px]">USDC</div></div>
              </div>
            </div>
          </div>
        </div>
        <div role="tablist" className="mt-4 grid grid-cols-2 gap-1 rounded-2xl bg-cream-warm dark:bg-night p-1 w-full max-w-[260px]">
          {(['virtual', 'physical'] as const).map(f => (
            <button key={f} role="tab" aria-selected={face === f} onClick={() => setFace(f)}
              className={`min-h-[44px] rounded-xl text-[14px] font-semibold capitalize ${face === f ? 'bg-white dark:bg-night-card text-terracotta shadow-sm' : 'muted'}`}>{f}</button>
          ))}
        </div>
        <p className="mt-2 text-[12.5px] muted">{face === 'virtual' ? 'Arrives first — ready to use online the moment it’s issued.' : 'Comes later, for tapping in stores.'}</p>
      </section>

      <section className="rounded-3xl p-5 text-white" style={{ background: 'linear-gradient(135deg,#C1502E,#9A3E22)' }}>
        <div className="font-display text-[20px] font-bold">One balance. Bank transfers, bills — and soon, a card.</div>
        <p className="mt-1 text-[14px] text-white/90">The Kobo Card will spend the same stablecoin balance you already hold here. Nothing to top up, nothing to move.</p>
      </section>

      <section>
        <h2 className="font-display text-[18px] font-bold text-ink dark:text-cream-warm mb-3">What your card will power</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {POWERS.map(p => (
            <div key={p.t} className="surface rounded-2xl p-4 flex gap-3">
              <span aria-hidden className="grid place-items-center h-10 w-10 shrink-0 rounded-xl bg-cream-warm dark:bg-night text-[20px]">{p.glyph}</span>
              <div><div className="font-semibold text-[15px] text-ink dark:text-cream-warm">{p.t}</div><p className="muted text-[13.5px] leading-relaxed mt-0.5">{p.b}</p></div>
            </div>
          ))}
        </div>
      </section>

      <section className="surface rounded-3xl p-5">
        <div className="flex items-start gap-3">
          <IconShield size={22} className="text-terracotta shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-ink dark:text-cream-warm">Get ready now</div>
            <p className="muted text-[13.5px] leading-relaxed mt-0.5">Verify your account and keep some USDC in your wallet, and you’ll be ready the day it launches. We’ll announce it here and on Telegram first.</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link href="/app/add-money" className="btn-primary min-h-[48px] inline-flex items-center justify-center gap-2"><IconPlus size={18} />Add money</Link>
          <a href={BOT_URL} target="_blank" rel="noopener noreferrer" className="btn-ghost min-h-[48px] inline-flex items-center justify-center gap-2"><IconTelegram />Follow on Telegram</a>
        </div>
      </section>

      <p className="text-center muted text-[12px] px-6 flex items-center justify-center gap-1.5"><IconBolt size={14} />Card features and availability depend on our card-issuing partner.</p>
    </div>
  );
}
