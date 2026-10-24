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
  { n: '01', t: 'Hold it where you like', d: 'USDC and USDT on any of the six chains, or SOL, ETH, BNB and POL. One address covers every EVM chain; Solana has its own.' },
  { n: '02', t: 'Pick “Pay from”', d: 'On a bill, a bank transfer or a withdrawal, choose which balance pays. We pick the cheapest one that covers it until you change it.' },
  { n: '03', t: 'No bridging first', d: 'We collect it on its own chain and settle the payment — the naira lands, the bill is paid. Holding only USDT or USDC on BNB Chain, Polygon or Arbitrum? We cover that network fee.' },
  { n: '04', t: 'Or split it', d: 'Not enough in one place? Pay from up to three balances at once, across chains, in a single payment.' },
];

export function Multichain() {
  return (
    <Section id="multichain">
      <SectionHead
        eyebrow="Six chains · spend from any of them"
        title={<>Hold crypto <span className="text-terracotta italic">anywhere</span>. Spend it here.</>}
        body="Crypto stuck on the wrong chain used to be money you could not spend. Now it is not stuck: pay bills, send to a bank and withdraw straight from Solana, Ethereum, BNB Chain, Polygon, Arbitrum or Robinhood Chain."
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
            Bridging, in and out
          </h3>
        </div>
        <p className="text-[14px] leading-[1.75] muted mb-6 max-w-3xl">
          Most platforms only let crypto flow one way. Kobocent works both. Bridge USDC, USDT or the native
          coin from Ethereum, BNB Chain, Polygon, Arbitrum or Robinhood Chain into Solana — and bridge your
          Solana balance out to any of those five, so you can pay someone on whichever network they actually
          use, or move funds into a platform that only supports one chain.
        </p>
        <div className="grid sm:grid-cols-3 gap-3">
          {[
            { t: 'Into Solana', d: 'From any of the five EVM chains — usually a few minutes.' },
            { t: 'Out of Solana', d: 'To Ethereum, BNB Chain, Polygon, Arbitrum or Robinhood Chain.' },
            { t: 'Or skip it', d: 'Most of the time you don’t need to bridge at all — just pay from where it is.' },
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
