'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { kc, KcError, timeLabel } from '@/lib/kc';
import { PageHeader } from '@/components/app/PageHeader';
import { Skeleton, EmptyState } from '@/components/app/ui';
import { IconClose } from '@/components/app/Icons';
import { useLiveRefresh } from '@/lib/useLiveRefresh';
import { price, compact, signedUsd, pct, tokenAmount, PnlPill, pnlColor, TokenAvatar, ChainSwitch, rememberChain, readCache, writeCache, type ChainOption } from '@/components/app/trade';

/**
 * Trade on BNB Chain (2026-10-11). Backend /trade/bnb* (src/services/bnbTrading.js): your BEP-20 tokens traded through Kobocent with
 * live value and P&L, cash to trade with (USDT, USDC, BNB), search, and what's trending on BNB Chain (contract-checked).
 */

interface Pos { mint: string; address: string; symbol: string; name: string; amount: number; priceUsd: number | null; priced: boolean; valueUsd: number | null; pnlUsd: number | null; pnlPct: number | null; imageUrl?: string | null }
interface Home {
  ok: true; chain: 'BNB'; chains: ChainOption[]; address: string; updatedAt: number; note: string;
  positions: Pos[]; closed: Array<{ address: string; symbol: string; realizedUsd: number | null; buys: number; sells: number }>;
  cash: { usdt: number | null; usdc: number | null; bnb: number; bnbUsd: number | null; totalUsd: number | null };
  totals: { tokensValueUsd: number | null; unrealizedUsd: number | null; unrealizedPct: number | null; realizedUsd: number | null; best: { symbol: string; pnlPct: number } | null };
}
interface Trend { address: string; symbol: string; name: string; priceUsd: number | null; marketCapUsd: number | null; liquidityUsd: number | null; change24h: number | null; imageUrl: string | null; security: 'caution' | 'clear' | null; warnings: string[] }
interface Result { address: string; symbol: string; name: string; priceUsd: number | null; liquidityUsd?: number | null; change24h?: number | null; imageUrl?: string | null }
type Tab = 'holdings' | 'trending' | 'closed';

export default function BnbTradePage() {
  const router = useRouter();
  const [data, setData] = useState<Home | null>(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('holdings');
  const [trend, setTrend] = useState<Trend[] | null>(null);
  const load = useCallback(() => kc<Home>('trade/bnb').then(d => { setData(d); setError(''); writeCache('bnb-home', d); })
    .catch(e => setError(e instanceof KcError && e.status === 409 ? 'Your account has no 0x wallet yet — open Receive to create it.' : e instanceof Error ? e.message : 'Could not load BNB Chain')), []);
  useEffect(() => {
    rememberChain('BNB');
    const c = readCache<Home>('bnb-home'); if (c) setData(c);
    load();
    kc<{ picks: Trend[] }>('trade/bnb/trending').then(r => setTrend(r.picks)).catch(() => setTrend([]));
  }, [load]);
  useLiveRefresh(load, 30_000);
  const t = data?.totals;

  return (
    <div className="space-y-5">
      <PageHeader title="Trade" subtitle="BNB Chain — every token you trade, how it’s doing, and what’s trending." fallback="/app" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ChainSwitch chains={data?.chains || [{ id: 'SOLANA', label: 'Solana', live: true }, { id: 'BNB', label: 'BNB Chain', live: true }]} value="BNB" />
        {data?.updatedAt && <span className="text-[12px] muted">Live · {timeLabel(data.updatedAt)}</span>}
      </div>

      <BnbSearch onOpen={(a) => router.push(`/app/trade/bnb/${a}`)} />

      {error ? <div className="surface rounded-2xl p-5 text-[15px]">{error} <button onClick={() => load()} className="underline font-semibold">Retry</button></div>
        : !data ? <Skeleton className="h-44" /> : (
          <section className="rounded-3xl p-5 sm:p-6 text-white bg-ink dark:bg-night-card relative overflow-hidden animate-fade-up">
            <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#D9A400]/30 blur-3xl" aria-hidden />
            <div className="relative">
              <div className="text-[13px] text-white/70">Your BNB Chain tokens</div>
              <div className="font-display font-bold text-[40px] leading-tight mt-1">{compact(t?.tokensValueUsd ?? 0)}</div>
              <div className="mt-1 text-[14px]">
                <span className="font-semibold" style={{ color: t?.unrealizedUsd == null ? undefined : t.unrealizedUsd >= 0 ? '#9BD08A' : '#F0A097' }}>{signedUsd(t?.unrealizedUsd)} {t?.unrealizedPct != null && `(${pct(t.unrealizedPct)})`} open</span>
                <span className="text-white/70"> · {signedUsd(t?.realizedUsd)} realised</span>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2">
                {[['USDT', data.cash.usdt != null ? `$${data.cash.usdt.toFixed(2)}` : '—'], ['USDC', data.cash.usdc != null ? `$${data.cash.usdc.toFixed(2)}` : '—'], ['BNB', `${data.cash.bnb.toFixed(4)}`]].map(([k, v]) => (
                  <div key={k} className="rounded-2xl bg-white/10 px-3 py-2.5 min-w-0"><div className="text-[11.5px] text-white/65">{k}</div><div className="font-semibold text-[14.5px] truncate">{v}</div></div>
                ))}
              </div>
              <p className="text-[12px] text-white/60 mt-3">Pay with USDT or USDC and you need no BNB — Kobocent covers the network fee. Add funds to your 0x address from Receive.</p>
            </div>
          </section>
        )}

      <div className="grid grid-cols-3 gap-1 p-1 rounded-2xl bg-cream-warm dark:bg-night-card" role="tablist">
        {([['holdings', `Holdings${data ? ` · ${data.positions.length}` : ''}`], ['trending', 'Trending'], ['closed', 'Closed']] as Array<[Tab, string]>).map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`min-h-[44px] rounded-xl text-[14px] font-semibold ${tab === k ? 'bg-white dark:bg-night text-ink dark:text-cream-warm shadow-sm' : 'muted'}`}>{l}</button>
        ))}
      </div>

      {tab === 'holdings' && (!data ? <Skeleton className="h-20" /> : data.positions.length === 0 ? (
        <EmptyState title="No BNB Chain tokens yet" body="Search any token above, or open Trending to see what’s moving on BNB Chain." action={<button onClick={() => setTab('trending')} className="btn-primary">See Trending</button>} />
      ) : (
        <ul className="space-y-2.5">
          {data.positions.map(p => (
            <li key={p.address}>
              <Link href={`/app/trade/bnb/${p.address}`} className="surface rounded-2xl p-3.5 flex items-center gap-3 min-h-[72px] hover:border-terracotta transition-colors">
                <TokenAvatar symbol={p.symbol} imageUrl={p.imageUrl} />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-[15.5px] text-ink dark:text-cream-warm truncate">{p.symbol}</div>
                  <div className="text-[12.5px] muted font-mono truncate">{tokenAmount(p.amount)} · {price(p.priceUsd)}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-mono font-semibold text-[15px] text-ink dark:text-cream-warm">{p.priced ? compact(p.valueUsd) : 'No price'}</div>
                  <div className="mt-0.5 flex items-center justify-end gap-1.5">
                    {p.pnlUsd != null && <span className="text-[12px] font-mono" style={{ color: pnlColor(p.pnlUsd) }}>{signedUsd(p.pnlUsd)}</span>}
                    <PnlPill value={p.pnlPct} size="sm" />
                  </div>
                </div>
              </Link>
            </li>
          ))}
          {data.note && <p className="text-[12px] muted px-1">{data.note}</p>}
        </ul>
      ))}

      {tab === 'trending' && (!trend ? <div className="space-y-2"><Skeleton className="h-20" /><Skeleton className="h-20" /></div> : trend.length === 0 ? (
        <EmptyState title="Nothing passes our checks right now" body="Trending only shows tokens with real liquidity and no danger flags in their contract. Check back soon." />
      ) : (
        <div className="space-y-2.5">
          {trend.map((p, i) => (
            <Link key={p.address} href={`/app/trade/bnb/${p.address}`} className="surface rounded-2xl p-4 flex items-center gap-3 hover:border-terracotta transition-colors">
              <span className="w-5 text-center text-[13px] font-bold muted">{i + 1}</span>
              <TokenAvatar symbol={p.symbol} imageUrl={p.imageUrl} size={40} />
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-[15px] text-ink dark:text-cream-warm truncate">{p.symbol} <span className="font-normal muted text-[13px]">{p.name}</span></div>
                <div className="text-[12.5px] muted font-mono truncate">{price(p.priceUsd)} · MC {compact(p.marketCapUsd)} · Liq {compact(p.liquidityUsd)}</div>
                {p.warnings.length > 0 && <div className="text-[11.5px] mt-0.5" style={{ color: '#B68B2A' }}>{p.warnings.join(' · ')}</div>}
              </div>
              {p.change24h != null && <span className="text-[13px] font-mono shrink-0" style={{ color: pnlColor(p.change24h) }}>{pct(p.change24h)}</span>}
            </Link>
          ))}
          <p className="text-[12px] muted">Trending on BNB Chain right now, with at least $50k liquidity. Every contract is checked for honeypots, heavy taxes and owner powers — tokens with danger flags are left out. Never a guarantee.</p>
        </div>
      ))}

      {tab === 'closed' && (!data ? <Skeleton className="h-20" /> : data.closed.length === 0 ? <EmptyState title="No closed trades yet" body="Tokens you’ve fully sold on BNB Chain show here with what you made or lost." /> : (
        <ul className="surface rounded-2xl divide-y divide-cream-border dark:divide-night-border px-4">
          {data.closed.map(c => (
            <li key={c.address}><Link href={`/app/trade/bnb/${c.address}`} className="flex items-center gap-3 py-3.5 min-h-[60px]">
              <TokenAvatar symbol={c.symbol} size={36} />
              <div className="min-w-0 flex-1"><div className="font-medium text-[15px] text-ink dark:text-cream-warm">{c.symbol}</div><div className="text-[12.5px] muted">{c.buys} buy{c.buys === 1 ? '' : 's'} · {c.sells} sell{c.sells === 1 ? '' : 's'}</div></div>
              <span className="font-mono font-semibold text-[15px]" style={{ color: pnlColor(c.realizedUsd) }}>{signedUsd(c.realizedUsd)}</span>
            </Link></li>
          ))}
        </ul>
      ))}
    </div>
  );
}

function BnbSearch({ onOpen }: { onOpen: (address: string) => void }) {
  const [q, setQ] = useState('');
  const [res, setRes] = useState<Result[] | null>(null);
  const [busy, setBusy] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const s = q.trim();
    if (s.length < 2) { setRes(null); return; }
    if (/^0x[0-9a-fA-F]{40}$/.test(s)) { onOpen(s); return; }
    let live = true; setBusy(true);
    const t = setTimeout(() => {
      kc<{ results: Result[] }>(`trade/bnb/search?q=${encodeURIComponent(s)}`).then(r => { if (live) setRes(r.results); }).catch(() => { if (live) setRes([]); }).finally(() => { if (live) setBusy(false); });
    }, 350);
    return () => { live = false; clearTimeout(t); };
  }, [q, onOpen]);
  useEffect(() => {
    const close = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setRes(null); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);
  return (
    <div ref={box} className="relative">
      <div className="surface rounded-2xl flex items-center gap-2 px-4 min-h-[52px] focus-within:border-terracotta">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="muted shrink-0" aria-hidden><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search a BNB Chain token, or paste 0x…" aria-label="Search BNB Chain tokens"
          className="flex-1 min-w-0 bg-transparent outline-none text-[16px] text-ink dark:text-cream-warm py-3" autoComplete="off" spellCheck={false} />
        {busy ? <span className="h-4 w-4 rounded-full border-2 border-terracotta border-t-transparent animate-spin" aria-label="Searching" />
          : q && <button onClick={() => { setQ(''); setRes(null); }} aria-label="Clear" className="grid place-items-center h-9 w-9 -mr-2 muted"><IconClose size={16} /></button>}
      </div>
      {res && (
        <div className="absolute z-20 inset-x-0 mt-2 surface rounded-2xl shadow-card overflow-hidden max-h-[60vh] overflow-y-auto">
          {res.length === 0 ? <p className="p-4 text-[14px] muted">No BNB Chain token found for “{q.trim()}”. Paste its 0x address instead.</p>
            : res.map(r => (
              <button key={r.address} onClick={() => onOpen(r.address)} className="w-full flex items-center gap-3 px-4 py-3 min-h-[60px] text-left hover:bg-cream-warm dark:hover:bg-night">
                <TokenAvatar symbol={r.symbol} imageUrl={r.imageUrl} size={36} />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-[15px] text-ink dark:text-cream-warm truncate">{r.symbol} <span className="font-normal muted text-[13px]">{r.name}</span></div>
                  <div className="text-[12.5px] muted font-mono">{price(r.priceUsd)}{r.liquidityUsd ? ` · Liq ${compact(r.liquidityUsd)}` : ''}</div>
                </div>
                {r.change24h != null && <span className="text-[12.5px] font-mono" style={{ color: pnlColor(r.change24h) }}>{pct(r.change24h)}</span>}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
