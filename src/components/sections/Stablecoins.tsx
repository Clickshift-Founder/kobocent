import { Section, SectionHead, Reveal } from '@/components/ui/Section';

/**
 * The piece that has been under-explained: buying a stablecoin with local
 * currency, then moving it OUT to whichever chain or currency the
 * recipient actually needs. Inbound bridging is only half the story.
 */
const JOURNEY = [
  { n: '01', t: 'Pay in your own currency', d: 'Transfer Naira from your bank. Dollars, Pounds and Kenyan Shillings are next in line.', icon: '🏦' },
  { n: '02', t: 'It becomes a stablecoin', d: 'You receive USDC, issued on Solana — fast to settle and cheap to move. You do not have to know or care that this happened.', icon: '🪙' },
  { n: '03', t: 'Move it anywhere it needs to be', d: 'Bridge that same balance out to Ethereum, BNB Chain, Polygon, Arbitrum or Robinhood Chain — whichever network the person or platform on the other side uses.', icon: '⛓️' },
  { n: '04', t: 'It lands as real money', d: 'Pay a supplier in Dollars today. Yuan, Yen and more as each corridor opens. Or send it straight back into a bank account.', icon: '🌍' },
];

export function Stablecoins() {
  return (
    <Section id="stablecoins" tone="warm">
      <SectionHead
        eyebrow="How the money actually travels"
        title={<>One stablecoin, <span className="text-terracotta italic">every destination</span></>}
        body="This is the engine underneath everything else. You buy a stablecoin once with the money you already have, and from there it can go out to any chain we support — or land as local currency in someone else's bank account."
      />

      <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {JOURNEY.map((s, i) => (
          <Reveal key={s.n} delay={i * 70}>
            <div className="surface rounded-2xl p-6 h-full flex flex-col">
              <div className="text-[26px] mb-3">{s.icon}</div>
              <div className="font-mono text-[11px] text-terracotta mb-2">{s.n}</div>
              <h3 className="font-display text-[17px] font-bold text-ink dark:text-cream-warm mb-2">{s.t}</h3>
              <p className="text-[13px] leading-[1.7] muted">{s.d}</p>
            </div>
          </Reveal>
        ))}
      </div>

      <div className="mt-8 grid md:grid-cols-2 gap-4">
        <div className="surface rounded-2xl p-6">
          <h3 className="font-display text-[18px] font-bold text-ink dark:text-cream-warm mb-3">Money in</h3>
          <ul className="space-y-2.5">
            {['Naira via bank transfer — live today', 'Crypto from 6 chains, native or stablecoin', 'Dollars, Pounds, Kenyan Shillings — next'].map((t) => (
              <li key={t} className="flex gap-2.5 text-[13.5px] muted leading-relaxed">
                <span className="text-terracotta shrink-0">→</span>{t}
              </li>
            ))}
          </ul>
        </div>
        <div className="surface rounded-2xl p-6">
          <h3 className="font-display text-[18px] font-bold text-ink dark:text-cream-warm mb-3">Money out</h3>
          <ul className="space-y-2.5">
            {['Bridge out to any supported chain', 'Withdraw as Naira to 200+ banks', 'Pay bills, airtime, data, cable directly', 'Send to a person in another country'].map((t) => (
              <li key={t} className="flex gap-2.5 text-[13.5px] muted leading-relaxed">
                <span className="text-terracotta shrink-0">→</span>{t}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  );
}
