import { Section, SectionHead, Reveal } from '@/components/ui/Section';

const ITEMS = [
  { icon: '💳', title: 'The Kobocent Card', status: 'In build', body: 'Hold stablecoins, spend in local currency wherever cards are accepted. The balance stays yours until the moment you tap.', highlight: true },
  { icon: '🌍', title: 'More currency corridors', status: 'Rolling out', body: 'Dollars are live. Pounds, Kenyan Shillings, Yen and Yuan open as each corridor is built and licensed.' },
  { icon: '📱', title: 'Native iOS & Android', status: 'Next', body: 'The web app installs to your home screen today. Full App Store and Play Store releases follow.' },
  { icon: '⭐', title: 'Stellar support', status: 'Exploring', body: 'Adding Stellar would give us one of the cheapest, fastest settlement rails for cross-border payouts. Under active evaluation.' },
  { icon: '◆', title: '$SHIFT token launch', status: 'Q1 2027 target', body: 'Points accumulated today convert at launch. Early users earn at a 3× multiplier during this window.' },
  { icon: '🤝', title: 'Business accounts', status: 'Planned', body: 'Multi-user access, approval flows, and bulk payouts for companies paying suppliers or staff across borders.' },
];

export function Roadmap() {
  return (
    <Section id="roadmap">
      <SectionHead
        eyebrow="What we are building next"
        title={<>The road <span className="text-terracotta italic">ahead</span></>}
        body="Published openly so you can hold us to it. Dates are targets, not promises — we would rather ship late than announce something that is not real."
      />

      <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {ITEMS.map((it, i) => (
          <Reveal key={it.title} delay={i * 60}>
            <div className={`rounded-2xl p-6 h-full transition-all duration-300 hover:-translate-y-1
              ${it.highlight
                ? 'bg-terracotta text-white shadow-card'
                : 'surface hover:shadow-card hover:border-terracotta'}`}>
              <div className="flex items-start justify-between gap-3 mb-4">
                <span className="text-[26px]">{it.icon}</span>
                <span className={`font-mono text-[9.5px] uppercase tracking-wider px-2.5 py-1 rounded-full whitespace-nowrap
                  ${it.highlight ? 'bg-white/20 text-white' : 'bg-terracotta/10 text-terracotta'}`}>
                  {it.status}
                </span>
              </div>
              <h3 className={`font-display text-[19px] font-bold mb-2 ${it.highlight ? 'text-white' : 'text-ink dark:text-cream-warm'}`}>
                {it.title}
              </h3>
              <p className={`text-[13.5px] leading-[1.7] ${it.highlight ? 'text-white/85' : 'muted'}`}>
                {it.body}
              </p>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
