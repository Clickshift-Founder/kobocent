/**
 * Country flags drawn as inline SVG (2026-10-24). Emoji flags show as two letters ("NG", "US") on Windows and in some
 * Android browsers, so the landing page draws its own. Simplified but faithful to each flag's colours and layout.
 * Usage: <Flag code="NG" /> — or <FlagOrEmoji value="NG" /> where data mixes country codes with plain emoji (🪙 🏦).
 */
import type { ReactNode } from 'react';

const NAMES: Record<string, string> = {
  NG: 'Nigeria', US: 'United States', GB: 'United Kingdom', JP: 'Japan', CN: 'China', KE: 'Kenya', GH: 'Ghana',
  ZA: 'South Africa', IN: 'India', CA: 'Canada', DE: 'Germany', AE: 'United Arab Emirates',
};

/** Five-pointed star centred on (cx, cy), outer radius r, one point straight up (or rotated by `rot` degrees). */
function star(cx: number, cy: number, r: number, rot = 0) {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const rad = (i % 2 ? r * 0.382 : r);
    const a = ((-90 + rot + i * 36) * Math.PI) / 180;
    pts.push(`${(cx + rad * Math.cos(a)).toFixed(3)},${(cy + rad * Math.sin(a)).toFixed(3)}`);
  }
  return pts.join(' ');
}

const ART: Record<string, { vb: string; body: ReactNode }> = {
  NG: { vb: '0 0 3 2', body: <><rect width="3" height="2" fill="#fff" /><rect width="1" height="2" fill="#008751" /><rect x="2" width="1" height="2" fill="#008751" /></> },
  DE: { vb: '0 0 5 3', body: <><rect width="5" height="1" fill="#000" /><rect y="1" width="5" height="1" fill="#DD0000" /><rect y="2" width="5" height="1" fill="#FFCE00" /></> },
  JP: { vb: '0 0 3 2', body: <><rect width="3" height="2" fill="#fff" /><circle cx="1.5" cy="1" r="0.6" fill="#BC002D" /></> },
  GH: { vb: '0 0 3 2', body: <><rect width="3" height="0.667" fill="#CE1126" /><rect y="0.667" width="3" height="0.667" fill="#FCD116" /><rect y="1.333" width="3" height="0.667" fill="#006B3F" /><polygon points={star(1.5, 1.02, 0.32)} fill="#000" /></> },
  IN: { vb: '0 0 3 2', body: <><rect width="3" height="0.667" fill="#FF9933" /><rect y="0.667" width="3" height="0.667" fill="#fff" /><rect y="1.333" width="3" height="0.667" fill="#138808" /><circle cx="1.5" cy="1" r="0.25" fill="none" stroke="#000080" strokeWidth="0.05" /><circle cx="1.5" cy="1" r="0.05" fill="#000080" /></> },
  AE: { vb: '0 0 12 6', body: <><rect width="12" height="2" fill="#00732F" /><rect y="2" width="12" height="2" fill="#fff" /><rect y="4" width="12" height="2" fill="#000" /><rect width="3" height="6" fill="#FF0000" /></> },
  CN: { vb: '0 0 30 20', body: <><rect width="30" height="20" fill="#DE2910" /><polygon points={star(5, 5, 3)} fill="#FFDE00" /><polygon points={star(10, 2, 1, 23)} fill="#FFDE00" /><polygon points={star(12, 4, 1, 46)} fill="#FFDE00" /><polygon points={star(12, 7, 1, 70)} fill="#FFDE00" /><polygon points={star(10, 9, 1, 21)} fill="#FFDE00" /></> },
  US: {
    vb: '0 0 19 10',
    body: <>
      <rect width="19" height="10" fill="#fff" />
      {Array.from({ length: 7 }, (_, i) => <rect key={i} y={i * (20 / 13)} width="19" height={10 / 13} fill="#B22234" />)}
      <rect width="7.6" height={70 / 13} fill="#3C3B6E" />
      {Array.from({ length: 20 }, (_, i) => <circle key={i} cx={0.76 + (i % 5) * 1.52} cy={0.62 + Math.floor(i / 5) * 1.3} r="0.2" fill="#fff" />)}
    </>,
  },
  GB: {
    vb: '0 0 60 30',
    body: <>
      <rect width="60" height="30" fill="#012169" />
      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" strokeWidth="2" />
      <path d="M30,0 V30 M0,15 H60" stroke="#fff" strokeWidth="10" />
      <path d="M30,0 V30 M0,15 H60" stroke="#C8102E" strokeWidth="6" />
    </>,
  },
  KE: {
    vb: '0 0 30 20',
    body: <>
      <rect width="30" height="6" fill="#000" /><rect y="6" width="30" height="1" fill="#fff" />
      <rect y="7" width="30" height="6" fill="#BB0000" /><rect y="13" width="30" height="1" fill="#fff" />
      <rect y="14" width="30" height="6" fill="#006600" />
      <ellipse cx="15" cy="10" rx="3" ry="6.2" fill="#000" />
      <ellipse cx="15" cy="10" rx="1.7" ry="6.2" fill="#BB0000" />
      <path d="M15,5 V15" stroke="#fff" strokeWidth="0.5" />
    </>,
  },
  ZA: {
    vb: '0 0 90 60',
    body: <>
      <rect width="90" height="30" fill="#E03C31" /><rect y="30" width="90" height="30" fill="#001489" />
      <path d="M0,0 L40,30 L0,60 M40,30 H90" stroke="#fff" strokeWidth="20" fill="none" />
      <path d="M0,0 L40,30 L0,60 M40,30 H90" stroke="#007749" strokeWidth="12" fill="none" />
      <polygon points="0,9 28,30 0,51" fill="#FFB612" />
      <polygon points="0,15 20,30 0,45" fill="#000" />
    </>,
  },
  CA: {
    vb: '0 0 40 20',
    body: <>
      <rect width="40" height="20" fill="#fff" /><rect width="10" height="20" fill="#D52B1E" /><rect x="30" width="10" height="20" fill="#D52B1E" />
      <path d="M20 3 L21.2 5.6 L22.6 5 L22.2 8.4 L24.2 6.6 L24.6 7.8 L26.6 7.4 L25.8 9.8 L26.8 10.4 L23.6 13 L24 14.2 L20.4 13.8 L20.4 17 L19.6 17 L19.6 13.8 L16 14.2 L16.4 13 L13.2 10.4 L14.2 9.8 L13.4 7.4 L15.4 7.8 L15.8 6.6 L17.8 8.4 L17.4 5 L18.8 5.6 Z" fill="#D52B1E" />
    </>,
  },
};

export function Flag({ code, className = 'h-[15px] w-[22px]' }: { code: string; className?: string }) {
  const art = ART[code.toUpperCase()];
  if (!art) return null;
  return (
    <svg viewBox={art.vb} preserveAspectRatio="xMidYMid slice" role="img" aria-label={NAMES[code.toUpperCase()] || code}
      className={`inline-block shrink-0 rounded-[3px] ring-1 ring-black/10 dark:ring-white/15 align-middle ${className}`}>
      {art.body}
    </svg>
  );
}

/** A two-letter country code draws its flag; anything else (an emoji like 🪙 or 🏦) shows as text. */
export function FlagOrEmoji({ value, className, textClass = 'text-[22px]' }: { value: string; className?: string; textClass?: string }) {
  return /^[A-Z]{2}$/.test(value) && ART[value] ? <Flag code={value} className={className} /> : <span className={textClass}>{value}</span>;
}
