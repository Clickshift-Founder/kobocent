'use client';
/**
 * Trade — shared pieces (T1, 2026-10-09). Backend: GET /api/v1/trade* (src/services/trading.js — the same
 * balances, prices, cost basis and analysis as Telegram's /portfolio, /analyze and /picks).
 */

export interface Protection { status: 'watching' | 'trailing'; takeProfitPrice: number | null; stopLossPrice: number | null; trailingPct: number | null; peakPrice: number | null }
export interface Position {
  chain: string; mint: string; symbol: string; name: string; amount: number; priceUsd: number | null; valueUsd: number | null; priced: boolean;
  entryPriceUsd: number | null; investedUsd: number | null; pnlUsd: number | null; pnlPct: number | null; realizedUsd: number;
  buys: number; sells: number; firstAt: number | null; protection: Protection | null;
}
export interface ChainOption { id: string; label: string; live: boolean; note?: string }
export interface TradeHome {
  ok: true; chain: string; chains: ChainOption[]; updatedAt: number; solPriceUsd: number | null;
  cash: { sol: { amount: number; usd: number | null }; usdc: { amount: number }; usdt: { amount: number }; totalUsd: number | null };
  positions: Position[];
  closed: Array<{ mint: string; symbol: string; realizedUsd: number | null; buys: number; sells: number; lastAt: number | null }>;
  totals: { tokensValueUsd: number | null; investedUsd: number | null; unrealizedUsd: number | null; unrealizedPct: number | null; realizedUsd: number | null;
            best: { mint: string; symbol: string; pnlPct: number } | null; worst: { mint: string; symbol: string; pnlPct: number } | null; protectedCount: number };
}
export interface Pick { mint: string; symbol: string; name: string; priceUsd: number | null; marketCapUsd: number | null; liquidityUsd: number | null; score: number; signals: string[]; change1h: number | null; change24h: number | null; volume1hUsd: number | null; buyRatioPct: number | null; ageHours: number | null; imageUrl: string | null }
export interface SearchResult { mint: string; symbol: string; name: string; priceUsd: number | null; liquidityUsd?: number | null; marketCapUsd?: number | null; change24h?: number | null; imageUrl?: string | null }

/** Prices from $0.000000012 to $64,000 — significant digits for tiny memecoin prices, subscript-free. */
export function price(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n) || n <= 0) return '—';
  if (n >= 1000) return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  if (n >= 1) return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (n >= 0.01) return `$${n.toFixed(4)}`;
  // Four significant digits after the leading zeros: 0.00002345 → $0.00002345
  const digits = Math.min(18, Math.ceil(-Math.log10(n)) + 3);
  return `$${n.toFixed(digits).replace(/0+$/, '')}`;
}
export function compact(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—';
  const a = Math.abs(n);
  if (a >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (a >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}
export function signedUsd(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—';
  const s = Math.abs(n) >= 1000 ? compact(Math.abs(n)) : `$${Math.abs(n).toFixed(2)}`;
  return `${n > 0 ? '+' : n < 0 ? '−' : ''}${s}`;
}
export function pct(n: number | null | undefined, digits = 1): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toFixed(digits)}%`;
}
export function tokenAmount(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toLocaleString(undefined, { maximumFractionDigits: n < 1 ? 6 : 2 });
}

const UP = '#58834C', DOWN = '#B84A40';
export function PnlPill({ value, size = 'md' }: { value: number | null; size?: 'sm' | 'md' }) {
  if (value == null) return <span className="text-[12px] muted">No entry yet</span>;
  const up = value >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full font-semibold font-mono ${size === 'sm' ? 'px-2 py-0.5 text-[12px]' : 'px-2.5 py-1 text-[13px]'}`}
      style={{ background: (up ? UP : DOWN) + '1F', color: up ? UP : DOWN }}>
      <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden style={{ transform: up ? 'none' : 'rotate(180deg)' }}><path d="M5 1 9 7H1z" fill="currentColor" /></svg>
      {pct(value)}
    </span>
  );
}
export const pnlColor = (v: number | null | undefined) => (v == null ? undefined : v >= 0 ? UP : DOWN);

const PALETTE = ['#C1502E', '#58834C', '#B68B2A', '#6B5D52', '#9A3E22', '#20211F'];
export function TokenAvatar({ symbol, imageUrl, size = 44 }: { symbol: string; imageUrl?: string | null; size?: number }) {
  const bg = PALETTE[symbol.split('').reduce((s, c) => s + c.charCodeAt(0), 0) % PALETTE.length];
  return imageUrl
    // eslint-disable-next-line @next/next/no-img-element
    ? <img src={imageUrl} alt="" width={size} height={size} className="shrink-0 rounded-full bg-cream-warm dark:bg-night object-cover" style={{ width: size, height: size }} loading="lazy" />
    : <span className="shrink-0 grid place-items-center rounded-full text-white font-bold" style={{ width: size, height: size, background: bg, fontSize: size * 0.3 }}>{symbol.replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase() || '?'}</span>;
}

/** Solana live; the next chain shows as coming soon (chain decision 2026-10-08 — BNB Chain). */
export function ChainSwitch({ chains, value }: { chains: ChainOption[]; value: string }) {
  return (
    <div className="inline-flex rounded-2xl p-1 bg-cream-warm dark:bg-night-card" role="tablist" aria-label="Chain">
      {chains.map(c => (
        <button key={c.id} role="tab" aria-selected={c.id === value} disabled={!c.live}
          className={`min-h-[40px] px-3.5 rounded-xl text-[13.5px] font-semibold transition-colors ${c.id === value ? 'bg-white dark:bg-night text-ink dark:text-cream-warm shadow-sm' : 'muted'} disabled:cursor-not-allowed`}>
          {c.label}{!c.live && <span className="ml-1.5 rounded-full bg-terracotta-soft text-terracotta text-[10.5px] px-1.5 py-0.5 align-middle">Soon</span>}
        </button>
      ))}
    </div>
  );
}

/** A 0–100 score as a half-ring gauge. */
export function ScoreGauge({ score, label }: { score: number | null; label?: string }) {
  const s = Math.max(0, Math.min(100, Number(score) || 0));
  const color = s >= 65 ? UP : s >= 45 ? '#B68B2A' : DOWN;
  const r = 34, c = Math.PI * r;
  return (
    <div className="relative w-[92px] h-[56px]" aria-label={`Score ${s} of 100`}>
      <svg viewBox="0 0 84 48" className="w-full h-full">
        <path d="M8 44a34 34 0 0 1 68 0" fill="none" stroke="currentColor" strokeOpacity="0.12" strokeWidth="8" strokeLinecap="round" />
        <path d="M8 44a34 34 0 0 1 68 0" fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${(s / 100) * c} ${c}`} />
      </svg>
      <div className="absolute inset-x-0 bottom-0 text-center leading-none">
        <div className="font-display font-bold text-[22px]" style={{ color }}>{score == null ? '—' : s}</div>
        {label && <div className="text-[10px] muted mt-0.5">{label}</div>}
      </div>
    </div>
  );
}
