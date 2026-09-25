import Link from 'next/link';
import { Section, SectionHead, Reveal } from '@/components/ui/Section';

const BOT = process.env.NEXT_PUBLIC_TELEGRAM_BOT || 'clicksolbot';

export function Rewards() {
  return (
    <Section id="rewards" tone="warm">
      <SectionHead
        eyebrow="Earn beyond the balance"
        title={<>Two ways the platform <span className="text-terracotta italic">pays you back</span></>}
      />

      <div className="mt-12 grid lg:grid-cols-2 gap-4">
        <Reveal>
          <div className="surface rounded-2xl p-8 h-full">
            <div className="text-[28px] mb-4">🤝</div>
            <h3 className="font-display text-[22px] font-bold text-ink dark:text-cream-warm mb-3">
              20% commission, for life
            </h3>
            <p className="text-[14px] leading-[1.75] muted mb-6">
              Share your link. Every time someone you referred generates a fee, you earn 20% of it —
              paid automatically, instantly, with no cap and no expiry date. Not for ninety days.
              For as long as they keep using Kobocent.
            </p>
            <ul className="space-y-2.5 mb-7">
              {['Paid instantly, not monthly', 'No cap on how much you earn', 'Lifetime — not a 90-day window'].map((t) => (
                <li key={t} className="flex gap-2.5 text-[13.5px] muted">
                  <span className="text-terracotta shrink-0">✓</span>{t}
                </li>
              ))}
            </ul>
            <Link href="/signup" className="btn-primary">Get your link</Link>
          </div>
        </Reveal>

        <Reveal delay={90}>
          <div className="surface rounded-2xl p-8 h-full">
            <div className="text-[28px] mb-4">◆</div>
            <h3 className="font-display text-[22px] font-bold text-ink dark:text-cream-warm mb-3">
              $SHIFT points, ahead of launch
            </h3>
            <p className="text-[14px] leading-[1.75] muted mb-6">
              Every transaction you make accumulates $SHIFT points. The token generation event is
              targeted for Q1 2027, and early users earn at a 3× multiplier during this window —
              simply for using the product you were going to use anyway.
            </p>
            <div className="grid grid-cols-2 gap-3 mb-7">
              <div className="rounded-xl bg-cream-warm dark:bg-night p-4">
                <div className="font-mono text-[20px] font-semibold text-terracotta leading-none mb-1.5">3×</div>
                <div className="text-[11.5px] muted leading-tight">Early adopter multiplier</div>
              </div>
              <div className="rounded-xl bg-cream-warm dark:bg-night p-4">
                <div className="font-mono text-[20px] font-semibold text-terracotta leading-none mb-1.5">Q1 &apos;27</div>
                <div className="text-[11.5px] muted leading-tight">Target launch window</div>
              </div>
            </div>
            <a href={`https://t.me/${BOT}`} target="_blank" rel="noopener noreferrer" className="btn-ghost">
              Start accumulating
            </a>
          </div>
        </Reveal>
      </div>

      <p className="mt-6 text-center text-[12px] muted max-w-2xl mx-auto leading-relaxed">
        $SHIFT points are a usage-reward mechanism, not a security or an investment product, and
        carry no guarantee of future value. Launch timing is a target, not a commitment.
      </p>
    </Section>
  );
}
