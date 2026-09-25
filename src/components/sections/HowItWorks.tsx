import { Section, SectionHead, Reveal } from '@/components/ui/Section';

const STEPS = [
  { n: '01', t: 'Create your account', d: 'Sign up with your phone number or email. A non-custodial wallet is created for you in the background — no seed phrase to memorise before you have even seen the product.' },
  { n: '02', t: 'Add money', d: 'Buy stablecoins with Naira through a bank transfer, or bring crypto in from any chain you already use. Dollars, Pounds and Shillings are next.' },
  { n: '03', t: 'Do the thing you came for', d: 'Send it abroad, pay a bill, withdraw to a bank, trade it, or stake it. Everything runs off the same balance.' },
  { n: '04', t: 'Keep it in sync', d: 'Link Telegram and the same account follows you there. Start something on the web, finish it in chat — or the other way round.' },
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
