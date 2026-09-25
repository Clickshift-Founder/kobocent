import { Section, SectionHead, Reveal } from '@/components/ui/Section';

const CHAINS = [
  { name: 'Ethereum', dot: '#627EEA' },
  { name: 'BNB Chain', dot: '#F0B90B' },
  { name: 'Polygon', dot: '#8247E5' },
  { name: 'Arbitrum', dot: '#28A0F0' },
  { name: 'Robinhood Chain', dot: '#C1502E' },
  { name: 'Solana', dot: '#14F195' },
];

const STEPS = [
  { n: '01', t: 'Pick your chain and asset', d: 'Choose where your crypto lives today and whether it is a native token or a stablecoin.' },
  { n: '02', t: 'Send to your address', d: 'One address works across every EVM chain we support. Pick the matching network when you send.' },
  { n: '03', t: 'It becomes spendable', d: 'Whatever you send converts into stablecoin you can actually use — usually within minutes. Gas is handled for you.' },
  { n: '04', t: 'Spend, send, or withdraw', d: 'Pay a bill, send it abroad, withdraw to a bank, trade it, or stake it. Same balance, all options open.' },
];

export function Multichain() {
  return (
    <Section id="multichain">
      <SectionHead
        eyebrow="Six chains · one balance"
        title={<>Hold crypto <span className="text-terracotta italic">anywhere</span>. Use it here.</>}
        body="Crypto stuck on the wrong chain is money you cannot spend. Bring it in from any chain we support — and send it back out to whichever chain the other side actually uses."
      />

      <div className="mt-10 flex flex-wrap justify-center gap-2.5">
        {CHAINS.map((c) => (
          <span key={c.name} className="inline-flex items-center gap-2 rounded-full surface px-4 py-2.5 text-[13.5px] font-medium">
            <span className="h-2 w-2 rounded-full" style={{ background: c.dot }} />
            {c.name}
          </span>
        ))}
      </div>

      <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {STEPS.map((s, i) => (
          <Reveal key={s.n} delay={i * 70}>
            <div className="surface rounded-2xl p-6 h-full">
              <div className="grid place-items-center h-10 w-10 rounded-full border border-terracotta text-terracotta font-mono text-[13px] font-semibold mb-4">
                {s.n}
              </div>
              <h3 className="font-display text-[17px] font-bold text-ink dark:text-cream-warm mb-2">{s.t}</h3>
              <p className="text-[13px] leading-[1.7] muted">{s.d}</p>
            </div>
          </Reveal>
        ))}
      </div>


      <div className="mt-10 surface rounded-2xl p-7 sm:p-8">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <span className="rounded-full bg-terracotta/10 px-3 py-1 font-mono text-[10.5px] uppercase tracking-wider text-terracotta">
            Both directions
          </span>
          <h3 className="font-display text-[20px] font-bold text-ink dark:text-cream-warm">
            Bridging out, not just in
          </h3>
        </div>
        <p className="text-[14px] leading-[1.75] muted mb-6 max-w-3xl">
          Most platforms only let crypto flow one way. Kobocent works both. Buy a stablecoin with
          Naira, and that same balance can be bridged out to Ethereum, BNB Chain, Polygon, Arbitrum
          or Robinhood Chain — so you can pay someone on whichever network they actually use, or
          move funds into a platform that only supports one chain.
        </p>
        <div className="grid sm:grid-cols-3 gap-3">
          {[
            { t: 'Buy with local currency', d: 'Naira today. Dollars, Pounds, Shillings next.' },
            { t: 'Held as stablecoin', d: 'Issued on Solana — fast and cheap to move.' },
            { t: 'Bridge out anywhere', d: 'To any of the six chains, whenever you need to.' },
          ].map((x) => (
            <div key={x.t} className="rounded-xl bg-cream-warm dark:bg-night p-5">
              <div className="text-[14px] font-semibold text-ink dark:text-cream-warm mb-1.5">{x.t}</div>
              <div className="text-[12.5px] muted leading-relaxed">{x.d}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-terracotta/25 bg-terracotta/[0.05] p-5 sm:p-6 flex gap-4">
        <span className="text-[20px] shrink-0">⚠️</span>
        <p className="text-[13.5px] leading-[1.7] muted">
          <strong className="text-terracotta font-semibold">Always match the network.</strong>{' '}
          When sending from an exchange, pick the same network you selected here (ERC-20 for Ethereum,
          BEP-20 for BNB Chain, and so on). Sending on the wrong network can lose funds — Kobocent shows
          you exactly which one to choose before you send.
        </p>
      </div>
    </Section>
  );
}
