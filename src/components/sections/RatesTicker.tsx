'use client';

/**
 * Corridor rates, not coin prices.
 * A crypto price ticker signals "trading bot"; this signals "money moves here".
 * Values are indicative and clearly labelled as such — swap `RATES` for a live
 * feed when the FX endpoint is ready.
 */
const RATES = [
  { pair: 'USD → NGN', rate: '₦1,648', live: true },
  { pair: 'GBP → NGN', rate: '₦2,090', live: true },
  { pair: 'USDC → NGN', rate: '₦1,648', live: true },
  { pair: 'NGN → USDC', rate: '$1 / ₦1,652', live: true },
  { pair: 'USD → KES', rate: 'KSh 129', live: false },
  { pair: 'USD → GHS', rate: '₵ 15.2', live: false },
  { pair: 'USD → JPY', rate: '¥ 156', live: false },
  { pair: 'USD → CNY', rate: '¥ 7.24', live: false },
];

export function RatesTicker() {
  const loop = [...RATES, ...RATES];
  return (
    <div className="border-y border-cream-border dark:border-night-border bg-cream-warm/40 dark:bg-night-card/30 py-3 overflow-hidden">
      <div className="flex items-center gap-3 container-page mb-2">
        <span className="h-1.5 w-1.5 rounded-full bg-terracotta animate-pulse" />
        <span className="eyebrow">Corridor rates · indicative</span>
      </div>
      <div
        className="overflow-hidden"
        style={{ maskImage: 'linear-gradient(90deg,transparent,black 5%,black 95%,transparent)', WebkitMaskImage: 'linear-gradient(90deg,transparent,black 5%,black 95%,transparent)' }}
      >
        <div className="flex w-max animate-marquee [animation-duration:45s] hover:[animation-play-state:paused]">
          {loop.map((r, i) => (
            <div key={i} className="flex items-center gap-2.5 px-7 border-r border-cream-border dark:border-night-border whitespace-nowrap">
              <span className="font-mono text-[12px] text-ink dark:text-cream-warm">{r.pair}</span>
              <span className="font-mono text-[12px] text-terracotta font-semibold">{r.rate}</span>
              {!r.live && (
                <span className="font-mono text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded-full border border-cream-border dark:border-night-border muted">
                  soon
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
