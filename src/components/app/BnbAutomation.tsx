'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { kc, KcError } from '@/lib/kc';
import { Sheet } from './ui';
import { ScanButton } from './ScanButton';
import { ErrorNote } from './ErrorNote';
import { HoldToConfirm, newKey } from './money';
import { price, pct } from './trade';

/**
 * BNB Chain automation (2026-10-11) — backend /trade/bnb/strategies, /protect, /limit, /dca, /copy, /strategy/cancel
 * (src/trading/evmStrategies.js). Runs 24/7 on the server: protections and buy orders checked every 5 seconds, DCA on schedule
 * or on dips, copied wallets watched every 6 seconds. Every buy and sell goes through the same checks as a manual trade.
 */

export interface Strategy {
  id: number; kind: 'protect' | 'limit' | 'dca' | 'copy'; token: string; symbol: string | null; status: string; error: string | null;
  config: Record<string, number | string | null>; state: Record<string, unknown>; priceNowUsd: number | null; createdAt: number; updatedAt: number;
}
interface List { ok: true; strategies: Strategy[] }

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} aria-pressed={on} className={`min-h-[44px] rounded-xl border px-2 text-[14px] font-semibold transition-colors ${on ? 'border-terracotta bg-terracotta-soft text-terracotta' : 'border-cream-border dark:border-night-border text-ink dark:text-cream-warm'}`}>{children}</button>;
}

export function useStrategies(token?: string) {
  const [list, setList] = useState<Strategy[] | null>(null);
  const load = useCallback(() => kc<List>(`trade/bnb/strategies${token ? `?token=${token}` : ''}`).then(r => setList(r.strategies)).catch(() => setList([])), [token]);
  useEffect(() => { load(); const t = window.setInterval(() => { if (document.visibilityState === 'visible') load(); }, 15_000); return () => window.clearInterval(t); }, [load]);
  return { list, load };
}

/** One row per strategy, with a cancel button while it can still be stopped. */
export function StrategyRow({ s, onChange, showToken = true }: { s: Strategy; onChange: () => void; showToken?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const c = s.config, st = s.state as Record<string, number | boolean | null | Record<string, unknown>>;
  const title = s.kind === 'protect' ? 'Protect' : s.kind === 'limit' ? (c.direction === 'above' ? 'Buy the breakout' : 'Buy the dip') : s.kind === 'dca' ? 'DCA' : `Copying ${c.alias}`;
  const line = s.kind === 'protect'
    ? [c.tp ? `TP ${price(Number(c.tp))}` : null, c.sl ? `SL ${price(Number(c.sl))}` : null, c.trail ? `trail ${c.trail}%${st.trailing ? ' (trailing)' : ''}` : null].filter(Boolean).join(' · ')
    : s.kind === 'limit' ? `$${c.amountUsd} when ${c.direction === 'above' ? '≥' : '≤'} ${price(Number(c.target))}${s.priceNowUsd ? ` · now ${price(s.priceNowUsd)} (${pct((Number(c.target) / s.priceNowUsd - 1) * 100)} away)` : ''}`
    : s.kind === 'dca' ? `${st.done} of ${c.buys} buys of $${c.perBuyUsd} · ${c.mode === 'dips' ? `every −${c.dropPct}%` : `every ${Number(c.intervalMin) >= 60 ? `${Number(c.intervalMin) / 60} h` : `${c.intervalMin} min`}`}`
    : `$${c.amountUsd} a trade · ${st.copied || 0} copied`;
  const live = ['active', 'paused'].includes(s.status);
  const color = s.status === 'active' ? '#58834C' : s.status === 'done' ? '#C1502E' : s.status === 'paused' || s.status === 'running' ? '#B68B2A' : '#6B5D52';
  async function cancel() {
    setBusy(true); setErr('');
    try { await kc('trade/bnb/strategy/cancel', { method: 'POST', body: { id: s.id } }); onChange(); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Could not stop it'); }
    finally { setBusy(false); }
  }
  return (
    <li className="surface rounded-2xl p-3.5">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-[15px] text-ink dark:text-cream-warm truncate">
            {title}{showToken && s.kind !== 'copy' && s.symbol ? <> · <Link href={`/app/trade/bnb/${s.token}`} className="text-terracotta">{s.symbol}</Link></> : null}
          </div>
          <div className="text-[12.5px] muted truncate">{line}</div>
          {s.error && s.status !== 'done' && <div className="text-[12px] mt-0.5" style={{ color: '#B84A40' }}>{s.error}</div>}
        </div>
        <div className="text-right shrink-0">
          <span className="rounded-full px-2 py-0.5 text-[12px] font-semibold" style={{ background: color + '1A', color }}>{s.status === 'active' ? 'on' : s.status}</span>
          {live && <button onClick={cancel} disabled={busy} className="block ml-auto mt-1 text-[13px] font-semibold text-[#B84A40] min-h-[36px]">{busy ? '…' : 'Stop'}</button>}
        </div>
      </div>
      <ErrorNote msg={err} />
    </li>
  );
}

const TP = [{ l: '+50%', v: 50 }, { l: '2×', v: 100 }, { l: '3×', v: 200 }, { l: '5×', v: 400 }];
const SL = [10, 20, 30, 50];
const TRAIL = [10, 15, 20, 25];
const DIP = [-10, -20, -30, -50], BREAK = [10, 25, 50, 100];
const EXP = [{ l: '1 h', v: 1 }, { l: '6 h', v: 6 }, { l: '24 h', v: 24 }, { l: '3 d', v: 72 }, { l: '7 d', v: 168 }];
const EVERY = [{ l: '15 min', v: 15 }, { l: '1 h', v: 60 }, { l: '4 h', v: 240 }, { l: 'Daily', v: 1440 }];

/** On a BNB token page: Protect (when held), Buy at a price, DCA — and what's running on this token. */
export function BnbAutomationPanel({ token, symbol, held, priceUsd, onChange }: { token: string; symbol: string; held: boolean; priceUsd: number | null; onChange: () => void }) {
  const { list, load } = useStrategies(token);
  const [tab, setTab] = useState<'protect' | 'limit' | 'dca'>(held ? 'protect' : 'limit');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  // protect
  const [tp, setTp] = useState<number | null>(100); const [sl, setSl] = useState<number | null>(20); const [trail, setTrail] = useState<number | null>(null);
  // limit
  const [dir, setDir] = useState<'below' | 'above'>('below'); const [move, setMove] = useState(-20); const [amt, setAmt] = useState(10); const [hours, setHours] = useState(24);
  const [ltp, setLtp] = useState<number | null>(null); const [lsl, setLsl] = useState<number | null>(null);
  // dca
  const [total, setTotal] = useState(40); const [buys, setBuys] = useState(4); const [mode, setMode] = useState<'interval' | 'dips'>('interval'); const [every, setEvery] = useState(60); const [drop, setDrop] = useState(10);
  const [pay, setPay] = useState<'USDT' | 'USDC' | 'BNB'>('USDT');
  const keyRef = useRef(newKey());
  const done = (m: string) => { setOk(m); load(); onChange(); };

  async function go() {
    setBusy(true); setErr(''); setOk('');
    try {
      if (tab === 'protect') {
        const r = await kc<{ ok: true; cleared?: boolean; protect?: { takeProfitPrice: number | null; stopLossPrice: number | null; trailingPct: number | null } }>('trade/bnb/protect', { method: 'POST',
          body: { token, takeProfitPct: tp ?? 'none', stopLossPct: sl ?? 'none', trailingPct: trail ?? 'none' } });
        done(r.cleared ? 'Protection removed.' : `Protected: ${[r.protect?.takeProfitPrice ? `sells at ${price(r.protect.takeProfitPrice)}` : null, r.protect?.stopLossPrice ? `stops at ${price(r.protect.stopLossPrice)}` : null, r.protect?.trailingPct ? `trails ${r.protect.trailingPct}%` : null].filter(Boolean).join(', ')}. Checked every 5 seconds.`);
      } else if (tab === 'limit') {
        const r = await kc<{ ok: true; targetPriceUsd: number; feePct: number }>('trade/bnb/limit', { method: 'POST',
          body: { token, direction: dir, movePct: move, amountUsd: amt, payWith: pay, expiresHours: hours, takeProfitPct: ltp, stopLossPct: lsl } });
        done(`Set: buys $${amt} of ${symbol} when it ${dir === 'below' ? 'falls' : 'rises'} to ${price(r.targetPriceUsd)} (fee ${r.feePct}%). You’ll get a notification.`);
      } else {
        interface J { id: string; status: string; result: null | { ok: boolean; error?: string } }
        let j = await kc<J>('trade/bnb/dca', { method: 'POST', body: { token, payWith: pay, totalUsd: total, buys, mode, intervalMinutes: every, dropPct: drop, idempotencyKey: keyRef.current } });
        for (let i = 0; i < 80 && j.status !== 'done'; i++) { await new Promise(r => setTimeout(r, 1500)); try { j = await kc<J>(`trade/jobs/${j.id}`); } catch (e) { if (e instanceof KcError && e.status === 404) break; } }
        keyRef.current = newKey();
        if (!j.result?.ok) throw new Error(j.result?.error || 'The first buy didn’t go through — nothing was set up');
        done(`DCA started: first $${(total / buys).toFixed(2)} bought; ${buys - 1} more ${mode === 'dips' ? `on each −${drop}% dip` : 'on schedule'}.`);
      }
    } catch (e) { setErr(e instanceof Error ? e.message : 'It didn’t go through'); }
    finally { setBusy(false); }
  }

  const active = (list || []).filter(s => ['active', 'paused', 'running'].includes(s.status));
  return (
    <section className="surface rounded-3xl p-5 space-y-4">
      <div>
        <h2 className="font-semibold text-[16px] text-ink dark:text-cream-warm">Automate</h2>
        <p className="text-[13px] muted">Runs 24/7 on our servers — your phone can be off.</p>
      </div>
      {active.length > 0 && <ul className="space-y-2">{active.map(s => <StrategyRow key={s.id} s={s} onChange={() => { load(); onChange(); }} showToken={false} />)}</ul>}
      <div className="grid grid-cols-3 gap-1 p-1 rounded-2xl bg-cream-warm dark:bg-night" role="tablist">
        {([['protect', 'Protect'], ['limit', 'At a price'], ['dca', 'DCA']] as const).map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => { setTab(k); setErr(''); setOk(''); }} disabled={k === 'protect' && !held}
            className={`min-h-[44px] rounded-xl text-[14px] font-semibold disabled:opacity-40 ${tab === k ? 'bg-white dark:bg-night-card text-ink dark:text-cream-warm shadow-sm' : 'muted'}`}>{l}</button>
        ))}
      </div>

      {tab === 'protect' && (
        <div className="space-y-3">
          <div><div className="text-[13px] muted mb-1.5">Take profit (from your entry)</div><div className="grid grid-cols-5 gap-1.5">{TP.map(x => <Chip key={x.v} on={tp === x.v} onClick={() => setTp(x.v)}>{x.l}</Chip>)}<Chip on={tp === null} onClick={() => setTp(null)}>None</Chip></div></div>
          <div><div className="text-[13px] muted mb-1.5">Stop loss</div><div className="grid grid-cols-5 gap-1.5">{SL.map(x => <Chip key={x} on={sl === x} onClick={() => setSl(x)}>−{x}%</Chip>)}<Chip on={sl === null} onClick={() => setSl(null)}>None</Chip></div></div>
          <div><div className="text-[13px] muted mb-1.5">Trailing {tp ? '(starts at the take profit)' : '(from now)'}</div><div className="grid grid-cols-5 gap-1.5">{TRAIL.map(x => <Chip key={x} on={trail === x} onClick={() => setTrail(x)}>{x}%</Chip>)}<Chip on={trail === null} onClick={() => setTrail(null)}>Off</Chip></div></div>
          <p className="text-[12.5px] muted">Sells everything into USDT when a level is hit. Changing one level keeps the others.</p>
        </div>
      )}

      {tab === 'limit' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2"><Chip on={dir === 'below'} onClick={() => { setDir('below'); setMove(-20); }}>Buy the dip</Chip><Chip on={dir === 'above'} onClick={() => { setDir('above'); setMove(25); }}>Buy the breakout</Chip></div>
          <div className="grid grid-cols-4 gap-1.5">{(dir === 'below' ? DIP : BREAK).map(v => <Chip key={v} on={move === v} onClick={() => setMove(v)}>{v > 0 ? '+' : '−'}{Math.abs(v)}%</Chip>)}</div>
          <p className="text-[13px] muted">Buys when the price {dir === 'below' ? 'falls' : 'rises'} to <b className="font-mono text-ink dark:text-cream-warm">{price(priceUsd ? priceUsd * (1 + move / 100) : null)}</b>.</p>
          <div><div className="text-[13px] muted mb-1.5">Amount</div><div className="grid grid-cols-5 gap-1.5">{[5, 10, 25, 50, 100].map(v => <Chip key={v} on={amt === v} onClick={() => setAmt(v)}>${v}</Chip>)}</div></div>
          <div><div className="text-[13px] muted mb-1.5">Cancel if not filled within</div><div className="grid grid-cols-5 gap-1.5">{EXP.map(x => <Chip key={x.v} on={hours === x.v} onClick={() => setHours(x.v)}>{x.l}</Chip>)}</div></div>
          <div><div className="text-[13px] muted mb-1.5">Once it buys (optional)</div><div className="grid grid-cols-4 gap-1.5">
            <Chip on={ltp === 100} onClick={() => setLtp(ltp === 100 ? null : 100)}>TP 2×</Chip><Chip on={ltp === 200} onClick={() => setLtp(ltp === 200 ? null : 200)}>TP 3×</Chip>
            <Chip on={lsl === 20} onClick={() => setLsl(lsl === 20 ? null : 20)}>SL −20%</Chip><Chip on={lsl === 30} onClick={() => setLsl(lsl === 30 ? null : 30)}>SL −30%</Chip></div></div>
        </div>
      )}

      {tab === 'dca' && (
        <div className="space-y-3">
          <div><div className="text-[13px] muted mb-1.5">Total</div><div className="grid grid-cols-5 gap-1.5">{[20, 40, 100, 250, 500].map(v => <Chip key={v} on={total === v} onClick={() => setTotal(v)}>${v}</Chip>)}</div></div>
          <div><div className="text-[13px] muted mb-1.5">Number of buys</div><div className="grid grid-cols-5 gap-1.5">{[2, 4, 6, 8, 10].map(v => <Chip key={v} on={buys === v} onClick={() => setBuys(v)}>{v}</Chip>)}</div></div>
          <div className="grid grid-cols-2 gap-2"><Chip on={mode === 'interval'} onClick={() => setMode('interval')}>On a schedule</Chip><Chip on={mode === 'dips'} onClick={() => setMode('dips')}>On dips</Chip></div>
          {mode === 'interval' ? <div className="grid grid-cols-4 gap-1.5">{EVERY.map(x => <Chip key={x.v} on={every === x.v} onClick={() => setEvery(x.v)}>{x.l}</Chip>)}</div>
            : <div className="grid grid-cols-4 gap-1.5">{[5, 10, 15, 20].map(v => <Chip key={v} on={drop === v} onClick={() => setDrop(v)}>−{v}%</Chip>)}</div>}
          <p className="text-[12.5px] muted">${(total / buys).toFixed(2)} a buy. The first buy happens now; the rest {mode === 'dips' ? `each time it drops another ${drop}% from the first buy’s price` : 'on schedule'}.</p>
        </div>
      )}

      {tab !== 'protect' && <div><div className="text-[13px] muted mb-1.5">Pay with</div><div className="grid grid-cols-3 gap-1.5">{(['USDT', 'USDC', 'BNB'] as const).map(a => <Chip key={a} on={pay === a} onClick={() => setPay(a)}>{a}</Chip>)}</div></div>}
      {ok && <p className="rounded-2xl p-3 text-[14px]" style={{ background: '#58834C14', color: '#3F6236' }}>{ok}</p>}
      <ErrorNote msg={err} />
      <HoldToConfirm label={tab === 'protect' ? 'Hold to protect' : tab === 'limit' ? 'Hold to set the order' : `Hold to start DCA`} onConfirm={go} busy={busy} />
    </section>
  );
}

/** Copy any BNB Chain wallet (sheet). */
export function BnbCopySheet({ open, onClose, onDone, initialWallet = '', initialAlias = '' }: { open: boolean; onClose: () => void; onDone: () => void; initialWallet?: string; initialAlias?: string }) {
  const [wallet, setWallet] = useState('');
  const [alias, setAlias] = useState('');
  const [amt, setAmt] = useState(10);
  const [pay, setPay] = useState<'USDT' | 'USDC' | 'BNB'>('USDT');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  useEffect(() => { if (open) { setErr(''); setMsg(''); setBusy(false); if (initialWallet) { setWallet(initialWallet); setAlias(initialAlias); } } }, [open, initialWallet, initialAlias]);
  const valid = /^0x[0-9a-fA-F]{40}$/.test(wallet.trim());
  async function go() {
    setBusy(true); setErr('');
    try {
      const r = await kc<{ ok: true; alias: string; feePct: number }>('trade/bnb/copy', { method: 'POST', body: { wallet: wallet.trim(), alias: alias.trim() || null, amountUsd: amt, payWith: pay } });
      setMsg(`Watching ${r.alias}. When it buys a token you buy $${amt}; when it sells, you sell the same share. Fee ${r.feePct}% a trade (Copy Pro: 1%).`);
      onDone();
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not start copying'); }
    finally { setBusy(false); }
  }
  return (
    <Sheet open={open} onClose={() => { if (!busy) onClose(); }} title="Copy a BNB Chain wallet">
      {msg ? <div className="space-y-4"><p className="text-[15px] text-ink dark:text-cream-warm leading-relaxed">{msg}</p><button onClick={onClose} className="btn-primary w-full">Done</button></div> : (
        <div className="space-y-4">
          <div className="flex items-center gap-1">
            <input value={wallet} onChange={e => setWallet(e.target.value)} placeholder="0x… wallet to copy" spellCheck={false} autoComplete="off" className="flex-1 min-w-0 surface rounded-2xl px-4 min-h-[52px] text-[16px] font-mono outline-none focus:border-terracotta" />
            <ScanButton kind="evm" onAddress={setWallet} />
          </div>
          <input value={alias} onChange={e => setAlias(e.target.value)} maxLength={24} placeholder="Nickname (optional)" className="w-full surface rounded-2xl px-4 min-h-[52px] text-[16px] outline-none focus:border-terracotta" />
          <div><div className="text-[13px] muted mb-1.5">Spend each time it buys</div><div className="grid grid-cols-5 gap-1.5">{[5, 10, 25, 50, 100].map(v => <Chip key={v} on={amt === v} onClick={() => setAmt(v)}>${v}</Chip>)}</div></div>
          <div><div className="text-[13px] muted mb-1.5">Pay with</div><div className="grid grid-cols-3 gap-1.5">{(['USDT', 'USDC', 'BNB'] as const).map(a => <Chip key={a} on={pay === a} onClick={() => setPay(a)}>{a}</Chip>)}</div></div>
          <p className="text-[12.5px] muted leading-relaxed">We watch the wallet every few seconds. Only trades it makes itself are copied (not airdrops), and every buy passes our contract check — honeypots are skipped. Fee: 1% + 3% copy fee a trade, or 1% with Copy Pro / Kobocent Pro.</p>
          <ErrorNote msg={err} />
          <button onClick={go} disabled={!valid || busy} className="btn-primary w-full disabled:opacity-50">{busy ? 'Starting…' : 'Start copying'}</button>
        </div>
      )}
    </Sheet>
  );
}
