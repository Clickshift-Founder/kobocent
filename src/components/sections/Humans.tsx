import { Section, SectionHead, Reveal } from '@/components/ui/Section';
import { SCENES } from '@/components/ui/Scenes';

/**
 * Each moment renders an illustrated scene by default. Drop a real, consented
 * photograph at the `photo` path and it takes over automatically — see
 * public/images/README.md for the shot list.
 */
const MOMENTS = [
  { key: 'bill' as const,      caption: 'Paying a light bill from the balcony', photo: '/images/people/paying-bill.jpg' },
  { key: 'market' as const,    caption: 'Settling a supplier the same afternoon', photo: '/images/people/market-trader.jpg' },
  { key: 'receiving' as const, caption: 'Money arriving from a brother abroad', photo: '/images/people/receiving.jpg' },
  { key: 'earning' as const,   caption: 'Savings earning, hour by hour', photo: '/images/people/earning.jpg' },
];

export function Humans() {
  return (
    <Section id="people">
      <SectionHead
        eyebrow="Real people, real money"
        title={<>Built for the person, <span className="text-terracotta italic">not the chart</span></>}
        body="Most crypto products are designed for someone staring at candles. Kobocent is designed for someone paying a bill, sending money home, or trying to make savings do something useful."
      />
      <div className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-4">
        {MOMENTS.map((m, i) => {
          const Scene = SCENES[m.key];
          return (
            <Reveal key={m.key} delay={i * 70}>
              <figure className="group relative overflow-hidden rounded-2xl surface aspect-[4/5]">
                <Scene />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={m.photo}
                  alt={m.caption}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                />
                <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/80 to-transparent p-4 pt-12">
                  <span className="text-[12.5px] text-cream leading-snug">{m.caption}</span>
                </figcaption>
              </figure>
            </Reveal>
          );
        })}
      </div>
    </Section>
  );
}
