'use client';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { kc } from '@/lib/kc';
import { PageHeader } from '@/components/app/PageHeader';
import { Skeleton, CopyButton } from '@/components/app/ui';
import { IconChevron } from '@/components/app/Icons';
import { useLiveRefresh } from '@/lib/useLiveRefresh';
import { BnbTradePanel, type Security } from '@/components/app/BnbTradePanel';
import { BnbAutomationPanel } from '@/components/app/BnbAutomation';
import { price, compact, signedUsd, pct, tokenAmount, PnlPill, pnlColor, TokenAvatar, readCache, writeCache } from '@/components/app/trade';

/**
 * BNB Chain token page (2026-10-11): live chart, your position, the contract check (GoPlus: honeypot, taxes, owner powers,
 * holders), market data, and buy / sell (src/trading/evmTrade.js via /trade/bnb/*).
 */

interface View {
  ok: true; chain: 'BNB'; address: string; analysed: boolean; symbol: string; name: string; priceUsd: number | null; note?: string;
  change?: { m5: number | null; h1: number | null; h6: number | null; h24: number | null }; volume?: { h1: number | null; h24: number | null };
  marketCapUsd?: number | null; liquidityUsd?: number | null; ageHours?: number | null; buys24h?: number | null; sells24h?: number | null;
  dex?: string; imageUrl?: string | null; security: Security; chartUrl?: string; explorerUrl: string; disclaimer?: string;
  position: { amount: number; valueUsd: number | null; entryPriceUsd: number | null; pnlUsd: number | null; pnlPct: number | null } | null;
}
const V: Record<string, { label: string; color: string }> = { clear: { label: 'No major red flags', color: '#58834C' }, caution: { label: 'Some things to know', color: '#B68B2A' }, danger: { label: 'Danger — we won’t buy it', color: '#B84A40' } };
const age = (h: number | null | undefined) => (h == null ? '—' : h < 1 ? `${Math.max(1, Math.round(h * 60))} min` : h < 48 ? `${Math.round(h)} h` : `${Math.round(h / 24)} days`);

export default function BnbTokenPage() {
  const { address } = useParams<{ address: string }>();
  const [t, setT] = useState<View | null>(null);
  const [error, setError] = useState('');
  const load = useCallback(() => kc<View>(`trade/bnb/token/${address}`).then(d => { setT(d); setError(''); writeCache(`bnb-token:${address}`, d); })
    .catch(e => setError(e instanceof Error ? e.message : 'Could not load this token')), [address]);
  useEffect(() => { const c = readCache<View>(`bnb-token:${address}`); if (c) setT(c); load(); }, [load, address]);
  useLiveRefresh(load, 20_000);

  if (error && !t) return <div className="space-y-6"><PageHeader title="Token" fallback="/app/trade/bnb" /><div className="surface rounded-2xl p-5 text-[15px]">{error} <button onClick={() => load()} className="underline font-semibold">Retry</button></div></div>;
  if (!t) return <div className="space-y-4"><PageHeader title="Token" fallback="/app/trade/bnb" /><Skeleton className="h-24" /><Skeleton className="h-[340px]" /><Skeleton className="h-40" /></div>;
  const p = t.position, s = t.security, ch = t.change;
  const buyShare = t.buys24h != null && t.sells24h != null && t.buys24h + t.sells24h > 0 ? Math.round(t.buys24h / (t.buys24h + t.sells24h) * 100) : null;

  return (
    <div className="space-y-5 animate-fade-up">
      <PageHeader title={t.symbol} subtitle={`${t.name ? `${t.name} · ` : ''}BNB Chain`} fallback="/app/trade/bnb" />

      <section className="flex items-end justify-between gap-3 -mt-2">
        <div className="flex items-center gap-3 min-w-0">
          <TokenAvatar symbol={t.symbol} imageUrl={t.imageUrl} size={52} />
          <div className="min-w-0">
            <div className="font-display font-bold text-[30px] leading-none text-ink dark:text-cream-warm">{price(t.priceUsd)}</div>
            {ch?.h24 != null && <div className="text-[14px] font-mono mt-1" style={{ color: pnlColor(ch.h24) }}>{pct(ch.h24)} today</div>}
          </div>
        </div>
        {ch && <div className="flex gap-1.5 text-[12px] font-mono">{(['m5', 'h1', 'h6'] as const).map(k => ch[k] != null && <span key={k} className="rounded-full px-2 py-0.5" style={{ background: (pnlColor(ch[k]) || '#6B5D52') + '1A', color: pnlColor(ch[k]) }}>{k.replace('m', '').replace('h', '')}{k.startsWith('m') ? 'm' : 'h'} {pct(ch[k])}</span>)}</div>}
      </section>

      {t.chartUrl ? <div className="rounded-3xl overflow-hidden surface h-[340px]"><iframe src={t.chartUrl} title={`${t.symbol} chart`} className="w-full h-full border-0" loading="lazy" /></div>
        : <div className="surface rounded-2xl p-5 text-[14px] muted">{t.note || 'No chart yet.'}</div>}

      {p && (
        <section className="surface rounded-3xl p-5">
          <div className="text-[13px] muted">Your position</div>
          <div className="flex items-end justify-between mt-1">
            <div><div className="font-display font-bold text-[26px] text-ink dark:text-cream-warm">{compact(p.valueUsd)}</div><div className="text-[13px] muted font-mono">{tokenAmount(p.amount)} {t.symbol}{p.entryPriceUsd ? ` · entry ${price(p.entryPriceUsd)}` : ''}</div></div>
            <div className="text-right">{p.pnlUsd != null && <div className="font-mono font-semibold" style={{ color: pnlColor(p.pnlUsd) }}>{signedUsd(p.pnlUsd)}</div>}<PnlPill value={p.pnlPct} /></div>
          </div>
        </section>
      )}

      {/* Contract check */}
      <section className="surface rounded-3xl p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-[16px] text-ink dark:text-cream-warm">Contract check</h2>
          {s.verdict && <span className="rounded-full px-2.5 py-1 text-[12px] font-semibold" style={{ background: V[s.verdict].color + '1A', color: V[s.verdict].color }}>{V[s.verdict].label}</span>}
        </div>
        {!s.checked ? <p className="text-[14px] muted mt-2">The contract check is unavailable right now — be extra careful.</p> : (
          <>
            {[...s.danger, ...s.warnings].length > 0 ? <ul className="mt-3 space-y-1.5">{s.danger.map(x => <li key={x} className="text-[14px]" style={{ color: '#B84A40' }}>● {x}</li>)}{s.warnings.map(x => <li key={x} className="text-[14px] text-ink dark:text-cream-warm"><span style={{ color: '#B68B2A' }}>●</span> {x}</li>)}</ul>
              : <p className="text-[14px] muted mt-2">Not a honeypot, sellable, no heavy taxes, the owner can’t change balances, and the code is public.</p>}
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              {[['Buy tax', s.buyTaxPct == null ? '—' : `${s.buyTaxPct.toFixed(1)}%`], ['Sell tax', s.sellTaxPct == null ? '—' : `${s.sellTaxPct.toFixed(1)}%`], ['Holders', s.holders == null ? '—' : compact(s.holders).replace('$', '')]].map(([k, v]) => (
                <div key={k} className="rounded-xl bg-cream-warm dark:bg-night px-2 py-2"><div className="text-[11px] muted">{k}</div><div className="font-semibold text-[14px] text-ink dark:text-cream-warm">{v}</div></div>
              ))}
            </div>
          </>
        )}
      </section>

      <BnbTradePanel token={t.address} symbol={t.symbol} held={!!p && p.amount > 0} onDone={load} />

      {/* Protect, buy at a price, DCA — 24/7 on the server */}
      <BnbAutomationPanel token={t.address} symbol={t.symbol} held={!!p && p.amount > 0} priceUsd={t.priceUsd} onChange={load} />

      {t.analysed && (
        <section className="surface rounded-3xl p-5 grid grid-cols-2 gap-3 text-[14px]">
          {[['Market cap', compact(t.marketCapUsd)], ['Liquidity', compact(t.liquidityUsd)], ['Volume 24h', compact(t.volume?.h24 ?? null)], ['Age', age(t.ageHours)], ['Buys 24h', buyShare == null ? '—' : `${buyShare}% of trades`], ['Pool', t.dex || '—']].map(([k, v]) => (
            <div key={k}><div className="text-[12px] muted">{k}</div><div className="font-semibold text-ink dark:text-cream-warm">{v}</div></div>
          ))}
        </section>
      )}

      <section className="surface rounded-3xl p-5 space-y-3">
        <div className="flex items-center justify-between gap-3"><div className="min-w-0"><div className="text-[12px] muted">Contract</div><div className="font-mono text-[13px] truncate">{t.address}</div></div><CopyButton value={t.address} /></div>
        <a href={t.explorerUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 min-h-[44px] text-[14px] font-semibold text-terracotta">BscScan <IconChevron size={13} /></a>
        <p className="text-[12px] muted">{t.disclaimer || 'Only trade what you can afford to lose.'}</p>
      </section>
    </div>
  );
}
