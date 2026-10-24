import { Section, SectionHead, Reveal } from '@/components/ui/Section';

const STEPS = [
  { n: '01', t: 'Create your account', d: 'Sign up with Google or Apple in a tap. Your wallets on Solana and the EVM chains are created for you in the background — your keys are encrypted, and only you can trigger a transaction.' },
  { n: '02', t: 'Add money', d: 'Buy stablecoins with Naira through a bank transfer, or bring crypto in from any of six chains you already use. Dollars, Pounds and Shillings are next.' },
  { n: '03', t: 'Do the thing you came for', d: 'Pay a bill, send to a bank, withdraw, send it abroad, trade or earn — paying from USDC, USDT, SOL, ETH, BNB or POL, on whichever chain it sits.' },
  { n: '04', t: 'Keep it in sync', d: 'Connect Telegram and the same account follows you there. Start something on the web, finish it in chat — or the other way round. Stuck? Ask Kobo Pal.' },
];

export function HowItWorks() {
  return (
    <Section id="how">
      <SectionHead
        eyebrow="Getting started"
        title={<>Four steps, <span className="text-terracotta italic">about two minutes</span></>}
        body="No exchange account. No KYC wall before you can look around. No wallet extension to install."
      />
      <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {STEPS.map((s, i) => (
          <Reveal key={s.n} delay={i * 70}>
            <div className="relative surface rounded-2xl p-6 h-full">
              <span className="font-mono text-[40px] font-semibold text-terracotta/15 leading-none absolute top-4 right-5 select-none">{s.n}</span>
              <h3 className="font-display text-[17.5px] font-bold text-ink dark:text-cream-warm mb-2.5 pr-10">{s.t}</h3>
              <p className="text-[13.5px] leading-[1.7] muted">{s.d}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
