'use client';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { kc, BOT_URL, dayLabel } from '@/lib/kc';
import { PageHeader } from '@/components/app/PageHeader';
import { Skeleton, CopyButton } from '@/components/app/ui';
import { IconShield, IconChevron } from '@/components/app/Icons';
import { useLiveRefresh } from '@/lib/useLiveRefresh';
import { TradePanel } from '@/components/app/TradePanel';
import { type Position, type TradeHome, type Pick, price, compact, signedUsd, pct, tokenAmount, PnlPill, pnlColor, TokenAvatar, ScoreGauge, readCache, writeCache } from '@/components/app/trade';

/**
 * Token page — T1 (read-only), 2026-10-09: live chart, your position, the analysis verdict (same engine as
 * Telegram's /analyze), market + holder stats, suggested levels. Buy / sell land here in T2.
 */

interface TokenView {
  ok: true; chain: string; mint: string; analysed: boolean; symbol: string; name: string; priceUsd: number | null; note?: string;
  change?: { m5: number | null; h1: number | null; h6: number | null; h24: number | null };
  volume?: { m5: number; h1: number; h24: number };
  marketCapUsd?: number; liquidityUsd?: number; ageHours?: number | null;
  txns24h?: number; buys24h?: number; sells24h?: number; buys1h?: number; sells1h?: number;
  holders?: { total: number | string; topHolderPct: number | null; risk: string | null; verified: boolean };
  technicals?: { rsi: number | null; signal: string; momentumScore: number | null; buySellRatio: number | null; volumeTrend: string };
  levels?: { entry: number | null; stopLoss: number | null; target: number | null };
  verdict?: { action: string; score: number | null; confidence: string | number | null; signals: string[]; insight: string | null; validMinutes: number | null };
  chartUrl?: string | null; explorerUrl?: string; position: Position | null; disclaimer?: string; loading?: boolean;
}

const RISK_TONE: Record<string, string> = { LOW: '#58834C', MEDIUM: '#B68B2A', HIGH: '#B84A40', CRITICAL: '#9E3B33' };
const age = (h: number | null | undefined) => (h == null ? '—' : h < 1 ? `${Math.max(1, Math.round(h * 60))} min` : h < 48 ? `${Math.round(h)} h` : `${Math.round(h / 24)} days`);

export default function TokenPage() {
  const { mint } = useParams<{ mint: string }>();
  const [t, setT] = useState<TokenView | null>(null);
  const [error, setError] = useState('');
  const load = useCallback(() => kc<TokenView>(`trade/token/${mint}`).then(d => { setT(d); setError(''); writeCache(`token:${mint}`, d); }).catch(e => setError(e instanceof Error ? e.message : 'Could not load this token')), [mint]);
  useEffect(() => {
    // Instant paint (2026-10-09): this token's last page, else a quick header from the Trade home / Smart Picks
    // already on this device; the full analysis replaces it in place.
    const cached = readCache<TokenView>(`token:${mint}`);
    if (cached) setT(cached);
    else {
      const pos = readCache<TradeHome>('home')?.positions.find(p => p.mint === mint) || null;
      const pk = readCache<Pick[]>('picks')?.find(p => p.mint === mint);
      if (pos || pk) setT({ ok: true, chain: 'SOLANA', mint, analysed: false, symbol: pos?.symbol || pk?.symbol || '', name: pos?.name || pk?.name || '', priceUsd: pos?.priceUsd ?? pk?.priceUsd ?? null, position: pos, loading: true });
    }
    load();
  }, [load, mint]);
  useLiveRefresh(load, 45_000);

  if (error) return <div className="space-y-6"><PageHeader title="Token" fallback="/app/trade" /><div className="surface rounded-2xl p-5 text-[15px]">{error} <button onClick={() => load()} className="underline font-semibold">Retry</button></div></div>;
  if (!t) return <div className="space-y-4"><PageHeader title="Token" fallback="/app/trade" /><Skeleton className="h-24" /><Skeleton className="h-[340px]" /><Skeleton className="h-40" /></div>;

  const p = t.position, v = t.verdict, ch = t.change;
  const buyShare = t.buys24h != null && t.sells24h != null && t.buys24h + t.sells24h > 0 ? Math.round((t.buys24h / (t.buys24h + t.sells24h)) * 100) : null;
  const action = (v?.action || '').toUpperCase();
  const actionTone = /BUY/.test(action) ? '#58834C' : /SELL|AVOID/.test(action) ? '#B84A40' : '#B68B2A';

  return (
    <div className="space-y-5 animate-fade-up">
      <PageHeader title={t.symbol} subtitle={t.name || undefined} fallback="/app/trade" />

      {/* Price */}
      <section className="flex items-end justify-between gap-3 -mt-2">
        <div className="flex items-center gap-3 min-w-0">
          <TokenAvatar symbol={t.symbol} size={52} />
          <div className="min-w-0">
            <div className="font-display font-bold text-[34px] leading-none text-ink dark:text-cream-warm">{price(t.priceUsd)}</div>
            {ch?.h24 != null && <div className="mt-1.5"><PnlPill value={ch.h24} /> <span className="text-[12.5px] muted">24 h</span></div>}
          </div>
        </div>
        <span className="text-[11.5px] muted shrink-0">Solana</span>
      </section>
      {ch && (
        <div className="grid grid-cols-4 gap-2">
          {([['5m', ch.m5], ['1h', ch.h1], ['6h', ch.h6], ['24h', ch.h24]] as Array<[string, number | null]>).map(([k, val]) => (
            <div key={k} className="surface rounded-xl py-2 text-center">
              <div className="text-[11px] muted">{k}</div>
              <div className="font-mono text-[13.5px] font-semibold" style={{ color: pnlColor(val) }}>{pct(val)}</div>
            </div>
          ))}
        </div>
      )}

      {/* Chart */}
      {t.chartUrl ? (
        <div className="surface rounded-2xl overflow-hidden">
          <iframe src={t.chartUrl} title={`${t.symbol} price chart`} className="w-full h-[340px] sm:h-[420px] border-0" loading="lazy" referrerPolicy="no-referrer" />
        </div>
      ) : t.note ? <div className="surface rounded-2xl p-4 text-[14px] muted">{t.note}</div>
        : t.loading ? <div className="space-y-3"><Skeleton className="h-[340px]" /><Skeleton className="h-40" /></div> : null}

      {/* Your position */}
      {p && (
        <section className="surface rounded-3xl p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold text-[16px] text-ink dark:text-cream-warm">Your position</h2>
            <PnlPill value={p.pnlPct} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-y-3 gap-x-4 text-[14px]">
            <Stat k="Value now" v={compact(p.valueUsd)} />
            <Stat k="Open P&L" v={signedUsd(p.pnlUsd)} color={pnlColor(p.pnlUsd)} />
            <Stat k="You hold" v={tokenAmount(p.amount)} />
            <Stat k="Your entry" v={price(p.entryPriceUsd)} />
            <Stat k="Cost" v={compact(p.investedUsd)} />
            <Stat k="Realised" v={signedUsd(p.realizedUsd)} color={pnlColor(p.realizedUsd)} />
          </div>
          {p.firstAt && <p className="text-[12.5px] muted mt-3">Holding since {dayLabel(p.firstAt)} · {p.buys} buy{p.buys === 1 ? '' : 's'}{p.sells ? `, ${p.sells} sell${p.sells === 1 ? '' : 's'}` : ''}</p>}
          {p.protection ? (
            <div className="mt-4 rounded-2xl bg-cream-warm dark:bg-night p-3.5 flex items-start gap-3">
              <IconShield size={20} className="text-terracotta shrink-0 mt-0.5" />
              <div className="text-[13.5px] leading-relaxed">
                <div className="font-semibold text-ink dark:text-cream-warm">{p.protection.status === 'trailing' ? 'Trailing — locking in gains' : 'Protected'}</div>
                <div className="muted">
                  {[p.protection.takeProfitPrice ? `Take profit at ${price(p.protection.takeProfitPrice)}` : null,
                    p.protection.stopLossPrice ? `stop loss at ${price(p.protection.stopLossPrice)}` : null,
                    p.protection.trailingPct ? `trails ${p.protection.trailingPct}% below the peak` : null].filter(Boolean).join(' · ')}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-[13px] muted mt-4">No take profit or stop loss on this yet — you’ll be able to add them here very soon (Telegram has them now).</p>
          )}
        </section>
      )}

      {/* Verdict */}
      {t.analysed && v && (
        <section className="surface rounded-3xl p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-[12.5px] muted">Our read right now</div>
              <div className="font-display font-bold text-[26px] leading-tight mt-0.5" style={{ color: actionTone }}>{v.action || 'Hold'}</div>
              {v.confidence != null && <div className="text-[13px] muted mt-0.5">Confidence: {String(v.confidence).toLowerCase()}{v.validMinutes ? ` · fresh for ~${v.validMinutes} min` : ''}</div>}
            </div>
            <ScoreGauge score={v.score} label="of 100" />
          </div>
          {v.insight && <p className="mt-3 text-[14.5px] leading-relaxed text-ink dark:text-cream-warm">{v.insight}</p>}
          {v.signals.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {v.signals.map(s => <li key={s} className="flex items-start gap-2 text-[14px]"><span className="mt-2 h-1.5 w-1.5 rounded-full bg-terracotta shrink-0" />{s}</li>)}
            </ul>
          )}
          {t.levels && (t.levels.entry || t.levels.target || t.levels.stopLoss) && (
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              {([['Entry', t.levels.entry, undefined], ['Target', t.levels.target, '#58834C'], ['Stop', t.levels.stopLoss, '#B84A40']] as Array<[string, number | null, string | undefined]>).map(([k, val, c]) => (
                <div key={k} className="rounded-xl bg-cream-warm dark:bg-night py-2.5">
                  <div className="text-[11px] muted">{k}</div>
                  <div className="font-mono text-[13px] font-semibold" style={{ color: c }}>{price(val)}</div>
                </div>
              ))}
            </div>
          )}
          <p className="text-[12px] muted mt-4">{t.disclaimer}</p>
        </section>
      )}

      {/* Market + holders */}
      {t.analysed && (
        <section className="surface rounded-3xl p-5">
          <h2 className="font-semibold text-[16px] text-ink dark:text-cream-warm">Market</h2>
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-y-3 gap-x-4 text-[14px]">
            <Stat k="Market cap" v={compact(t.marketCapUsd)} />
            <Stat k="Liquidity" v={compact(t.liquidityUsd)} />
            <Stat k="Volume 24 h" v={compact(t.volume?.h24)} />
            <Stat k="Trades 24 h" v={(t.txns24h ?? 0).toLocaleString()} />
            <Stat k="Age" v={age(t.ageHours)} />
            <Stat k="Holders" v={typeof t.holders?.total === 'number' ? t.holders.total.toLocaleString() : '—'} />
          </div>
          {buyShare != null && (
            <div className="mt-4">
              <div className="flex justify-between text-[12.5px]"><span style={{ color: '#58834C' }}>Buys {buyShare}%</span><span style={{ color: '#B84A40' }}>Sells {100 - buyShare}%</span></div>
              <div className="mt-1 h-2 rounded-full overflow-hidden flex" aria-hidden><div style={{ width: `${buyShare}%`, background: '#58834C' }} /><div className="flex-1" style={{ background: '#B84A40' }} /></div>
            </div>
          )}
          {t.holders && (
            <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-cream-warm dark:bg-night px-3.5 py-3 text-[13.5px]">
              <span className="muted">Top holder owns {t.holders.topHolderPct != null ? `${Number(t.holders.topHolderPct).toFixed(1)}%` : '—'}{t.holders.verified ? '' : ' (estimate)'}</span>
              {t.holders.risk && <span className="font-semibold rounded-full px-2.5 py-1 text-[12px]" style={{ background: (RISK_TONE[t.holders.risk] || '#6B5D52') + '1F', color: RISK_TONE[t.holders.risk] || '#6B5D52' }}>{t.holders.risk.toLowerCase()} risk</span>}
            </div>
          )}
          {t.technicals && (
            <p className="text-[13px] muted mt-3">RSI {t.technicals.rsi != null ? Number(t.technicals.rsi).toFixed(0) : '—'}{t.technicals.momentumScore != null ? ` · momentum ${t.technicals.momentumScore}` : ''}{t.technicals.volumeTrend ? ` · volume ${t.technicals.volumeTrend.toLowerCase()}` : ''}</p>
          )}
        </section>
      )}

      {/* Trade — T2a: buy with SOL / sell to SOL, Normal or Ultra */}
      <TradePanel mint={t.mint} symbol={t.symbol} held={!!p} onDone={load} />

      {/* Links */}
      <section className="surface rounded-3xl p-5">
        <p className="text-[13px] muted">Same wallet as <a href={BOT_URL} target="_blank" rel="noopener noreferrer" className="font-semibold text-terracotta">Telegram</a> — trades on either show on both.</p>
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-cream-warm dark:bg-night px-3 py-2">
          <span className="font-mono text-[12px] muted truncate flex-1">{t.mint}</span>
          <CopyButton value={t.mint} />
        </div>
        <div className="mt-2 flex gap-2">
          {t.explorerUrl && <a href={t.explorerUrl} target="_blank" rel="noopener noreferrer" className="flex-1 inline-flex items-center justify-center gap-1 min-h-[44px] rounded-xl border border-cream-border dark:border-night-border text-[14px] font-medium">Solscan <IconChevron size={13} /></a>}
          <a href={`https://dexscreener.com/solana/${t.mint}`} target="_blank" rel="noopener noreferrer" className="flex-1 inline-flex items-center justify-center gap-1 min-h-[44px] rounded-xl border border-cream-border dark:border-night-border text-[14px] font-medium">DexScreener <IconChevron size={13} /></a>
        </div>
      </section>
    </div>
  );
}

function Stat({ k, v, color }: { k: string; v: string; color?: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[12px] muted">{k}</div>
      <div className="font-mono font-semibold text-[14.5px] truncate text-ink dark:text-cream-warm" style={color ? { color } : undefined}>{v}</div>
    </div>
  );
}
