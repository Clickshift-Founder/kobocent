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
      'Bridge across all 6 chains',
      'Staking up to 14% APY',
      'Full trading suite',
      '20% referral commission',
      '0.2% cashback on transactions',
    ],
    cta: 'Start free',
    href: '/signup',
  },
  {
    name: 'Ultra Speed',
    price: '$20',
    period: '/month',
    sub: 'For people trading seriously',
    featured: true,
    features: [
      'Everything in Free',
      'Unlimited MEV-protected trades',
      'No per-trade priority fee',
      'Priority block inclusion',
      'Anti-sandwich routing',
      'Anti-frontrun protection',
    ],
    cta: 'Subscribe',
    href: '/signup?plan=ultra',
  },
  {
    name: 'Sniper Pro',
    price: '$20',
    period: '/month',
    sub: 'For launch hunters',
    featured: false,
    features: [
      'Everything in Free',
      'Ultra Speed on all snipes',
      'Instant and limit sniping',
      'Auto take-profit and stop-loss',
      'Pending snipe manager',
      'Built for new launches',
    ],
    cta: 'Get Sniper Pro',
    href: '/signup?plan=sniper',
  },
];

export function Pricing() {
  return (
    <Section id="pricing">
      <SectionHead
        eyebrow="Pricing"
        title={<>Free for <span className="text-terracotta italic">almost everyone</span></>}
        body="Sending, spending, saving and earning cost nothing beyond the network's own transaction fees. The paid tiers exist only for high-frequency traders who want priority execution."
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
