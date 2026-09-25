'use client';

/**
 * Two scrolling belts: the chains we settle across, and the countries people
 * are already using Kobocent from. Motion here is doing real work — it shows
 * breadth without a wall of static logos.
 */
const CHAINS = [
  { name: 'Ethereum', dot: '#627EEA' },
  { name: 'BNB Chain', dot: '#F0B90B' },
  { name: 'Polygon', dot: '#8247E5' },
  { name: 'Arbitrum', dot: '#28A0F0' },
  { name: 'Robinhood Chain', dot: '#C1502E' },
  { name: 'Solana', dot: '#14F195' },
];

const COUNTRIES = [
  { flag: '🇳🇬', name: 'Nigeria' },
  { flag: '🇺🇸', name: 'United States' },
  { flag: '🇬🇧', name: 'United Kingdom' },
  { flag: '🇯🇵', name: 'Japan' },
  { flag: '🇨🇳', name: 'China' },
  { flag: '🇰🇪', name: 'Kenya' },
  { flag: '🇬🇭', name: 'Ghana' },
  { flag: '🇿🇦', name: 'South Africa' },
  { flag: '🇮🇳', name: 'India' },
  { flag: '🇨🇦', name: 'Canada' },
  { flag: '🇩🇪', name: 'Germany' },
  { flag: '🇦🇪', name: 'UAE' },
];

function Belt({
  children, reverse = false, duration = 40,
}: { children: React.ReactNode; reverse?: boolean; duration?: number }) {
  return (
    <div
      className="overflow-hidden"
      style={{ maskImage: 'linear-gradient(90deg,transparent,black 6%,black 94%,transparent)', WebkitMaskImage: 'linear-gradient(90deg,transparent,black 6%,black 94%,transparent)' }}
    >
      <div
        className="flex w-max gap-3 animate-marquee hover:[animation-play-state:paused]"
        style={{ animationDuration: `${duration}s`, animationDirection: reverse ? 'reverse' : 'normal' }}
      >
        {children}
      </div>
    </div>
  );
}

export function Reach() {
  const chains = [...CHAINS, ...CHAINS, ...CHAINS];
  const countries = [...COUNTRIES, ...COUNTRIES];

  return (
    <section id="reach" className="py-16 sm:py-20 space-y-8">
      <div className="container-page text-center">
        <div className="eyebrow mb-3">Settles across · used from</div>
        <h2 className="h-display text-[clamp(24px,3.2vw,34px)]">
          Six chains. <span className="text-terracotta italic">Fifty countries.</span>
        </h2>
      </div>

      <Belt duration={38}>
        {chains.map((c, i) => (
          <span key={i} className="inline-flex items-center gap-2.5 rounded-full surface px-5 py-3 text-[14px] font-medium whitespace-nowrap">
            <span className="h-2 w-2 rounded-full shrink-0" style={{ background: c.dot }} />
            {c.name}
          </span>
        ))}
      </Belt>

      <Belt reverse duration={52}>
        {countries.map((c, i) => (
          <span key={i} className="inline-flex items-center gap-2.5 rounded-full border border-cream-border dark:border-night-border px-5 py-3 text-[14px] whitespace-nowrap">
            <span className="text-[17px]">{c.flag}</span>
            <span className="muted">{c.name}</span>
          </span>
        ))}
        <span className="inline-flex items-center rounded-full bg-terracotta px-5 py-3 text-[14px] font-semibold text-white whitespace-nowrap">
          + 43 more
        </span>
      </Belt>
    </section>
  );
}
