import { Section, SectionHead, Reveal } from '@/components/ui/Section';

export function Extras() {
  return (
    <Section id="extras">
      <SectionHead
        eyebrow="The details that build trust"
        title={<>Small things that make it feel <span className="text-terracotta italic">like a real account</span></>}
        body="The difference between a crypto tool you try once and a financial account you actually keep money in."
      />

      <div className="mt-12 grid lg:grid-cols-3 gap-4">
        {/* Statement */}
        <Reveal>
          <div className="surface rounded-2xl p-6 h-full">
            <div className="text-[28px] mb-3">📄</div>
            <h3 className="font-display text-[19px] font-bold text-ink dark:text-cream-warm mb-2">Account statements</h3>
            <p className="text-[13.5px] leading-[1.7] muted mb-5">
              Download your full history as a clean PDF — the same thing a bank gives you. Pick 7 days,
              30 days, 90 days or everything. Useful for visas, loans, accounting, or just knowing.
            </p>
            <div className="rounded-xl bg-cream-warm dark:bg-night p-4 font-mono">
              <div className="flex justify-between items-center pb-2.5 mb-2.5 border-b border-cream-border dark:border-night-border">
                <span className="text-[11px] font-semibold text-ink dark:text-cream-warm">Kobocent Statement</span>
                <span className="text-[9px] muted">01–30 Sept</span>
              </div>
              {[
                ['🌱 Yield earned', '+$4.21', true],
                ['💡 AEDC electricity', '−₦2,000', false],
                ['🏦 Withdrawal · GTBank', '−₦81,576', false],
                ['↗ Sent · USD', '−$120.00', false],
              ].map(([d, a, pos]) => (
                <div key={d as string} className="flex justify-between py-1 text-[10px]">
                  <span className="muted">{d as string}</span>
                  <span className={pos ? 'text-terracotta font-semibold' : 'text-ink dark:text-cream-warm'}>{a as string}</span>
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        {/* Gasless */}
        <Reveal delay={80}>
          <div className="surface rounded-2xl p-6 h-full">
            <div className="text-[28px] mb-3">⛽</div>
            <h3 className="font-display text-[19px] font-bold text-ink dark:text-cream-warm mb-2">No gas fees, ever</h3>
            <p className="text-[13.5px] leading-[1.7] muted mb-5">
              You never need to hold a separate token just to move your own money. We sponsor the network
              fee ourselves — so a wallet holding nothing but stablecoins still works perfectly. This is
              the single biggest thing that stops normal people using crypto, and we removed it.
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              {[['🚫⛽', 'No gas token needed'], ['⚡', 'We cover the fee']].map(([i, t]) => (
                <div key={t} className="rounded-xl bg-cream-warm dark:bg-night p-4 text-center">
                  <div className="text-[20px] mb-1.5">{i}</div>
                  <div className="text-[11px] muted leading-tight">{t}</div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        {/* Cashback */}
        <Reveal delay={160}>
          <div className="surface rounded-2xl p-6 h-full">
            <div className="text-[28px] mb-3">🎁</div>
            <h3 className="font-display text-[19px] font-bold text-ink dark:text-cream-warm mb-2">0.2% cashback, with a receipt</h3>
            <p className="text-[13.5px] leading-[1.7] muted mb-5">
              Every transaction gives something back — and every one produces a receipt you can actually
              keep. Most platforms charge you to move your money and hand you nothing. We do the opposite.
            </p>
            <div className="rounded-xl bg-terracotta/[0.07] border border-terracotta/20 p-4">
              <div className="font-mono text-[26px] font-semibold text-terracotta leading-none mb-1.5">0.2%</div>
              <div className="text-[12px] muted">back on every single transaction</div>
            </div>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
