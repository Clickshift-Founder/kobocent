'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { kc, KcError } from '@/lib/kc';
import { Sheet, Skeleton } from './ui';
import { ErrorNote } from './ErrorNote';
import { signedUsd, pnlColor, pct } from './trade';
import { ProLock, ago, until, type Hub } from './premium';

/**
 * Copy trading on the web (T4, 2026-10-11). The same engine as Telegram: a watched wallet buys → your wallet buys the amount you
 * set (never more than half your SOL); it sells part or all → you sell the same share. Alpha wallets are ranked every 6 hours from
 * their real on-chain trades (7-day results) and are part of Copy Pro — no per-trade fees on them. Any other wallet can be copied
 * with a 3% copy fee. Backend /premium/copy/*.
 */

interface Wallet { id: string; alias: string; address: string | null; shortAddress: string; period: string; returnPct: number | null; pnlUsd: number | null; winRatePct: number | null; closedPositions: number | null; trades: number | null; avgTradeUsd: number | null; biggestWin: string | null; risk: string | null; avgHold: string | null; followers: number; youCopy: boolean }
interface Wallets { ok: true; live: boolean; pro: boolean; wallets: Wallet[]; limits: { minSol: number; maxSol: number; maxSessions: number }; fees: { note: string }; howItWorks: string }
interface Session { id: number; alias: string; shortAddress: string; type: 'alpha' | 'custom'; amountSol: number; active: boolean; startedAt: number | null; lastTradeAt: number | null; stopsAt: number | null; copied: number; failed: number; realizedUsd: number | null }
interface CopyTrade { sessionId: number; alias: string | null; mint: string; symbol: string; side: 'buy' | 'sell'; amountSol: number | null; ok: boolean; at: number | null; explorerUrl: string | null }
interface Mine { ok: true; live: boolean; sessions: Session[]; trades: CopyTrade[] }

const AMOUNTS = [0.05, 0.1, 0.25, 0.5, 1];
const RISK_COLOR: Record<string, string> = { LOW: '#58834C', MEDIUM: '#B68B2A', HIGH: '#B84A40' };

export function CopyPanel({ hub, onSubscribe }: { hub: Hub | null; onSubscribe: () => void }) {
  const [w, setW] = useState<Wallets | null>(null);
  const [mine, setMine] = useState<Mine | null>(null);
  const [err, setErr] = useState('');
  const [pick, setPick] = useState<Wallet | 'custom' | null>(null);
  const load = useCallback(() => {
    kc<Wallets>('premium/copy/wallets').then(setW).catch(e => setErr(e instanceof Error ? e.message : 'Could not load wallets'));
    kc<Mine>('premium/copy/mine').then(setMine).catch(() => setMine({ ok: true, live: true, sessions: [], trades: [] }));
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const t = window.setInterval(() => { if (document.visibilityState === 'visible') kc<Mine>('premium/copy/mine').then(setMine).catch(() => {}); }, 15_000);
    return () => window.clearInterval(t);
  }, []);

  const pro = !!hub?.status.copy.active;
  const active = mine?.sessions.filter(s => s.active) || [];
  const ended = mine?.sessions.filter(s => !s.active) || [];
  const live = (w?.live ?? mine?.live ?? true);

  return (
    <div className="space-y-5">
      {!live && (
        <div className="rounded-2xl p-4 text-[14px]" style={{ background: '#B68B2A1A', color: '#7A5C14' }}>
          Copy trading is paused while we switch the node that watches wallets. Nothing is copied right now — your copies resume on their own.
        </div>
      )}

      {/* My copies */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-[16px] text-ink dark:text-cream-warm">Your copies</h2>
          <button onClick={() => setPick('custom')} className="text-[14px] font-semibold text-terracotta min-h-[44px] px-1">Copy any wallet</button>
        </div>
        {!mine ? <Skeleton className="h-24" /> : active.length === 0 ? (
          <div className="surface rounded-2xl p-4 text-[14px] muted leading-relaxed">You’re not copying anyone yet. Pick an Alpha wallet below, or paste any Solana wallet you trust.</div>
        ) : (
          <ul className="space-y-2.5">
            {active.map(s => <SessionCard key={s.id} s={s} onStopped={load} />)}
          </ul>
        )}
        {mine && mine.trades.length > 0 && (
          <details className="mt-3 surface rounded-2xl px-4 group">
            <summary className="py-3.5 min-h-[48px] cursor-pointer text-[14px] font-semibold text-ink dark:text-cream-warm list-none flex justify-between">Copied trades <span className="muted font-normal">{mine.trades.length}</span></summary>
            <ul className="divide-y divide-cream-border dark:divide-night-border pb-1">
              {mine.trades.map((t, i) => (
                <li key={i} className="py-3 flex items-center gap-3 text-[14px]">
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: !t.ok ? '#B84A40' : t.side === 'buy' ? '#58834C' : '#C1502E' }} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <Link href={`/app/trade/${t.mint}`} className="font-semibold text-ink dark:text-cream-warm">{t.side === 'buy' ? 'Bought' : 'Sold'} {t.symbol}</Link>
                    <div className="text-[12.5px] muted truncate">{t.alias || 'Copy'} · {ago(t.at)}{t.ok ? '' : ' · did not go through'}</div>
                  </div>
                  {t.explorerUrl && <a href={t.explorerUrl} target="_blank" rel="noopener noreferrer" className="text-[13px] font-semibold text-terracotta min-h-[44px] leading-[44px]">Proof</a>}
                </li>
              ))}
            </ul>
          </details>
        )}
        {ended.length > 0 && <p className="text-[12.5px] muted mt-2">{ended.length} ended {ended.length === 1 ? 'copy' : 'copies'} in the last 30 days: {ended.map(s => `${s.alias} (${s.copied} trades${s.realizedUsd ? `, ${signedUsd(s.realizedUsd)}` : ''})`).join(' · ')}</p>}
      </section>

      {/* Alpha wallets */}
      <section>
        <div className="flex items-end justify-between mb-2 gap-3">
          <div>
            <h2 className="font-semibold text-[16px] text-ink dark:text-cream-warm">Alpha wallets</h2>
            <p className="text-[12.5px] muted">Ranked every 6 hours from their real trades over the last 7 days.</p>
          </div>
        </div>
        {!pro && <div className="mb-3"><ProLock title="Copy the best wallets, no per-trade fee" body="Copy Pro shows each Alpha wallet’s address and lets you copy it with no copy fee and no Ultra fee — plus Smart Money alerts." cta="Get Copy Pro — $20 / 30 days" onClick={onSubscribe} /></div>}
        {err ? <ErrorNote msg={err} /> : !w ? <div className="space-y-2"><Skeleton className="h-28" /><Skeleton className="h-28" /></div>
          : w.wallets.length === 0 ? <div className="surface rounded-2xl p-4 text-[14px] muted">The scanner is ranking wallets right now — check back in a few minutes.</div>
          : (
            <ul className="space-y-2.5">
              {w.wallets.map((x, i) => (
                <li key={x.id} className="surface rounded-2xl p-4">
                  <div className="flex items-center gap-3">
                    <span className="grid place-items-center h-10 w-10 shrink-0 rounded-xl bg-cream-warm dark:bg-night font-bold text-[14px] text-ink dark:text-cream-warm">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-[15px] text-ink dark:text-cream-warm truncate">{x.alias}</div>
                      <div className="text-[12.5px] muted font-mono">{x.address ? x.shortAddress : 'Address with Copy Pro'}{x.followers ? ` · ${x.followers} copying` : ''}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-display font-bold text-[20px]" style={{ color: pnlColor(x.returnPct) }}>{x.returnPct == null ? '—' : pct(x.returnPct, 0)}</div>
                      <div className="text-[10.5px] muted -mt-0.5">{x.period} return</div>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    {[['Profit', x.pnlUsd == null ? '—' : signedUsd(x.pnlUsd)], ['Win rate', x.winRatePct == null ? '—' : `${x.winRatePct}%`], ['Trades', x.trades == null ? '—' : String(x.trades)]].map(([k, v]) => (
                      <div key={k} className="rounded-xl bg-cream-warm dark:bg-night px-2 py-2"><div className="text-[11px] muted">{k}</div><div className="font-semibold text-[14px] text-ink dark:text-cream-warm">{v}</div></div>
                    ))}
                  </div>
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[12px]">
                    {x.risk && <span className="rounded-full px-2 py-0.5 font-semibold" style={{ background: (RISK_COLOR[x.risk] || '#6B5D52') + '1A', color: RISK_COLOR[x.risk] }}>{x.risk.toLowerCase()} risk</span>}
                    {x.biggestWin && <span className="rounded-full bg-cream-warm dark:bg-night px-2 py-0.5 text-ink dark:text-cream-warm">best {x.biggestWin}</span>}
                    {x.avgHold && <span className="rounded-full bg-cream-warm dark:bg-night px-2 py-0.5 text-ink dark:text-cream-warm">holds {x.avgHold}</span>}
                    {x.avgTradeUsd ? <span className="rounded-full bg-cream-warm dark:bg-night px-2 py-0.5 text-ink dark:text-cream-warm">~${x.avgTradeUsd} a trade</span> : null}
                  </div>
                  <button onClick={() => (pro ? setPick(x) : onSubscribe())} disabled={x.youCopy}
                    className={`mt-3 w-full min-h-[48px] rounded-2xl font-semibold text-[15px] ${x.youCopy ? 'bg-cream-warm dark:bg-night muted' : pro ? 'btn-primary' : 'border border-terracotta text-terracotta'}`}>
                    {x.youCopy ? 'You’re copying this wallet' : pro ? 'Copy this wallet' : 'Unlock with Copy Pro'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        {w && <p className="text-[12.5px] muted mt-3 leading-relaxed">{w.howItWorks} {w.fees.note} Past results never promise future ones.</p>}
      </section>

      <CopySheet target={pick} limits={w?.limits} onClose={() => setPick(null)} onStarted={() => { setPick(null); load(); }} />
    </div>
  );
}

function SessionCard({ s, onStopped }: { s: Session; onStopped: () => void }) {
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  async function stop() {
    setBusy(true); setErr('');
    try { await kc('premium/copy/stop', { method: 'POST', body: { sessionId: s.id } }); onStopped(); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Could not stop it'); }
    finally { setBusy(false); setConfirm(false); }
  }
  return (
    <li className="surface rounded-2xl p-4">
      <div className="flex items-center gap-3">
        <span className="relative grid place-items-center h-10 w-10 shrink-0 rounded-xl bg-terracotta-soft text-terracotta font-bold text-[13px]">
          {s.alias.slice(0, 2).toUpperCase()}
          <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-[#58834C] ring-2 ring-white dark:ring-night-card animate-pulse" aria-label="Watching" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-[15px] text-ink dark:text-cream-warm truncate">{s.alias} <span className="text-[11.5px] font-semibold muted uppercase ml-1">{s.type === 'alpha' ? 'Alpha' : 'Custom'}</span></div>
          <div className="text-[12.5px] muted">{s.amountSol} SOL a trade · {s.lastTradeAt ? `last copy ${ago(s.lastTradeAt)}` : 'watching — no trade yet'}</div>
        </div>
        <div className="text-right shrink-0">
          <div className="font-mono font-semibold text-[15px]" style={{ color: pnlColor(s.realizedUsd) }}>{s.realizedUsd ? signedUsd(s.realizedUsd) : '—'}</div>
          <div className="text-[11px] muted">realised</div>
        </div>
      </div>
      <div className="mt-2.5 flex items-center justify-between gap-3 text-[12.5px] muted">
        <span>{s.copied} copied{s.failed ? ` · ${s.failed} didn’t go through` : ''}{s.stopsAt ? ` · stops in ${until(s.stopsAt)} if it goes quiet` : ''}</span>
        {confirm
          ? <span className="flex gap-2"><button onClick={() => setConfirm(false)} className="min-h-[40px] px-2 font-semibold muted">Keep</button><button onClick={stop} disabled={busy} className="min-h-[40px] px-3 rounded-xl bg-[#B84A40] text-white font-semibold">{busy ? 'Stopping…' : 'Stop'}</button></span>
          : <button onClick={() => setConfirm(true)} className="min-h-[40px] px-2 font-semibold text-[#B84A40]">Stop copying</button>}
      </div>
      <ErrorNote msg={err} />
      <p className="text-[11.5px] muted mt-1">Stopping never sells what you hold — those tokens stay in your wallet.</p>
    </li>
  );
}

function CopySheet({ target, limits, onClose, onStarted }: { target: Wallet | 'custom' | null; limits?: Wallets['limits']; onClose: () => void; onStarted: () => void }) {
  const [amt, setAmt] = useState(0.1);
  const [custom, setCustom] = useState('');
  const [address, setAddress] = useState('');
  const [alias, setAlias] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [warning, setWarning] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  useEffect(() => { setErr(''); setWarning(null); setDone(null); setBusy(false); setCustom(''); setAmt(0.1); setAddress(''); setAlias(''); }, [target]);
  if (!target) return null;
  const isCustom = target === 'custom';
  const value = custom ? Number(custom) : amt;
  const valid = value >= (limits?.minSol ?? 0.01) && value <= (limits?.maxSol ?? 5) && (!isCustom || /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address.trim()));

  async function start() {
    setBusy(true); setErr('');
    try {
      const r = await kc<{ ok: true; alias: string; warning: string | null; stopsNote: string | null }>('premium/copy/start', { method: 'POST',
        body: isCustom ? { address: address.trim(), alias: alias.trim() || null, amountSol: value } : { walletId: (target as Wallet).id, amountSol: value } });
      setWarning(r.warning); setDone(`Watching ${r.alias}. The moment it trades, your copy runs — you get a notification each time.${r.stopsNote ? ` ${r.stopsNote}` : ''}`);
    } catch (e) {
      setErr(e instanceof KcError || e instanceof Error ? e.message : 'Could not start copying');
    } finally { setBusy(false); }
  }

  return (
    <Sheet open={!!target} onClose={() => { if (!busy) (done ? onStarted() : onClose()); }} title={done ? 'Copying' : isCustom ? 'Copy any wallet' : `Copy ${(target as Wallet).alias}`}>
      {done ? (
        <div className="space-y-4">
          <p className="text-[15px] text-ink dark:text-cream-warm leading-relaxed">{done}</p>
          {warning && <p className="rounded-2xl p-3 text-[14px]" style={{ background: '#B68B2A1A', color: '#7A5C14' }}>{warning}</p>}
          <button onClick={onStarted} className="btn-primary w-full">Done</button>
        </div>
      ) : (
        <div className="space-y-4">
          {isCustom && (
            <>
              <label className="block">
                <span className="text-[13px] muted">Wallet address (Solana)</span>
                <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Paste the wallet to copy" spellCheck={false} autoComplete="off"
                  className="mt-1 w-full surface rounded-2xl px-4 min-h-[52px] text-[16px] font-mono outline-none focus:border-terracotta" />
              </label>
              <label className="block">
                <span className="text-[13px] muted">Nickname (optional)</span>
                <input value={alias} onChange={e => setAlias(e.target.value)} maxLength={24} placeholder="e.g. Ayo’s wallet"
                  className="mt-1 w-full surface rounded-2xl px-4 min-h-[52px] text-[16px] outline-none focus:border-terracotta" />
              </label>
            </>
          )}
          <div>
            <div className="text-[13px] muted mb-1.5">SOL to spend each time it buys</div>
            <div className="grid grid-cols-5 gap-1.5">
              {AMOUNTS.map(a => (
                <button key={a} onClick={() => { setAmt(a); setCustom(''); }} aria-pressed={!custom && amt === a}
                  className={`min-h-[44px] rounded-xl border text-[14px] font-semibold ${!custom && amt === a ? 'border-terracotta bg-terracotta-soft text-terracotta' : 'border-cream-border dark:border-night-border text-ink dark:text-cream-warm'}`}>{a}</button>
              ))}
            </div>
            <input value={custom} onChange={e => setCustom(e.target.value.replace(/[^0-9.]/g, ''))} inputMode="decimal" placeholder="Or type an amount"
              className="mt-2 w-full surface rounded-2xl px-4 min-h-[48px] text-[16px] outline-none focus:border-terracotta" />
          </div>
          <div className="rounded-2xl bg-cream-warm dark:bg-night p-4 text-[13.5px] space-y-1.5 leading-relaxed">
            <p className="text-ink dark:text-cream-warm">When it buys, you buy <b>{value || '—'} SOL</b> of the same token (never more than half your SOL). When it sells part or all, you sell the same share.</p>
            <p className="muted">{isCustom ? 'Copy fee: 3% of each copied trade, plus the 3% Ultra fee unless you have Ultra, plus the 1% trading fee.' : 'Copy Pro: no copy fee and no Ultra fee — only the 1% trading fee.'} Keep about {((value || 0) * 1.08 + 0.015).toFixed(3)} SOL in your wallet.</p>
            {isCustom && <p className="muted">Stops by itself after 7 days without a trade from this wallet.</p>}
          </div>
          <ErrorNote msg={err} />
          <button onClick={start} disabled={!valid || busy} className="btn-primary w-full disabled:opacity-50">{busy ? 'Starting…' : 'Start copying'}</button>
        </div>
      )}
    </Sheet>
  );
}
