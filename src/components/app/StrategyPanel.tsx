'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { kc, KcError } from '@/lib/kc';
import { ErrorNote } from './ErrorNote';
import { newKey } from './money';
import { IconShield } from './Icons';
import { price, compact, tokenAmount } from './trade';

/**
 * Trade T3 (2026-10-09): protect a position and DCA, on the token page. Backend /trade/strategies, /trade/protect,
 * /trade/dca (src/services/trading.js → the same TrailingProfitManager and DCAManager Telegram uses; they run 24/7
 * on the server). Percentages are from your entry price. Exits can land in USDC (no SOL needed) or SOL.
 */

interface Protection { status: 'watching' | 'trailing'; entryPriceUsd: number | null; takeProfitPrice: number | null; stopLossPrice: number | null; trailingPct: number | null; tokens: number | null; peakPriceUsd: number | null; exitTo: 'USDC' | 'SOL' }
interface Dca { strategy: 'FIXED_INTERVALS' | 'PRICE_DROPS'; payWith: 'SOL' | 'USDC' | 'USDT'; totalAmount: number; numberOfBuys: number; buysMade: number; amountPerBuy: number; totalSpent: number; totalTokens: number; intervalMinutes: number | null; dropPercents: number[] | null; nextBuyAt: number | null }
interface Strategies { ok: true; protection: Protection | null; dca: Dca | null; note?: string | null }
interface DcaJob { id: string; status: 'running' | 'done'; result: null | ({ ok: boolean; code?: string; error?: string; firstBuyDone?: boolean } & Partial<Strategies>) }

const TP = [{ label: '+25%', v: 25 }, { label: '+50%', v: 50 }, { label: '2×', v: 100 }, { label: '3×', v: 200 }, { label: '5×', v: 400 }];
const SL = [10, 20, 30, 50];
const TRAIL = [10, 15, 20, 25];
const EVERY = [{ label: '15 min', v: 15 }, { label: '1 hour', v: 60 }, { label: '4 hours', v: 240 }, { label: 'Daily', v: 1440 }];

function Chip({ on, onClick, children, disabled }: { on: boolean; onClick: () => void; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-pressed={on}
      className={`min-h-[44px] rounded-xl border px-2 text-[14px] font-semibold transition-colors disabled:opacity-40 ${on ? 'border-terracotta bg-terracotta-soft text-terracotta' : 'border-cream-border dark:border-night-border text-ink dark:text-cream-warm'}`}>
      {children}
    </button>
  );
}

export function StrategyPanel({ mint, symbol, held, priceUsd, entryPriceUsd, onChange }: { mint: string; symbol: string; held: boolean; priceUsd: number | null; entryPriceUsd: number | null; onChange: () => void }) {
  const [s, setS] = useState<Strategies | null>(null);
  const load = useCallback(() => kc<Strategies>(`trade/strategies?mint=${mint}`).then(setS).catch(() => setS({ ok: true, protection: null, dca: null })), [mint]);
  useEffect(() => { load(); }, [load]);
  if (!s) return <div className="h-40 rounded-3xl bg-cream-warm dark:bg-night animate-pulse" />;
  return (
    <>
      {held && <ProtectCard mint={mint} symbol={symbol} priceUsd={priceUsd} entryPriceUsd={entryPriceUsd} current={s.protection} onSaved={(n) => { setS(prev => ({ ...(prev as Strategies), ...n })); onChange(); }} />}
      <DcaCard mint={mint} symbol={symbol} current={s.dca} onSaved={(n) => { setS(prev => ({ ...(prev as Strategies), ...n })); onChange(); }} />
    </>
  );
}

function ProtectCard({ mint, symbol, priceUsd, entryPriceUsd, current, onSaved }: { mint: string; symbol: string; priceUsd: number | null; entryPriceUsd: number | null; current: Protection | null; onSaved: (n: Partial<Strategies>) => void }) {
  const [editing, setEditing] = useState(!current);
  const [tp, setTp] = useState<number | null>(100);
  const [tpCustom, setTpCustom] = useState('');
  const [sl, setSl] = useState<number | null>(20);
  const [slCustom, setSlCustom] = useState('');
  const [trail, setTrail] = useState(15);
  const [trailNow, setTrailNow] = useState(false);
  const [exitTo, setExitTo] = useState<'USDC' | 'SOL'>('USDC');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [note, setNote] = useState('');
  useEffect(() => { setEditing(!current); }, [current]);

  const base = entryPriceUsd && entryPriceUsd > 0 ? entryPriceUsd : priceUsd;
  const tpPct = tpCustom ? Number(tpCustom) : tp;
  const slPct = slCustom ? Number(slCustom) : sl;
  const tpPrice = base && tpPct ? base * (1 + tpPct / 100) : null;
  const slPrice = base && slPct ? base * (1 - slPct / 100) : null;
  const slBad = slPrice != null && priceUsd != null && slPrice >= priceUsd;

  async function save() {
    setBusy(true); setErr(''); setNote('');
    try {
      const r = await kc<Strategies & { note?: string }>('trade/protect', { method: 'POST', body: {
        mint, takeProfitPct: trailNow ? null : tpPct || null, stopLossPct: slPct || null, trailingPct: trail, trailNow, exitTo } });
      onSaved({ protection: r.protection }); if (r.note) setNote(r.note); setEditing(false);
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not save'); }
    setBusy(false);
  }
  async function cancel() {
    setBusy(true); setErr('');
    try { await kc('trade/protect/cancel', { method: 'POST', body: { mint } }); onSaved({ protection: null }); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Could not stop it'); }
    setBusy(false);
  }

  return (
    <section className="surface rounded-3xl p-5" aria-label={`Protect ${symbol}`}>
      <div className="flex items-center gap-2.5">
        <span className="grid place-items-center h-10 w-10 rounded-xl bg-terracotta-soft text-terracotta"><IconShield size={20} /></span>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-[16px] text-ink dark:text-cream-warm">Protect your {symbol}</h2>
          <p className="text-[12.5px] muted">Runs 24/7 — even when your phone is off.</p>
        </div>
      </div>

      {current && !editing ? (
        <div className="mt-4">
          <div className="rounded-2xl bg-cream-warm dark:bg-night p-4 space-y-1.5 text-[14px]">
            <div className="flex justify-between"><span className="muted">Status</span><span className="font-semibold" style={{ color: current.status === 'trailing' ? '#58834C' : undefined }}>{current.status === 'trailing' ? 'Trailing — target reached' : 'Watching'}</span></div>
            {current.takeProfitPrice != null && <div className="flex justify-between"><span className="muted">Take profit at</span><span className="font-mono">{price(current.takeProfitPrice)}</span></div>}
            {current.trailingPct != null && current.takeProfitPrice != null && <div className="flex justify-between"><span className="muted">Then sells when it falls</span><span className="font-mono">{current.trailingPct}% from the peak</span></div>}
            {current.stopLossPrice != null && <div className="flex justify-between"><span className="muted">Stop loss at</span><span className="font-mono" style={{ color: '#B84A40' }}>{price(current.stopLossPrice)}</span></div>}
            <div className="flex justify-between"><span className="muted">Sells into</span><span className="font-semibold">{current.exitTo}</span></div>
          </div>
          {note && <p className="text-[12.5px] muted mt-2">{note}</p>}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button onClick={() => setEditing(true)} className="btn-ghost min-h-[48px]">Change</button>
            <button onClick={cancel} disabled={busy} className="min-h-[48px] rounded-2xl border border-[#B84A40]/40 text-[#B84A40] font-semibold disabled:opacity-50">{busy ? 'Stopping…' : 'Stop protecting'}</button>
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <p className="text-[12.5px] muted">Measured from {entryPriceUsd ? <>your entry, <b className="text-ink dark:text-cream-warm font-mono">{price(entryPriceUsd)}</b></> : <>today’s price, <b className="font-mono">{price(priceUsd)}</b></>}. Today: <span className="font-mono">{price(priceUsd)}</span></p>

          <div>
            <div className="flex items-baseline justify-between"><span className="text-[14px] font-semibold text-ink dark:text-cream-warm">Take profit</span>{tpPrice && !trailNow && <span className="text-[12.5px] muted font-mono">at {price(tpPrice)}</span>}</div>
            <div className="mt-2 grid grid-cols-5 gap-1.5">
              {TP.map(o => <Chip key={o.v} on={!trailNow && !tpCustom && tp === o.v} disabled={trailNow} onClick={() => { setTp(tp === o.v ? null : o.v); setTpCustom(''); }}>{o.label}</Chip>)}
            </div>
            <input value={tpCustom} onChange={e => setTpCustom(e.target.value.replace(/[^\d.]/g, '').slice(0, 6))} disabled={trailNow} inputMode="decimal" placeholder="Or your own: % above your entry"
              className="mt-2 w-full min-h-[44px] rounded-xl border border-cream-border dark:border-night-border bg-transparent px-3.5 text-[16px] outline-none focus:border-terracotta disabled:opacity-40" />
            <label className="mt-2 flex items-center justify-between gap-3 min-h-[44px] text-[14px]">
              <span>Start trailing now<span className="block text-[12px] muted">No target — lock in gains from today’s price.</span></span>
              <input type="checkbox" checked={trailNow} onChange={e => setTrailNow(e.target.checked)} className="h-6 w-6 shrink-0 accent-[#C1502E]" />
            </label>
          </div>

          <div>
            <div className="text-[14px] font-semibold text-ink dark:text-cream-warm">Then trail <span className="font-normal muted text-[12.5px]">— sell when it falls this far from its peak</span></div>
            <div className="mt-2 grid grid-cols-4 gap-1.5">{TRAIL.map(v => <Chip key={v} on={trail === v} onClick={() => setTrail(v)}>{v}%</Chip>)}</div>
          </div>

          <div>
            <div className="flex items-baseline justify-between"><span className="text-[14px] font-semibold text-ink dark:text-cream-warm">Stop loss</span>{slPrice && <span className="text-[12.5px] font-mono" style={{ color: slBad ? '#B84A40' : undefined }}>at {price(slPrice)}</span>}</div>
            <div className="mt-2 grid grid-cols-5 gap-1.5">
              {SL.map(v => <Chip key={v} on={!slCustom && sl === v} onClick={() => { setSl(sl === v ? null : v); setSlCustom(''); }}>−{v}%</Chip>)}
              <Chip on={!slCustom && sl === null} onClick={() => { setSl(null); setSlCustom(''); }}>None</Chip>
            </div>
            <input value={slCustom} onChange={e => setSlCustom(e.target.value.replace(/[^\d.]/g, '').slice(0, 5))} inputMode="decimal" placeholder="Or your own: % below your entry"
              className="mt-2 w-full min-h-[44px] rounded-xl border border-cream-border dark:border-night-border bg-transparent px-3.5 text-[16px] outline-none focus:border-terracotta" />
            {slBad && <p className="text-[12.5px] text-[#B84A40] mt-1">That’s above today’s price — it would sell straight away. Choose a lower stop.</p>}
          </div>

          <div>
            <div className="text-[14px] font-semibold text-ink dark:text-cream-warm">When it sells, put the money in</div>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              <Chip on={exitTo === 'USDC'} onClick={() => setExitTo('USDC')}>USDC · no SOL needed</Chip>
              <Chip on={exitTo === 'SOL'} onClick={() => setExitTo('SOL')}>SOL</Chip>
            </div>
          </div>

          <ErrorNote msg={err} className="text-[14px] text-[#B84A40]" />
          <div className="grid grid-cols-1 gap-2">
            <button onClick={save} disabled={busy || slBad || (!trailNow && !tpPct && !slPct)} className="btn-primary min-h-[52px] disabled:opacity-40">{busy ? 'Saving…' : current ? 'Save changes' : `Protect ${symbol}`}</button>
            {current && <button onClick={() => setEditing(false)} className="btn-ghost min-h-[44px]">Cancel</button>}
          </div>
          <p className="text-[11.5px] muted">Prices are checked on a schedule, and fast markets can move past a level before the sale lands — a stop loss limits losses, it can’t guarantee the exact price. 1% fee on the sale.</p>
        </div>
      )}
    </section>
  );
}

function DcaCard({ mint, symbol, current, onSaved }: { mint: string; symbol: string; current: Dca | null; onSaved: (n: Partial<Strategies>) => void }) {
  const [open, setOpen] = useState(false);
  const [payWith, setPayWith] = useState<'USDC' | 'USDT' | 'SOL'>('USDC');
  const [total, setTotal] = useState('50');
  const [buys, setBuys] = useState(5);
  const [mode, setMode] = useState<'interval' | 'dips'>('interval');
  const [every, setEvery] = useState(60);
  const [step, setStep] = useState(5);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const keyRef = useRef(newKey());
  const t = Number(total) || 0;
  const per = buys > 0 ? t / buys : 0;
  const unit = payWith === 'SOL' ? 'SOL' : '$';

  async function start() {
    setBusy(true); setErr('');
    try {
      let j = await kc<DcaJob>('trade/dca', { method: 'POST', body: { mint, payWith, total: t, buys, strategy: mode, intervalMinutes: every, dropStep: step, idempotencyKey: keyRef.current } });
      for (let i = 0; i < 60 && j.status !== 'done'; i++) { await new Promise(r => setTimeout(r, 1500)); try { j = await kc<DcaJob>(`trade/jobs/${j.id}`); } catch (e) { if (e instanceof KcError && e.status === 404) break; } }
      const r = j.result;
      if (r?.ok) { onSaved({ dca: r.dca ?? null }); setOpen(false); keyRef.current = newKey(); }
      else setErr(r?.error || 'The DCA didn’t start');
    } catch (e) { setErr(e instanceof Error ? e.message : 'The DCA didn’t start'); keyRef.current = newKey(); }
    setBusy(false);
  }
  async function stop() {
    setBusy(true); setErr('');
    try { await kc('trade/dca/cancel', { method: 'POST', body: { mint } }); onSaved({ dca: null }); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Could not stop it'); }
    setBusy(false);
  }

  return (
    <section className="surface rounded-3xl p-5" aria-label={`DCA into ${symbol}`}>
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between gap-3 text-left min-h-[44px]" aria-expanded={open || !!current}>
        <div>
          <h2 className="font-semibold text-[16px] text-ink dark:text-cream-warm">Buy over time (DCA)</h2>
          <p className="text-[12.5px] muted">Spread your buys — on a schedule or on the dips.</p>
        </div>
        {!current && <span className="text-[13px] font-semibold text-terracotta">{open ? 'Close' : 'Set up'}</span>}
      </button>

      {current ? (
        <div className="mt-3">
          <div className="rounded-2xl bg-cream-warm dark:bg-night p-4 text-[14px] space-y-1.5">
            <div className="flex justify-between"><span className="muted">Progress</span><span className="font-semibold">{current.buysMade} of {current.numberOfBuys} buys</span></div>
            <div className="h-2 rounded-full bg-white dark:bg-night-card overflow-hidden"><div className="h-full bg-terracotta rounded-full" style={{ width: `${(current.buysMade / current.numberOfBuys) * 100}%` }} /></div>
            <div className="flex justify-between"><span className="muted">Spent</span><span className="font-mono">{current.payWith === 'SOL' ? `${Number(current.totalSpent).toFixed(4)} SOL` : compact(current.totalSpent)} of {current.payWith === 'SOL' ? `${current.totalAmount} SOL` : compact(current.totalAmount)}</span></div>
            <div className="flex justify-between"><span className="muted">Bought</span><span className="font-mono">{tokenAmount(Number(current.totalTokens) || 0)} {symbol}</span></div>
            <div className="flex justify-between"><span className="muted">Next</span><span>{current.strategy === 'PRICE_DROPS' ? `at −${current.dropPercents?.[current.buysMade] ?? '—'}%` : current.nextBuyAt ? new Date(current.nextBuyAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : '—'}</span></div>
          </div>
          <button onClick={stop} disabled={busy} className="mt-3 w-full min-h-[48px] rounded-2xl border border-[#B84A40]/40 text-[#B84A40] font-semibold disabled:opacity-50">{busy ? 'Stopping…' : 'Stop DCA'}</button>
          <ErrorNote msg={err} className="mt-2 text-[14px] text-[#B84A40]" />
        </div>
      ) : open && (
        <div className="mt-3 space-y-4">
          <div>
            <div className="text-[13px] muted mb-1.5">Pay with</div>
            <div className="grid grid-cols-3 gap-1.5">{(['USDC', 'USDT', 'SOL'] as const).map(a => <Chip key={a} on={payWith === a} onClick={() => { setPayWith(a); setTotal(a === 'SOL' ? '0.2' : '50'); }}>{a}</Chip>)}</div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block"><span className="text-[13px] muted">Total to invest ({unit})</span>
              <input value={total} onChange={e => setTotal(e.target.value.replace(/[^\d.]/g, '').slice(0, 10))} inputMode="decimal" className="mt-1 w-full min-h-[48px] rounded-xl border border-cream-border dark:border-night-border bg-transparent px-3.5 text-[16px] font-mono outline-none focus:border-terracotta" /></label>
            <div><span className="text-[13px] muted">Number of buys</span>
              <div className="mt-1 flex items-center gap-2">
                <button onClick={() => setBuys(b => Math.max(2, b - 1))} className="h-12 w-12 rounded-xl border border-cream-border dark:border-night-border text-[20px]" aria-label="Fewer buys">−</button>
                <span className="flex-1 text-center font-semibold text-[18px]">{buys}</span>
                <button onClick={() => setBuys(b => Math.min(10, b + 1))} className="h-12 w-12 rounded-xl border border-cream-border dark:border-night-border text-[20px]" aria-label="More buys">+</button>
              </div></div>
          </div>
          <div>
            <div className="grid grid-cols-2 gap-1.5">
              <Chip on={mode === 'interval'} onClick={() => setMode('interval')}>On a schedule</Chip>
              <Chip on={mode === 'dips'} onClick={() => setMode('dips')}>On the dips</Chip>
            </div>
            {mode === 'interval'
              ? <div className="mt-2 grid grid-cols-4 gap-1.5">{EVERY.map(o => <Chip key={o.v} on={every === o.v} onClick={() => setEvery(o.v)}>{o.label}</Chip>)}</div>
              : <div className="mt-2"><div className="text-[12.5px] muted mb-1.5">Buy again every time it drops another</div><div className="grid grid-cols-4 gap-1.5">{[3, 5, 10, 15].map(v => <Chip key={v} on={step === v} onClick={() => setStep(v)}>{v}%</Chip>)}</div></div>}
          </div>
          <p className="text-[13px] text-ink dark:text-cream-warm">
            {buys} buys of <b className="font-mono">{payWith === 'SOL' ? `${per.toFixed(4)} SOL` : `$${per.toFixed(2)}`}</b> {mode === 'interval' ? `— the first now, then every ${EVERY.find(o => o.v === every)?.label.toLowerCase()}` : `— the first now, then at −${step}%, −${step * 2}%, … from today’s price`}.
            {payWith !== 'SOL' && per > 0 && per < 5 && <span className="block text-[#B84A40] mt-1">Each buy must be at least $5.</span>}
          </p>
          <ErrorNote msg={err} className="text-[14px] text-[#B84A40]" />
          <button onClick={start} disabled={busy || !(t > 0) || (payWith !== 'SOL' && per < 5)} className="btn-primary w-full min-h-[52px] disabled:opacity-40">{busy ? 'Starting — first buy…' : 'Start DCA'}</button>
          <p className="text-[11.5px] muted">1% fee on each buy. You can stop it any time; tokens already bought stay yours.</p>
        </div>
      )}
    </section>
  );
}
