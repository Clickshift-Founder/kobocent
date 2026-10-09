'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { kc, KcError, BOT_URL, timeLabel } from '@/lib/kc';
import { PageHeader } from '@/components/app/PageHeader';
import { Skeleton, EmptyState } from '@/components/app/ui';
import { IconShield, IconChevron, IconClose } from '@/components/app/Icons';
import { useLiveRefresh } from '@/lib/useLiveRefresh';
import {
  type TradeHome, type Pick, type SearchResult, price, compact, signedUsd, pct, tokenAmount,
  PnlPill, pnlColor, TokenAvatar, ChainSwitch,
} from '@/components/app/trade';

/**
 * Trade — T1 (read-only), 2026-10-09. Your tokens and how each is doing, Smart Picks, search any token.
 * Buy / sell (with Ultra), take profit, stop loss and trailing arrive next (ROADMAP T2–T3) on the same engine
 * Telegram uses. Numbers match Telegram's /portfolio exactly (same cost-basis rule).
 */

type Tab = 'holdings' | 'picks' | 'closed';
const TAB_KEY = 'kc-trade-tab';

export default function TradePage() {
  const router = useRouter();
  const [data, setData] = useState<TradeHome | null>(null);
  const [error, setError] = useState('');
  const [needsLink, setNeedsLink] = useState(false);
  const [tab, setTab] = useState<Tab>('holdings');
  const [picks, setPicks] = useState<Pick[] | null>(null);
  const [picksErr, setPicksErr] = useState('');

  const load = useCallback(() => kc<TradeHome>('trade').then(d => { setData(d); setError(''); }).catch(e => {
    if (e instanceof KcError && e.status === 409) setNeedsLink(true); else setError(e instanceof Error ? e.message : 'Could not load your tokens');
  }), []);
  useEffect(() => {
    load();
    try { const t = localStorage.getItem(TAB_KEY) as Tab | null; if (t === 'holdings' || t === 'picks' || t === 'closed') setTab(t); } catch { /* private mode */ }
  }, [load]);
  useLiveRefresh(load, 30_000);

  useEffect(() => {
    if (tab !== 'picks' || picks) return;
    kc<{ picks: Pick[] }>('trade/picks').then(r => setPicks(r.picks)).catch(e => setPicksErr(e instanceof Error ? e.message : 'Smart Picks are resting — try again shortly'));
  }, [tab, picks]);
  const pickTab = (t: Tab) => { setTab(t); try { localStorage.setItem(TAB_KEY, t); } catch { /* private mode */ } };

  if (needsLink) return <div className="space-y-6"><PageHeader title="Trade" /><div className="surface rounded-3xl p-6 text-center"><p className="muted text-[15px] mb-4">Connect your Telegram account to trade from the web app.</p><Link href="/app/settings" className="btn-primary">Open Settings</Link></div></div>;

  const t = data?.totals;
  return (
    <div className="space-y-5">
      <PageHeader title="Trade" subtitle="Every token you hold, how it’s doing, and what’s moving." />

      <div className="flex flex-wrap items-center justify-between gap-3">
        {data ? <ChainSwitch chains={data.chains} value={data.chain} /> : <Skeleton className="h-12 w-56" />}
        {data?.updatedAt && <span className="text-[12px] muted">Live · {timeLabel(data.updatedAt)}</span>}
      </div>

      <TokenSearch onOpen={(m) => router.push(`/app/trade/${m}`)} />

      {/* Portfolio */}
      {error ? (
        <div className="surface rounded-2xl p-5 text-[15px]">{error} <button onClick={() => load()} className="underline font-semibold">Retry</button></div>
      ) : !data ? (
        <Skeleton className="h-44" />
      ) : (
        <section className="rounded-3xl p-5 sm:p-6 text-white bg-ink dark:bg-night-card relative overflow-hidden animate-fade-up">
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-terracotta/30 blur-3xl" aria-hidden />
          <div className="relative">
            <div className="text-[13px] text-white/70">Your tokens</div>
            <div className="font-display font-bold text-[40px] leading-tight mt-1">{compact(t?.tokensValueUsd ?? 0)}</div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px]">
              <span style={{ color: t?.unrealizedUsd == null ? undefined : t.unrealizedUsd >= 0 ? '#9BD08A' : '#F0A097' }} className="font-semibold">
                {signedUsd(t?.unrealizedUsd)} {t?.unrealizedPct != null && `(${pct(t.unrealizedPct)})`} open
              </span>
              <span className="text-white/70">· {signedUsd(t?.realizedUsd)} realised</span>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2">
              {[
                ['Ready to trade', compact(data.cash.totalUsd ?? 0)],
                ['Best', t?.best ? `${t.best.symbol} ${pct(t.best.pnlPct, 0)}` : '—'],
                ['Protected', `${t?.protectedCount ?? 0} of ${data.positions.length}`],
              ].map(([k, v]) => (
                <div key={k} className="rounded-2xl bg-white/10 px-3 py-2.5 min-w-0">
                  <div className="text-[11.5px] text-white/65">{k}</div>
                  <div className="font-semibold text-[14.5px] truncate">{v}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Buy / sell arrive next */}
      <div className="rounded-2xl border border-dashed border-cream-border dark:border-night-border p-4 flex items-start gap-3">
        <span className="grid place-items-center h-10 w-10 shrink-0 rounded-xl bg-terracotta-soft text-terracotta"><IconShield size={20} /></span>
        <div className="min-w-0 flex-1 text-[14px]">
          <div className="font-semibold text-ink dark:text-cream-warm">Buying and selling here is coming next</div>
          <p className="muted mt-0.5 leading-relaxed">Any amount, paid with USDC or SOL, Ultra speed, take profit, stop loss and trailing. Until then, trade the same wallet on Telegram — it shows here instantly.</p>
          <a href={BOT_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-2 font-semibold text-terracotta min-h-[40px]">Trade on Telegram <IconChevron size={14} /></a>
        </div>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-3 gap-1 p-1 rounded-2xl bg-cream-warm dark:bg-night-card" role="tablist">
        {([['holdings', `Holdings${data ? ` · ${data.positions.length}` : ''}`], ['picks', 'Smart Picks'], ['closed', 'Closed']] as Array<[Tab, string]>).map(([k, label]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => pickTab(k)}
            className={`min-h-[44px] rounded-xl text-[14px] font-semibold transition-colors ${tab === k ? 'bg-white dark:bg-night text-ink dark:text-cream-warm shadow-sm' : 'muted'}`}>{label}</button>
        ))}
      </div>

      {tab === 'holdings' && (!data ? <div className="space-y-2"><Skeleton className="h-20" /><Skeleton className="h-20" /></div>
        : data.positions.length === 0 ? (
          <EmptyState title="No tokens yet" body="Search any token above to see its analysis, or open Smart Picks to see what’s moving right now."
            action={<button onClick={() => pickTab('picks')} className="btn-primary">See Smart Picks</button>} />
        ) : (
          <ul className="space-y-2.5">
            {data.positions.map(p => (
              <li key={p.mint}>
                <Link href={`/app/trade/${p.mint}`} className="surface rounded-2xl p-3.5 flex items-center gap-3 min-h-[72px] hover:border-terracotta transition-colors">
                  <TokenAvatar symbol={p.symbol} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-[15.5px] text-ink dark:text-cream-warm truncate">{p.symbol}</span>
                      {p.protection && <IconShield size={14} className="text-terracotta shrink-0" />}
                    </div>
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
          </ul>
        ))}

      {tab === 'picks' && (picksErr ? <div className="surface rounded-2xl p-5 text-[15px]">{picksErr}</div>
        : !picks ? <div className="space-y-2"><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /></div>
        : picks.length === 0 ? <EmptyState title="Nothing stands out right now" body="Smart Picks only shows tokens with strong momentum. Check back soon." />
        : (
          <div className="space-y-2.5">
            {picks.map((p, i) => (
              <Link key={p.mint} href={`/app/trade/${p.mint}`} className="surface rounded-2xl p-4 block hover:border-terracotta transition-colors">
                <div className="flex items-center gap-3">
                  <span className="w-5 text-center text-[13px] font-bold muted">{i + 1}</span>
                  <TokenAvatar symbol={p.symbol} imageUrl={p.imageUrl} size={40} />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-[15px] text-ink dark:text-cream-warm truncate">{p.symbol} <span className="font-normal muted text-[13px]">{p.name}</span></div>
                    <div className="text-[12.5px] muted font-mono">{price(p.priceUsd)} · MC {compact(p.marketCapUsd)} · Liq {compact(p.liquidityUsd)}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-display font-bold text-[20px]" style={{ color: p.score >= 65 ? '#58834C' : p.score >= 45 ? '#B68B2A' : '#B84A40' }}>{p.score}</div>
                    <div className="text-[10.5px] muted -mt-0.5">score</div>
                  </div>
                </div>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {p.change1h != null && <span className="rounded-full px-2 py-0.5 text-[12px] font-mono" style={{ background: (pnlColor(p.change1h) || '#6B5D52') + '1A', color: pnlColor(p.change1h) }}>1h {pct(p.change1h)}</span>}
                  {p.signals.map(s => <span key={s} className="rounded-full bg-cream-warm dark:bg-night px-2 py-0.5 text-[12px] text-ink dark:text-cream-warm">{s}</span>)}
                </div>
              </Link>
            ))}
            <p className="text-[12px] muted">Momentum signals from live market data — never a guarantee. New tokens are very risky; only trade what you can afford to lose.</p>
          </div>
        ))}

      {tab === 'closed' && (!data ? <Skeleton className="h-20" /> : data.closed.length === 0
        ? <EmptyState title="No closed trades yet" body="Tokens you’ve fully sold show here with what you made or lost." />
        : (
          <ul className="surface rounded-2xl divide-y divide-cream-border dark:divide-night-border px-4">
            {data.closed.map(c => (
              <li key={c.mint}>
                <Link href={`/app/trade/${c.mint}`} className="flex items-center gap-3 py-3.5 min-h-[60px]">
                  <TokenAvatar symbol={c.symbol} size={36} />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-[15px] text-ink dark:text-cream-warm">{c.symbol}</div>
                    <div className="text-[12.5px] muted">{c.buys} buy{c.buys === 1 ? '' : 's'} · {c.sells} sell{c.sells === 1 ? '' : 's'}</div>
                  </div>
                  <span className="font-mono font-semibold text-[15px]" style={{ color: pnlColor(c.realizedUsd) }}>{signedUsd(c.realizedUsd)}</span>
                </Link>
              </li>
            ))}
          </ul>
        ))}
    </div>
  );
}

/** Search by name or symbol, or paste an address. Results open the token page. */
function TokenSearch({ onOpen }: { onOpen: (mint: string) => void }) {
  const [q, setQ] = useState('');
  const [res, setRes] = useState<SearchResult[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const s = q.trim();
    setErr('');
    if (s.length < 2) { setRes(null); return; }
    if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s)) { onOpen(s); return; }
    let live = true; setBusy(true);
    const t = setTimeout(() => {
      kc<{ results: SearchResult[] }>(`trade/search?q=${encodeURIComponent(s)}`).then(r => { if (live) setRes(r.results); })
        .catch(e => { if (live) { setRes([]); setErr(e instanceof Error ? e.message : 'Search failed'); } })
        .finally(() => { if (live) setBusy(false); });
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
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search a token, or paste its address" aria-label="Search tokens"
          className="flex-1 min-w-0 bg-transparent outline-none text-[16px] text-ink dark:text-cream-warm py-3" autoComplete="off" spellCheck={false} />
        {busy ? <span className="h-4 w-4 rounded-full border-2 border-terracotta border-t-transparent animate-spin" aria-label="Searching" />
          : q && <button onClick={() => { setQ(''); setRes(null); }} aria-label="Clear" className="grid place-items-center h-9 w-9 -mr-2 muted"><IconClose size={16} /></button>}
      </div>
      {(res || err) && (
        <div className="absolute z-20 inset-x-0 mt-2 surface rounded-2xl shadow-card overflow-hidden max-h-[60vh] overflow-y-auto">
          {err ? <p className="p-4 text-[14px] text-[#B84A40]">{err}</p>
            : res && res.length === 0 ? <p className="p-4 text-[14px] muted">No Solana token found for “{q.trim()}”. Paste its address instead.</p>
            : res?.map(r => (
              <button key={r.mint} onClick={() => onOpen(r.mint)} className="w-full flex items-center gap-3 px-4 py-3 min-h-[60px] text-left hover:bg-cream-warm dark:hover:bg-night">
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
