import Link from 'next/link';
import { Section, SectionHead, Reveal } from '@/components/ui/Section';

const BOT = process.env.NEXT_PUBLIC_TELEGRAM_BOT || 'kobocentbot';

/** How Kobocent gives back (2026-10-24): cashback spent at checkout, 20 % referral commission, $SHIFT points. */
export function Rewards() {
  return (
    <Section id="rewards" tone="warm">
      <SectionHead
        eyebrow="How we give back"
        title={<>Three ways the platform <span className="text-terracotta italic">pays you back</span></>}
        body="Most money apps charge you to move your own money and hand you nothing. Every payment on Kobocent gives something back."
      />

      <div className="mt-12 grid lg:grid-cols-3 gap-4">
        <Reveal>
          <div className="surface rounded-2xl p-8 h-full flex flex-col">
            <div className="text-[28px] mb-4">🎁</div>
            <h3 className="font-display text-[22px] font-bold text-ink dark:text-cream-warm mb-3">
              Cashback you can see
            </h3>
            <p className="text-[14px] leading-[1.75] muted mb-6">
              0.2% of every bank transfer, bill and withdrawal comes back to you. When it reaches ₦50, flip
              “Use cashback” on your next payment and watch the amount you pay drop — or the naira you
              receive go up — before you confirm.
            </p>
            <div className="rounded-xl bg-cream-warm dark:bg-night p-4 mb-7 mt-auto">
              <div className="flex items-center justify-between text-[13px]">
                <span className="muted">You pay</span>
                <span className="font-mono"><s className="muted mr-2">$12.40</s><span className="text-ink dark:text-cream-warm font-semibold">$12.31</span></span>
              </div>
              <div className="flex items-center justify-between text-[12px] mt-1.5">
                <span className="muted">Cashback used</span>
                <span className="font-mono text-[#58834C]">−₦135</span>
              </div>
            </div>
            <Link href="/signup" className="btn-primary">Start earning it</Link>
          </div>
        </Reveal>

        <Reveal delay={80}>
          <div className="surface rounded-2xl p-8 h-full flex flex-col">
            <div className="text-[28px] mb-4">🤝</div>
            <h3 className="font-display text-[22px] font-bold text-ink dark:text-cream-warm mb-3">
              20% commission, for life
            </h3>
            <p className="text-[14px] leading-[1.75] muted mb-6">
              Share your link. Every time someone you referred pays a fee — a trade, a bank transfer, a bill,
              a withdrawal, or staking — you earn 20% of it, paid to your wallet. Not for ninety days. For as
              long as they keep using Kobocent.
            </p>
            <ul className="space-y-2.5 mb-7 mt-auto">
              {['Paid to your wallet within minutes', 'No cap on how much you earn', 'Lifetime — not a 90-day window'].map((t) => (
                <li key={t} className="flex gap-2.5 text-[13.5px] muted">
                  <span className="text-terracotta shrink-0">✓</span>{t}
                </li>
              ))}
            </ul>
            <Link href="/signup" className="btn-ghost">Get your link</Link>
          </div>
        </Reveal>

        <Reveal delay={160}>
          <div className="surface rounded-2xl p-8 h-full flex flex-col">
            <div className="text-[28px] mb-4">◆</div>
            <h3 className="font-display text-[22px] font-bold text-ink dark:text-cream-warm mb-3">
              $SHIFT points
            </h3>
            <p className="text-[14px] leading-[1.75] muted mb-6">
              Payments, bills, withdrawals, staking and friends who start transacting all earn $SHIFT points —
              with weekly, monthly and all-time leaderboards. Early users earn at a 3× multiplier.
            </p>
            <div className="grid grid-cols-2 gap-3 mb-7 mt-auto">
              <div className="rounded-xl bg-cream-warm dark:bg-night p-4">
                <div className="font-mono text-[20px] font-semibold text-terracotta leading-none mb-1.5">3×</div>
                <div className="text-[11.5px] muted leading-tight">Early adopter multiplier</div>
              </div>
              <div className="rounded-xl bg-cream-warm dark:bg-night p-4">
                <div className="font-mono text-[20px] font-semibold text-terracotta leading-none mb-1.5">Q2 &apos;27</div>
                <div className="text-[11.5px] muted leading-tight">Token launch target</div>
              </div>
            </div>
            <a href={`https://t.me/${BOT}`} target="_blank" rel="noopener noreferrer" className="btn-ghost">
              Start accumulating
            </a>
          </div>
        </Reveal>
      </div>

      <p className="mt-6 text-center text-[12px] muted max-w-2xl mx-auto leading-relaxed">
        $SHIFT is a usage-reward point, not a security or an investment product, and carries no guarantee of
        future value. Launch timing is a target, not a commitment.
      </p>
    </Section>
  );
}
