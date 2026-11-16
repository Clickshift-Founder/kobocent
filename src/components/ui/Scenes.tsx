/**
 * Illustrated scenes in brand colours for "Real people, real money" (redrawn 2026-11-18: fuller scenes that tell each
 * caption's story).
 *
 * Why illustration rather than a photo placeholder: a missing image reads as broken, and an obviously AI-generated face
 * reads as fake, which is corrosive in a product handling people's money. These look deliberate, stay crisp at any size,
 * and work in light and dark mode (each scene paints its own background).
 *
 * To swap in a real photograph later, drop the file at the `photo` path in Humans.tsx and it renders on top automatically.
 */

const T = '#C1502E';   // terracotta
const TD = '#9A3E22';  // terracotta dark
const TL = '#E8895F';  // terracotta light
const INK = '#20211F';
const CREAM = '#F7F3EE';
const WARM = '#F0E6D8';
const SAND = '#E4D8C6';
const OK = '#58834C';
const GOLD = '#E3B25A';
const FONT = 'Inter, system-ui, sans-serif';

function Frame({ bg, children }: { bg: string; children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 320 400" className="absolute inset-0 h-full w-full" role="img" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
      <rect width="320" height="400" fill={bg} />
      {children}
    </svg>
  );
}

/** A simple figure: head and body. No face, on purpose. */
function Person({ x, y, s = 1, body = T, skin = '#7A4A32' }: { x: number; y: number; s?: number; body?: string; skin?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <circle cx="0" cy="-74" r="19" fill={skin} />
      <path d="M-30 0c0-34 12-52 30-52s30 18 30 52v70h-60z" fill={body} />
      <path d="M-12 -56q12 10 24 0" stroke={skin} strokeWidth="9" strokeLinecap="round" fill="none" />
    </g>
  );
}

/** Small rounded label, like an app toast. */
function Chip({ x, y, w, text, tone = OK }: { x: number; y: number; w: number; text: string; tone?: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect width={w} height="34" rx="17" fill="#fff" />
      <circle cx="17" cy="17" r="9" fill={tone} />
      <path d="M12.5 17.5l3 3 5.5-6" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <text x="34" y="22" fontSize="13" fontWeight="700" fill={INK} fontFamily={FONT}>{text}</text>
    </g>
  );
}

/** Paying a light bill from the balcony: dusk, the flat's lights are on, the payment lands on the phone. */
export function ScenePayingBill() {
  return (
    <Frame bg="#2B2420">
      <rect width="320" height="250" fill="#3A2E28" />
      <circle cx="252" cy="70" r="30" fill={GOLD} opacity="0.9" />
      <circle cx="252" cy="70" r="52" fill={GOLD} opacity="0.12" />
      {/* neighbouring blocks, some windows lit */}
      <rect x="0" y="120" width="92" height="170" fill="#4A3B33" />
      <rect x="214" y="150" width="106" height="140" fill="#4A3B33" />
      {[[14, 140], [52, 140], [14, 182], [52, 182], [14, 224], [230, 170], [272, 170], [230, 212], [272, 212]].map(([x, y], i) => (
        <rect key={i} x={x} y={y} width="24" height="28" rx="3" fill={i % 3 === 1 ? '#5A4A40' : GOLD} opacity={i % 3 === 1 ? 1 : 0.85} />
      ))}
      {/* our flat: warm doorway glow */}
      <rect x="104" y="96" width="112" height="200" fill="#5A4A40" />
      <rect x="122" y="120" width="76" height="150" rx="4" fill="#EBC37A" />
      <path d="M160 96v16" stroke={SAND} strokeWidth="2" />
      <circle cx="160" cy="124" r="24" fill="#FFF3C9" opacity="0.35" />
      <circle cx="160" cy="124" r="11" fill="#FFF3C9" />
      {/* balcony floor and railing */}
      <rect x="0" y="290" width="320" height="110" fill="#2B2420" />
      <rect x="0" y="286" width="320" height="8" fill={TD} />
      {Array.from({ length: 11 }).map((_, i) => <rect key={i} x={10 + i * 30} y="294" width="5" height="70" fill={TD} />)}
      <rect x="0" y="360" width="320" height="8" fill={TD} />
      {/* person with phone */}
      <Person x={118} y={292} s={1.05} body={T} />
      <circle cx="155" cy="239" r="46" fill={TL} opacity="0.12" />
      <rect x="140" y="214" width="30" height="50" rx="6" fill={INK} transform="rotate(-10 155 239)" />
      <rect x="143" y="219" width="24" height="36" rx="3" fill={TL} transform="rotate(-10 155 239)" />
      <Chip x={170} y={196} w={132} text="Light bill paid" />
    </Frame>
  );
}

/** Settling a supplier the same afternoon: a market stall, goods delivered, payment sent on the spot. */
export function SceneMarket() {
  return (
    <Frame bg={WARM}>
      <rect width="320" height="150" fill="#F6D9B8" />
      <circle cx="58" cy="52" r="26" fill={GOLD} opacity="0.75" />
      {/* striped canopy */}
      <path d="M20 96h280l-18 56H38z" fill={T} />
      {[0, 1, 2, 3, 4, 5].map((i) => <path key={i} d={`M${44 + i * 46} 96h23l-3 56h-23z`} fill={CREAM} opacity="0.9" />)}
      <rect x="40" y="152" width="6" height="150" fill={TD} />
      <rect x="274" y="152" width="6" height="150" fill={TD} />
      {/* trader behind the counter */}
      <Person x={110} y={246} s={0.92} body={OK} />
      {/* counter with produce */}
      <rect x="30" y="252" width="260" height="60" rx="6" fill="#B9784F" />
      <rect x="30" y="252" width="260" height="10" rx="5" fill="#9A5E3A" />
      {[[52, 240, '#D9483B'], [74, 236, '#E08A2E'], [63, 222, '#D9483B'], [176, 238, '#6E9A4B'], [200, 236, '#E3B25A'], [224, 239, '#6E9A4B'], [188, 220, '#E3B25A'], [212, 220, '#6E9A4B']].map(([x, y, c], i) => (
        <circle key={i} cx={x as number} cy={y as number} r="12" fill={c as string} />
      ))}
      {/* crates just delivered */}
      <rect x="24" y="330" width="62" height="46" rx="4" fill="#C99468" /><path d="M24 346h62M24 361h62M44 330v46M66 330v46" stroke="#9A5E3A" strokeWidth="2" />
      <rect x="92" y="344" width="52" height="32" rx="4" fill="#C99468" /><path d="M92 360h52M110 344v32M128 344v32" stroke="#9A5E3A" strokeWidth="2" />
      {/* supplier in front, phone in hand */}
      <Person x={236} y={352} s={1} body={INK} skin="#5E3A28" />
      <rect x="186" y="286" width="26" height="44" rx="5" fill={INK} stroke={CREAM} strokeWidth="1.5" />
      <rect x="189" y="291" width="20" height="30" rx="3" fill={TL} />
      <Chip x={152} y={166} w={138} text="Supplier paid" />
    </Frame>
  );
}

/** Money arriving from a brother abroad: a dotted path across the globe, landing on the phone at home. */
export function SceneReceiving() {
  return (
    <Frame bg="#F3E7DA">
      {/* globe */}
      <circle cx="160" cy="150" r="118" fill={WARM} />
      <circle cx="160" cy="150" r="118" fill="none" stroke={SAND} strokeWidth="2" />
      <ellipse cx="160" cy="150" rx="118" ry="44" fill="none" stroke={SAND} strokeWidth="2" />
      <ellipse cx="160" cy="150" rx="52" ry="118" fill="none" stroke={SAND} strokeWidth="2" />
      <path d="M42 150h236" stroke={SAND} strokeWidth="2" />
      {/* far city (sender) */}
      <g transform="translate(232 70)">
        <rect x="-16" y="-4" width="10" height="26" fill={INK} opacity="0.75" /><rect x="-4" y="-18" width="12" height="40" fill={INK} opacity="0.75" /><rect x="10" y="-8" width="10" height="30" fill={INK} opacity="0.75" />
        <circle cx="2" cy="34" r="6" fill={T} />
      </g>
      {/* home pin (receiver) */}
      <g transform="translate(96 196)"><path d="M0 0c-14-18-18-26-18-34a18 18 0 0 1 36 0c0 8-4 16-18 34z" fill={T} /><circle cx="0" cy="-34" r="7" fill={CREAM} /></g>
      {/* path of the money */}
      <path d="M234 104C210 20 120 30 98 150" fill="none" stroke={T} strokeWidth="3.5" strokeDasharray="2 9" strokeLinecap="round" />
      {[[216, 58], [168, 42], [122, 76]].map(([x, y], i) => (
        <g key={i}><circle cx={x} cy={y} r="11" fill={GOLD} /><text x={x} y={y + 4.5} textAnchor="middle" fontSize="12" fontWeight="700" fill={INK} fontFamily={FONT}>$</text></g>
      ))}
      {/* person at home, phone lit */}
      <rect x="0" y="330" width="320" height="70" fill={WARM} />
      <Person x={232} y={330} s={1.12} body={T} />
      <rect x="182" y="262" width="30" height="50" rx="6" fill={INK} transform="rotate(-8 197 287)" />
      <rect x="185" y="267" width="24" height="36" rx="3" fill={TL} transform="rotate(-8 197 287)" />
      {/* notification */}
      <g transform="translate(16 290)">
        <rect width="158" height="46" rx="14" fill="#fff" />
        <rect x="10" y="11" width="24" height="24" rx="7" fill={T} />
        <path d="M22 17v12M17 24l5 5 5-5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <text x="44" y="21" fontSize="12" fontWeight="700" fill={INK} fontFamily={FONT}>Money in</text>
        <text x="44" y="35" fontSize="11.5" fill="#6B5D52" fontFamily={FONT}>$200.00 arrived</text>
      </g>
    </Frame>
  );
}

/** Savings earning, hour by hour: a clock, bars that rise each hour, and a jar that fills. */
export function SceneEarning() {
  const bars = [14, 22, 30, 40, 50, 62, 76, 92];
  return (
    <Frame bg="#EEF1E6">
      <circle cx="262" cy="64" r="92" fill={OK} opacity="0.1" />
      {/* clock */}
      <g transform="translate(250 84)">
        <circle r="44" fill="#fff" /><circle r="44" fill="none" stroke={OK} strokeWidth="4" />
        {Array.from({ length: 12 }).map((_, i) => <rect key={i} x="-1.5" y="-38" width="3" height={i % 3 === 0 ? 9 : 5} fill={INK} opacity="0.55" transform={`rotate(${i * 30})`} />)}
        <path d="M0 0V-26" stroke={INK} strokeWidth="4" strokeLinecap="round" /><path d="M0 0l18 10" stroke={T} strokeWidth="4" strokeLinecap="round" /><circle r="4" fill={INK} />
      </g>
      <text x="250" y="150" textAnchor="middle" fontSize="11" fontWeight="700" fill={OK} fontFamily={FONT}>every hour</text>
      {/* hourly bars rising */}
      {bars.map((h, i) => <rect key={i} x={26 + i * 22} y={212 - h} width="14" height={h} rx="4" fill={OK} opacity={0.35 + i * 0.08} />)}
      <rect x="18" y="212" width="184" height="3" rx="1.5" fill={INK} opacity="0.2" />
      {/* jar of coins */}
      <g transform="translate(238 352)">
        <rect x="-62" y="-120" width="124" height="120" rx="20" fill="#fff" opacity="0.85" />
        <rect x="-62" y="-120" width="124" height="120" rx="20" fill="none" stroke={SAND} strokeWidth="3" />
        {[[-30, -18], [0, -18], [30, -18], [-15, -34], [15, -34], [-30, -50], [0, -50], [30, -50], [-15, -66], [15, -66]].map(([x, y], i) => (
          <g key={i}><ellipse cx={x} cy={y} rx="17" ry="8" fill={GOLD} /><ellipse cx={x} cy={y - 3} rx="17" ry="8" fill="#F2C873" /></g>
        ))}
        <rect x="-46" y="-136" width="92" height="20" rx="8" fill={TD} />
        {/* sprout from the lid */}
        <path d="M0 -136v-26" stroke={OK} strokeWidth="4" strokeLinecap="round" />
        <path d="M0 -150c-18 0-26-10-26-22 16 0 26 8 26 22zM0 -158c16 0 24-10 24-22-16 0-24 8-24 22z" fill={OK} />
      </g>
      <Chip x={22} y={22} w={150} text="Earnings added" />
    </Frame>
  );
}

export const SCENES = {
  bill: ScenePayingBill,
  market: SceneMarket,
  receiving: SceneReceiving,
  earning: SceneEarning,
} as const;
