'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { kc } from '@/lib/kc';
import { Skeleton } from './ui';
import { ErrorNote } from './ErrorNote';
import { price, pct, pnlColor, compact } from './trade';
import { ProLock, ago, TIER_LABEL, TIER_COLOR, type Hub, type TrackSummary } from './premium';

/**
 * Smart Money alerts on the web (T4, 2026-10-11) — the same feed as Telegram: when 3+ of the top-1% wallets (5+ top-10%, 8+ smart
 * money) buy the same token in a window, an alert fires — rug-checked first. Every alert shows how it did since (price then vs
 * now — never a guess). Part of Copy Pro; without it the track record (alerts over a day old) is open. Backend /premium/alerts.
 */

interface Alert { id: number; tier: string; at: number; locked?: true; mint?: string; symbol?: string; wallets?: number; volumeUsd?: number | null; priceAtAlert?: number | null; priceNow?: number | null; changePct?: number | null; risk?: string | null }
interface Buying { mint: string; symbol: string; wallets: number; tiers: string[]; volumeUsd: number | null; lastAt: number }
interface Alerts { ok: true; access: boolean; on: boolean; live: boolean; wallets: { top1: number; top10: number; smart: number }; summary: TrackSummary; alerts: Alert[]; buyingNow: Buying[] | { locked: true; count: number }; tiers: Record<string, string>; note: string }

export function TrackLine({ s }: { s: TrackSummary }) {
  if (!s.alerts) return <span>No alerts in the last {s.days} days yet.</span>;
  return <span>{s.alerts} alert{s.alerts === 1 ? '' : 's'} in {s.days} days{s.measured ? <> · <b>{s.up} of {s.measured}</b> up since · median <b style={{ color: pnlColor(s.medianPct) }}>{pct(s.medianPct)}</b>{s.bestPct != null ? <> · best <b style={{ color: pnlColor(s.bestPct) }}>{pct(s.bestPct, 0)}</b></> : null}</> : null}</span>;
}

export function AlertsPanel({ hub, onSubscribe }: { hub: Hub | null; onSubscribe: () => void }) {
  const [a, setA] = useState<Alerts | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => kc<Alerts>('premium/alerts').then(r => { setA(r); setErr(''); }).catch(e => setErr(e instanceof Error ? e.message : 'Could not load alerts')), []);
  useEffect(() => { load(); const t = window.setInterval(() => { if (document.visibilityState === 'visible') load(); }, 30_000); return () => window.clearInterval(t); }, [load]);

  async function toggle() {
    if (!a) return;
    setBusy(true); setErr('');
    try { await kc('premium/alerts', { method: 'POST', body: { on: !a.on } }); await load(); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Could not change it'); }
    finally { setBusy(false); }
  }

  if (!a) return err ? <ErrorNote msg={err} /> : <div className="space-y-2"><Skeleton className="h-24" /><Skeleton className="h-16" /><Skeleton className="h-16" /></div>;
  const total = a.wallets.top1 + a.wallets.top10 + a.wallets.smart;

  return (
    <div className="space-y-5">
      <section className="rounded-3xl p-5 text-white bg-ink dark:bg-night-card relative overflow-hidden">
        <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-terracotta/30 blur-3xl" aria-hidden />
        <div className="relative">
          <div className="flex items-center gap-2 text-[12.5px] text-white/70">
            <span className={`h-2 w-2 rounded-full ${a.live ? 'bg-[#9BD08A] animate-pulse' : 'bg-white/40'}`} aria-hidden />
            {a.live ? `Watching ${total || '—'} wallets live` : 'Watcher paused — no new alerts right now'}
          </div>
          <div className="font-display font-bold text-[22px] mt-2 leading-snug">What the best wallets are buying</div>
          <p className="text-[14px] text-white/80 mt-2 leading-relaxed"><TrackLine s={a.summary} /></p>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            {(['top1', 'top10', 'smart'] as const).map(t => (
              <div key={t} className="rounded-2xl bg-white/10 px-2 py-2"><div className="text-[11px] text-white/65">{TIER_LABEL[t]}</div><div className="font-semibold text-[15px]">{a.wallets[t] || '—'}</div></div>
            ))}
          </div>
          {a.access && (
            <button onClick={toggle} disabled={busy} className="mt-4 w-full rounded-2xl bg-white/10 hover:bg-white/15 min-h-[52px] px-4 flex items-center justify-between text-[15px] font-semibold">
              <span>Send me alerts</span>
              <span className={`relative h-7 w-12 rounded-full transition-colors ${a.on ? 'bg-[#58834C]' : 'bg-white/25'}`} aria-hidden><span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${a.on ? 'left-6' : 'left-1'}`} /></span>
            </button>
          )}
          {a.access && a.on && <p className="text-[12px] text-white/60 mt-2">Alerts arrive on Telegram and as phone notifications — <Link href="/app/settings" className="underline">turn notifications on</Link> in Settings.</p>}
        </div>
      </section>
      <ErrorNote msg={err} />

      {!a.access && <ProLock title="Get every alert the moment it fires" body="Copy Pro opens fresh alerts and live smart-money buys, and sends them to your phone. The track record below stays open to everyone." cta="Get Copy Pro — $20 (or Pro: everything, $35)" onClick={onSubscribe} />}

      <section>
        <h2 className="font-semibold text-[16px] text-ink dark:text-cream-warm mb-1">Buying now</h2>
        <p className="text-[12.5px] muted mb-2">Tokens two or more tracked wallets bought in the last 2 hours.</p>
        {Array.isArray(a.buyingNow) ? (a.buyingNow.length === 0 ? <div className="surface rounded-2xl p-4 text-[14px] muted">Quiet right now.</div> : (
          <ul className="surface rounded-2xl divide-y divide-cream-border dark:divide-night-border px-4">
            {a.buyingNow.map(b => (
              <li key={b.mint}>
                <Link href={`/app/trade/${b.mint}`} className="flex items-center gap-3 py-3 min-h-[60px]">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-[15px] text-ink dark:text-cream-warm">{b.symbol}</div>
                    <div className="text-[12.5px] muted">{b.wallets} wallets · {compact(b.volumeUsd)} · {ago(b.lastAt)}</div>
                  </div>
                  <div className="flex gap-1">{b.tiers.map(t => <span key={t} className="h-2.5 w-2.5 rounded-full" style={{ background: TIER_COLOR[t] }} title={TIER_LABEL[t]} />)}</div>
                </Link>
              </li>
            ))}
          </ul>
        )) : (
          <div className="surface rounded-2xl p-4 text-[14px] muted">{a.buyingNow.count ? `${a.buyingNow.count} token${a.buyingNow.count === 1 ? '' : 's'} being bought by smart money right now — open with Copy Pro.` : 'Quiet right now.'}</div>
        )}
      </section>

      <section>
        <h2 className="font-semibold text-[16px] text-ink dark:text-cream-warm mb-1">Alerts and how they did</h2>
        <p className="text-[12.5px] muted mb-2">{a.note}</p>
        {a.alerts.length === 0 ? <div className="surface rounded-2xl p-4 text-[14px] muted">No alerts yet in this window.</div> : (
          <ul className="space-y-2">
            {a.alerts.map(x => x.locked ? (
              <li key={x.id} className="surface rounded-2xl p-3.5 flex items-center gap-3">
                <span className="rounded-full px-2 py-0.5 text-[11.5px] font-semibold" style={{ background: TIER_COLOR[x.tier] + '1A', color: TIER_COLOR[x.tier] }}>{TIER_LABEL[x.tier]}</span>
                <span className="flex-1 h-4 rounded bg-cream-warm dark:bg-night" aria-hidden />
                <span className="text-[12.5px] muted shrink-0">{ago(x.at)} · Pro</span>
              </li>
            ) : (
              <li key={x.id}>
                <Link href={`/app/trade/${x.mint}`} className="surface rounded-2xl p-3.5 flex items-center gap-3 hover:border-terracotta transition-colors min-h-[68px]">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[15px] text-ink dark:text-cream-warm truncate">{x.symbol}</span>
                      <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold shrink-0" style={{ background: TIER_COLOR[x.tier] + '1A', color: TIER_COLOR[x.tier] }}>{TIER_LABEL[x.tier]}</span>
                      {x.risk === 'caution' && <span className="text-[11px] font-semibold" style={{ color: '#B68B2A' }}>caution</span>}
                    </div>
                    <div className="text-[12.5px] muted font-mono truncate">{x.wallets} wallets · {ago(x.at)} · {price(x.priceAtAlert)} → {price(x.priceNow)}</div>
                  </div>
                  <div className="font-mono font-semibold text-[15px] shrink-0" style={{ color: pnlColor(x.changePct) }}>{x.changePct == null ? '—' : pct(x.changePct)}</div>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <p className="text-[12px] muted mt-3">Alerts read on-chain activity — they are never advice or a promise. Memecoins can go to zero.</p>
      </section>
    </div>
  );
}
