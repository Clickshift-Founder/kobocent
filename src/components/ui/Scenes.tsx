/**
 * Illustrated scenes in brand colours.
 *
 * Why illustration rather than a photo placeholder: a missing image reads as
 * broken, and an obviously AI-generated face reads as fake — which is corrosive
 * in a product handling people's money. These look deliberate, stay crisp at any
 * size, and adapt to dark mode.
 *
 * To swap in a real photograph later, add `photo="/images/people/foo.jpg"` on
 * the <Scene> and it renders on top automatically.
 */

const T = '#C1502E';
const TL = '#E8895F';

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 320 400" className="absolute inset-0 h-full w-full" role="img" aria-hidden="true">
      <rect width="320" height="400" className="fill-cream-warm dark:fill-night" />
      {children}
    </svg>
  );
}

export function ScenePayingBill() {
  return (
    <Frame>
      <circle cx="250" cy="70" r="90" fill={T} opacity="0.07" />
      {/* person */}
      <circle cx="140" cy="130" r="34" fill={T} opacity="0.85" />
      <path d="M86 260c0-32 24-58 54-58s54 26 54 58v60H86z" fill={T} opacity="0.85" />
      {/* phone in hand */}
      <rect x="176" y="176" width="62" height="100" rx="10" className="fill-ink dark:fill-cream-warm" />
      <rect x="182" y="186" width="50" height="60" rx="5" fill={TL} opacity="0.5" />
      <circle cx="207" cy="262" r="5" fill={T} />
      {/* bill glyph */}
      <path d="M196 200h22M196 212h22M196 224h14" stroke="#F7F3EE" strokeWidth="3.5" strokeLinecap="round" />
      {/* light bulb = electricity */}
      <circle cx="252" cy="196" r="17" fill={TL} opacity="0.35" />
      <path d="M252 188v10M247 204h10" stroke={T} strokeWidth="3" strokeLinecap="round" />
    </Frame>
  );
}

export function SceneMarket() {
  return (
    <Frame>
      <circle cx="60" cy="330" r="95" fill={T} opacity="0.07" />
      {/* stall canopy */}
      <path d="M40 100h240l-22 42H62z" fill={T} opacity="0.3" />
      <path d="M62 142h196v26H62z" fill={T} opacity="0.16" />
      {/* goods */}
      {[86, 126, 166, 206, 240].map((x, i) => (
        <circle key={x} cx={x} cy={186} r={13 - (i % 2) * 3} fill={TL} opacity="0.55" />
      ))}
      {/* vendor */}
      <circle cx="160" cy="250" r="30" fill={T} opacity="0.85" />
      <path d="M112 360c0-30 22-54 48-54s48 24 48 54v40h-96z" fill={T} opacity="0.85" />
      {/* phone showing payment */}
      <rect x="188" y="286" width="52" height="82" rx="9" className="fill-ink dark:fill-cream-warm" />
      <path d="M200 324l9 9 19-19" stroke={TL} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Frame>
  );
}

export function SceneReceiving() {
  return (
    <Frame>
      <circle cx="80" cy="80" r="80" fill={T} opacity="0.07" />
      <circle cx="160" cy="118" r="36" fill={T} opacity="0.85" />
      <path d="M100 262c0-34 26-60 60-60s60 26 60 60v58h-120z" fill={T} opacity="0.85" />
      {/* incoming notification */}
      <rect x="66" y="298" width="188" height="62" rx="14" className="fill-white dark:fill-night-card" />
      <circle cx="98" cy="329" r="15" fill={T} opacity="0.2" />
      <path d="M98 336v-14M92 328l6-6 6 6" stroke={T} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <rect x="124" y="317" width="86" height="8" rx="4" className="fill-ink/25 dark:fill-cream-warm/25" />
      <rect x="124" y="333" width="56" height="8" rx="4" fill={T} opacity="0.55" />
      {/* arrival arcs */}
      <path d="M232 150a64 64 0 0 1 0 80" stroke={TL} strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.5" />
      <path d="M252 132a92 92 0 0 1 0 116" stroke={TL} strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.28" />
    </Frame>
  );
}

export function SceneEarning() {
  return (
    <Frame>
      <circle cx="250" cy="340" r="92" fill={T} opacity="0.07" />
      {/* laptop */}
      <rect x="62" y="150" width="196" height="128" rx="10" className="fill-ink dark:fill-cream-warm" />
      <rect x="74" y="162" width="172" height="104" rx="5" className="fill-cream dark:fill-night" />
      <path d="M46 278h228l14 26H32z" fill={T} opacity="0.55" />
      {/* rising bars */}
      {[
        [96, 236, 22],
        [126, 220, 38],
        [156, 202, 56],
        [186, 186, 72],
        [216, 176, 82],
      ].map(([x, y, h]) => (
        <rect key={x} x={x} y={y} width="16" height={h} rx="4" fill={T} opacity="0.7" />
      ))}
      <path d="M96 232l30-16 30-18 30-16 30-10" stroke={TL} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* growth leaf */}
      <path d="M160 108c0 18-14 30-14 30s-14-12-14-30 14-26 14-26 14 8 14 26z" fill={TL} opacity="0.75" />
    </Frame>
  );
}

export const SCENES = {
  bill: ScenePayingBill,
  market: SceneMarket,
  receiving: SceneReceiving,
  earning: SceneEarning,
} as const;
