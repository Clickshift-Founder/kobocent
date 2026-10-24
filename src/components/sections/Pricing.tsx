import Link from 'next/link';
import { Section, SectionHead, Reveal } from '@/components/ui/Section';

const TIERS = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    sub: 'Everything most people need',
    featured: false,
    features: [
      'Buy stablecoins with local currency',
      'Send across borders',
      'Withdraw to any bank',
      'Pay bills, airtime, data, cable',
      'Spend from any of 6 chains',
      'Bridge in and out of Solana',
      'Staking up to 14% APY',
      'Trading on Solana and BNB Chain',
      'Kobo Pal, plus a real person when you need one',
      '20% referral commission',
      '0.2% cashback, spent at checkout',
    ],
    cta: 'Start free',
    href: '/signup',
  },
  {
    name: 'Kobocent Pro',
    price: '$35',
    period: '/month',
    sub: 'Everything for traders, one price',
    featured: true,
    features: [
      'Everything in Free',
      'Ultra on every trade — no +3% fee, MEV-protected',
      'Copy Pro: wallets ranked from real results, no per-trade fee',
      'Sniper Pro: snipe at your price, no 3% snipe fee',
      'Smart Money alerts and Alpha Alerts',
      '$85 bought separately',
    ],
    cta: 'Get Pro',
    href: '/signup?plan=pro',
  },
  {
    name: 'Or pick one',
    price: '$20',
    period: '/month each',
    sub: 'Just the part you use',
    featured: false,
    features: [
      'Ultra — Jito-routed, priority inclusion',
      'Copy Pro — mirror ranked wallets',
      'Sniper Pro — buy the dip or the breakout',
      'Pay from any balance, on any chain',
    ],
    cta: 'Choose a plan',
    href: '/signup?plan=ultra',
  },
];

export function Pricing() {
  return (
    <Section id="pricing">
      <SectionHead
        eyebrow="Pricing"
        title={<>Free for <span className="text-terracotta italic">almost everyone</span></>}
        body="No subscription to send, spend, save or earn. Each payment shows its fee before you confirm, the network fee is on us, and cashback comes off the next one. The paid plans exist only for traders who want priority execution."
      />

      <div className="mt-12 grid lg:grid-cols-3 gap-5">
        {TIERS.map((t, i) => (
          <Reveal key={t.name} delay={i * 80}>
            <div className={`relative rounded-2xl p-7 h-full flex flex-col transition-all duration-300 hover:-translate-y-1
              ${t.featured
                ? 'bg-ink dark:bg-terracotta/[0.12] border-2 border-terracotta shadow-card'
                : 'surface hover:shadow-card'}`}>
              {t.featured && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-terracotta px-3.5 py-1 font-mono text-[9.5px] font-bold uppercase tracking-wider text-white whitespace-nowrap">
                  Most popular
                </span>
              )}
              <div className={`eyebrow mb-3 ${t.featured ? 'text-cream-warm/60' : ''}`}>{t.name}</div>
              <div className="flex items-baseline gap-1 mb-1.5">
                <span className={`font-mono text-[38px] font-semibold leading-none ${t.featured ? 'text-cream' : 'text-ink dark:text-cream-warm'}`}>{t.price}</span>
                <span className={`text-[13px] ${t.featured ? 'text-cream-warm/60' : 'muted'}`}>{t.period}</span>
              </div>
              <p className={`text-[13px] mb-6 ${t.featured ? 'text-cream-warm/70' : 'muted'}`}>{t.sub}</p>

              <ul className="space-y-2.5 mb-7 flex-1">
                {t.features.map((f) => (
                  <li key={f} className={`flex gap-2.5 text-[13px] leading-relaxed ${t.featured ? 'text-cream-warm/85' : 'muted'}`}>
                    <span className="text-terracotta shrink-0 font-semibold">✓</span>{f}
                  </li>
                ))}
              </ul>

              <Link href={t.href} className={t.featured ? 'btn bg-terracotta text-white hover:bg-terracotta-dark w-full' : 'btn-ghost w-full'}>
                {t.cta}
              </Link>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
