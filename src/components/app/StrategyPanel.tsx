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
 * on the server, checking every 3 seconds). Exits can land in USDC (no SOL needed) or SOL.
 *
 * Protect (2026-10-09, founder): the system's suggested levels come first (one tap); "Set my own" opens presets plus
 * one unit switch — % · × · $ · MC — for traders who think in price or market cap. Every level is shown in all three
 * (price, market cap, % from entry). Take profit, stop loss and trailing run together: on a change only the sides you
 * touch are sent and the server keeps the rest.
 */

interface Protection { status: 'watching' | 'trailing'; entryPriceUsd: number | null; takeProfitPrice: number | null; stopLossPrice: number | null; trailingPct: number | null; tokens: number | null; peakPriceUsd: number | null; exitTo: 'USDC' | 'SOL' }
interface Dca { strategy: 'FIXED_INTERVALS' | 'PRICE_DROPS'; payWith: 'SOL' | 'USDC' | 'USDT'; totalAmount: number; numberOfBuys: number; buysMade: number; amountPerBuy: number; totalSpent: number; totalTokens: number; intervalMinutes: number | null; dropPercents: number[] | null; nextBuyAt: number | null }
interface Strategies { ok: true; protection: Protection | null; dca: Dca | null; note?: string | null; market?: { priceUsd: number | null; marketCapUsd: number | null } }
interface DcaJob { id: string; status: 'running' | 'done'; result: null | ({ ok: boolean; code?: string; error?: string; firstBuyDone?: boolean } & Partial<Strategies>) }
export interface Recommended { takeProfitPrice: number | null; stopLossPrice: number | null; trailingPct: number | null; takeProfitPct: number | null; stopLossPct: number | null; riskReward: number | null; entryPrice: number | null; waitForPullback: boolean; basis: 'candles' | 'estimate'; volatilityPct: number | null }

const TP = [{ label: '+25%', v: 25 }, { label: '+50%', v: 50 }, { label: '2×', v: 100 }, { label: '3×', v: 200 }, { label: '5×', v: 400 }];
const SL = [10, 20, 30, 50];
const TRAIL = [10, 15, 20, 25];
const EVERY = [{ label: '15 min', v: 15 }, { label: '1 hour', v: 60 }, { label: '4 hours', v: 240 }, { label: 'Daily', v: 1440 }];
type Unit = '%' | '×' | '$' | 'MC';
const UNITS: Unit[] = ['%', '×', '$', 'MC'];
const UNIT_KEY = 'kc:protect-unit';

function Chip({ on, onClick, children, disabled }: { on: boolean; onClick: () => void; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-pressed={on}
      className={`min-h-[44px] rounded-xl border px-2 text-[14px] font-semibold transition-colors disabled:opacity-40 ${on ? 'border-terracotta bg-terracotta-soft text-terracotta' : 'border-cream-border dark:border-night-border text-ink dark:text-cream-warm'}`}>
      {children}
    </button>
  );
}

/** "50m", "500k", "1.2b", "0.00002" → number */
function parseNum(v: string): number | null {
  const m = v.trim().toLowerCase().match(/^(\d*\.?\d+)\s*([kmb])?$/);
  if (!m) return null;
  const n = Number(m[1]) * (m[2] === 'k' ? 1e3 : m[2] === 'm' ? 1e6 : m[2] === 'b' ? 1e9 : 1);
  return n > 0 && isFinite(n) ? n : null;
}
const signedPct = (n: number) => `${n >= 0 ? '+' : '−'}${Math.abs(n) >= 100 ? Math.round(Math.abs(n)) : Math.abs(n).toFixed(1).replace(/\.0$/, '')}%`;

export function StrategyPanel({ mint, symbol, held, priceUsd, entryPriceUsd, marketCapUsd, recommended, onChange }: { mint: string; symbol: string; held: boolean; priceUsd: number | null; entryPriceUsd: number | null; marketCapUsd?: number | null; recommended?: Recommended | null; onChange: () => void }) {
  const [s, setS] = useState<Strategies | null>(null);
  const load = useCallback(() => kc<Strategies>(`trade/strategies?mint=${mint}`).then(setS).catch(() => setS({ ok: true, protection: null, dca: null })), [mint]);
  useEffect(() => { load(); }, [load]);
  if (!s) return <div className="h-40 rounded-3xl bg-cream-warm dark:bg-night animate-pulse" />;
  const livePrice = s.market?.priceUsd || priceUsd;
  const liveMcap = s.market?.marketCapUsd || marketCapUsd || null;
  return (
    <>
      {held && <ProtectCard mint={mint} symbol={symbol} priceUsd={livePrice} marketCapUsd={liveMcap} entryPriceUsd={entryPriceUsd} recommended={recommended || null} current={s.protection} onSaved={(n) => { setS(prev => ({ ...(prev as Strategies), ...n })); onChange(); }} />}
      <DcaCard mint={mint} symbol={symbol} current={s.dca} onSaved={(n) => { setS(prev => ({ ...(prev as Strategies), ...n })); onChange(); }} />
    </>
  );
}

function ProtectCard({ mint, symbol, priceUsd, marketCapUsd, entryPriceUsd, recommended, current, onSaved }: { mint: string; symbol: string; priceUsd: number | null; marketCapUsd: number | null; entryPriceUsd: number | null; recommended: Recommended | null; current: Protection | null; onSaved: (n: Partial<Strategies>) => void }) {
  const rec = recommended && recommended.takeProfitPrice && recommended.stopLossPrice && priceUsd && recommended.stopLossPrice < priceUsd ? recommended : null;
  const [editing, setEditing] = useState(!current);
  const [mode, setMode] = useState<'suggested' | 'custom'>(rec && !current ? 'suggested' : 'custom');
  const [unit, setUnitState] = useState<Unit>('%');
  // What you're changing. Untouched sides are kept on the server (merge).
  const fresh = !current;
  const [tp, setTp] = useState<number | null>(fresh ? 100 : null);
  const [tpNone, setTpNone] = useState(false);
  const [tpCustom, setTpCustom] = useState('');
  const [tpTouched, setTpTouched] = useState(fresh);
  const [sl, setSl] = useState<number | null>(fresh ? 20 : null);
  const [slNone, setSlNone] = useState(false);
  const [slCustom, setSlCustom] = useState('');
  const [slTouched, setSlTouched] = useState(fresh);
  const [trail, setTrail] = useState<number>(current?.trailingPct || rec?.trailingPct || 15);
  const [trailTouched, setTrailTouched] = useState(fresh);
  const [trailNow, setTrailNow] = useState(false);
  const [exitTo, setExitTo] = useState<'USDC' | 'SOL'>(current?.exitTo || 'USDC');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [note, setNote] = useState('');
  useEffect(() => { setEditing(!current); }, [current]);
  useEffect(() => { try { const u = localStorage.getItem(UNIT_KEY) as Unit | null; if (u && UNITS.includes(u)) setUnitState(u); } catch { /* ignore */ } }, []);
  const setUnit = (u: Unit) => { setUnitState(u); setTpCustom(''); setSlCustom(''); try { localStorage.setItem(UNIT_KEY, u); } catch { /* ignore */ } };

  const now = priceUsd || 0;
  const base = entryPriceUsd && entryPriceUsd > 0 ? entryPriceUsd : now;
  const mcOf = (p: number | null) => (p && marketCapUsd && now ? p * (marketCapUsd / now) : null);
  const fromMc = (mc: number) => (marketCapUsd && now ? now * (mc / marketCapUsd) : null);

  // Take profit price from what's chosen
  const tpVal = tpCustom ? parseNum(tpCustom) : null;
  const tpPrice: number | null = trailNow ? now : tpNone ? null
    : tpCustom ? (tpVal == null ? null : unit === '%' ? base * (1 + tpVal / 100) : unit === '×' ? base * tpVal : unit === '$' ? tpVal : fromMc(tpVal))
    : tp != null ? base * (1 + tp / 100) : null;
  // Stop loss price — % below your entry; if you're already below that, % below today's price (as the server does)
  const slVal = slCustom ? parseNum(slCustom) : null;
  const slPct = slCustom ? (unit === '%' ? slVal : null) : sl;
  let slFromToday = false;
  let slPrice: number | null = slNone ? null
    : slPct != null && (!slCustom || unit === '%') ? base * (1 - slPct / 100)
    : slCustom && slVal != null ? (unit === '×' ? base * slVal : unit === '$' ? slVal : fromMc(slVal)) : null;
  if (slPrice != null && slPct != null && (!slCustom || unit === '%') && slPrice >= now) { slPrice = now * (1 - slPct / 100); slFromToday = true; }
  const slBad = slTouched && slPrice != null && now > 0 && slPrice >= now;
  const tpBad = tpTouched && !trailNow && tpPrice != null && slPrice != null && tpPrice <= slPrice;
  const mcMissing = unit === 'MC' && !marketCapUsd;

  // Effective levels after the change (for the summary line)
  const effTp = tpTouched ? tpPrice : current?.takeProfitPrice ?? null;
  const effSl = slTouched ? slPrice : current?.stopLossPrice ?? null;
  const nothing = !trailNow && effTp == null && effSl == null;

  function Level({ p, tone }: { p: number | null; tone?: string }) {
    if (p == null || !(p > 0)) return null;
    const mc = mcOf(p);
    return <span className="text-[12.5px] font-mono" style={{ color: tone }}>{price(p)}{mc ? ` · MC ${compact(mc)}` : ''}{base ? ` · ${signedPct((p / base - 1) * 100)}` : ''}</span>;
  }

  async function post(body: Record<string, unknown>) {
    setBusy(true); setErr(''); setNote('');
    try {
      const r = await kc<Strategies & { note?: string }>('trade/protect', { method: 'POST', body: { mint, exitTo, ...body } });
      onSaved({ protection: r.protection }); if (r.note) setNote(r.note); setEditing(false);
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not save'); }
    setBusy(false);
  }
  function saveSuggested() {
    if (!rec) return;
    post({ takeProfitPrice: rec.takeProfitPrice, stopLossPrice: rec.stopLossPrice, trailingPct: rec.trailingPct || 15 });
  }
  function saveCustom() {
    const body: Record<string, unknown> = {};
    if (trailNow) body.trailNow = true;
    else if (tpTouched) {
      if (tpNone) body.takeProfit = 'none';
      else if (tpCustom && tpVal != null) body[unit === '%' ? 'takeProfitPct' : unit === '×' ? 'takeProfitX' : unit === '$' ? 'takeProfitPrice' : 'takeProfitMcap'] = tpVal;
      else if (tp != null) body.takeProfitPct = tp;
    }
    if (slTouched) {
      if (slNone) body.stopLoss = 'none';
      else if (slCustom && slVal != null) {
        if (unit === '%') body.stopLossPct = slVal;
        else if (unit === 'MC') body.stopLossMcap = slVal;
        else body.stopLossPrice = slPrice;
      } else if (sl != null) body.stopLossPct = sl;
    }
    if (trailTouched || trailNow) body.trailingPct = trail;
    post(body);
  }
  async function cancel() {
    setBusy(true); setErr('');
    try { await kc('trade/protect/cancel', { method: 'POST', body: { mint } }); onSaved({ protection: null }); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Could not stop it'); }
    setBusy(false);
  }

  const trailChoices = Array.from(new Set([...(rec?.trailingPct ? [rec.trailingPct] : []), ...TRAIL])).sort((a, b) => a - b).slice(0, 5);
  const inputCls = 'mt-2 w-full min-h-[44px] rounded-xl border border-cream-border dark:border-night-border bg-transparent px-3.5 text-[16px] outline-none focus:border-terracotta disabled:opacity-40';
  const tpPlaceholder = unit === '%' ? 'Or your own: % above your entry' : unit === '×' ? 'Or your own: e.g. 4 (× your entry)' : unit === '$' ? 'Or your own: price, e.g. 0.00042' : 'Or your own: market cap, e.g. 5m';
  const slPlaceholder = unit === '%' ? 'Or your own: % below your entry' : unit === '×' ? 'Or your own: e.g. 0.7 (× your entry)' : unit === '$' ? 'Or your own: price' : 'Or your own: market cap, e.g. 800k';

  return (
    <section className="surface rounded-3xl p-5" aria-label={`Protect ${symbol}`}>
      <div className="flex items-center gap-2.5">
        <span className="grid place-items-center h-10 w-10 rounded-xl bg-terracotta-soft text-terracotta"><IconShield size={20} /></span>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-[16px] text-ink dark:text-cream-warm">Protect your {symbol}</h2>
          <p className="text-[12.5px] muted">Checked every few seconds, 24/7 — even when your phone is off.</p>
        </div>
      </div>

      {current && !editing ? (
        <div className="mt-4">
          <div className="rounded-2xl bg-cream-warm dark:bg-night p-4 space-y-1.5 text-[14px]">
            <div className="flex justify-between"><span className="muted">Status</span><span className="font-semibold" style={{ color: current.status === 'trailing' ? '#58834C' : undefined }}>{current.status === 'trailing' ? 'Trailing — target reached' : 'Watching'}</span></div>
            {current.takeProfitPrice != null && <div className="flex justify-between gap-3"><span className="muted shrink-0">Take profit</span><Level p={current.takeProfitPrice} /></div>}
            {current.trailingPct != null && current.takeProfitPrice != null && <div className="flex justify-between"><span className="muted">Then sells when it falls</span><span className="font-mono">{current.trailingPct}% from the peak</span></div>}
            {current.stopLossPrice != null && <div className="flex justify-between gap-3"><span className="muted shrink-0">Stop loss</span><Level p={current.stopLossPrice} tone="#B84A40" /></div>}
            <div className="flex justify-between"><span className="muted">Sells into</span><span className="font-semibold">{current.exitTo}</span></div>
          </div>
          {note && <p className="text-[12.5px] muted mt-2">{note}</p>}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button onClick={() => { setEditing(true); setMode('custom'); }} className="btn-ghost min-h-[48px]">Change</button>
            <button onClick={cancel} disabled={busy} className="min-h-[48px] rounded-2xl border border-[#B84A40]/40 text-[#B84A40] font-semibold disabled:opacity-50">{busy ? 'Stopping…' : 'Stop protecting'}</button>
          </div>
        </div>
      ) : mode === 'suggested' && rec ? (
        <div className="mt-4 space-y-3">
          <div className="rounded-2xl border border-terracotta/30 bg-terracotta-soft/40 p-4 space-y-2 text-[14px]">
            <div className="text-[12.5px] font-semibold text-terracotta">Suggested for {symbol}</div>
            <div className="flex justify-between gap-3"><span className="muted shrink-0">Take profit</span><Level p={rec.takeProfitPrice} tone="#58834C" /></div>
            <div className="flex justify-between gap-3"><span className="muted shrink-0">Then trail</span><span className="font-mono text-[12.5px]">{rec.trailingPct}% below the peak</span></div>
            <div className="flex justify-between gap-3"><span className="muted shrink-0">Stop loss</span><Level p={rec.stopLossPrice} tone="#B84A40" /></div>
            <p className="text-[12px] muted leading-relaxed pt-1">
              {rec.basis === 'candles' ? 'From the last 8 hours of 5-minute price action: the stop sits under the recent low, the target' : 'Estimated from volatility: the target'}
              {rec.riskReward ? ` aims for ${rec.riskReward}× what the stop risks` : ''}, and the trail is sized to how much {symbol} usually swings.
            </p>
          </div>
          <ErrorNote msg={err} className="text-[14px] text-[#B84A40]" />
          <button onClick={saveSuggested} disabled={busy} className="btn-primary w-full min-h-[52px] disabled:opacity-40">{busy ? 'Saving…' : 'Protect with these'}</button>
          <button onClick={() => setMode('custom')} className="btn-ghost w-full min-h-[44px]">Set my own levels</button>
          <p className="text-[11.5px] muted">Suggestions read market data — never guarantees. 1% fee on the sale.</p>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[12.5px] muted min-w-0">From {entryPriceUsd ? <>your entry <b className="text-ink dark:text-cream-warm font-mono">{price(entryPriceUsd)}</b></> : <>today’s price</>} · now <span className="font-mono">{price(priceUsd)}</span>{marketCapUsd ? <> · MC <span className="font-mono">{compact(marketCapUsd)}</span></> : null}</p>
          </div>
          <div role="radiogroup" aria-label="Set levels in" className="grid grid-cols-4 rounded-xl bg-cream-warm dark:bg-night p-1">
            {UNITS.map(u => (
              <button key={u} type="button" role="radio" aria-checked={unit === u} onClick={() => setUnit(u)}
                className={`min-h-[40px] rounded-lg text-[13.5px] font-semibold ${unit === u ? 'bg-white dark:bg-night-card text-terracotta shadow-sm' : 'muted'}`}>{u === '$' ? 'Price' : u}</button>
            ))}
          </div>
          {mcMissing && <p className="text-[12.5px] text-[#B68B2A]">Market cap isn’t available for this token right now — use %, × or price.</p>}

          <div>
            <div className="flex items-baseline justify-between gap-3"><span className="text-[14px] font-semibold text-ink dark:text-cream-warm shrink-0">Take profit</span>{tpTouched ? <Level p={tpPrice} tone="#58834C" /> : current?.takeProfitPrice ? <span className="text-[12px] muted">keeps {price(current.takeProfitPrice)}</span> : null}</div>
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              {TP.map(o => <Chip key={o.v} on={tpTouched && !trailNow && !tpNone && !tpCustom && tp === o.v} disabled={trailNow} onClick={() => { setTp(o.v); setTpNone(false); setTpCustom(''); setTpTouched(true); }}>{o.label}</Chip>)}
              <Chip on={tpTouched && tpNone && !trailNow} disabled={trailNow} onClick={() => { setTpNone(true); setTpCustom(''); setTpTouched(true); }}>None</Chip>
            </div>
            <input value={tpCustom} onChange={e => { setTpCustom(e.target.value.replace(/[^\d.kmbKMB]/g, '').slice(0, 14)); setTpNone(false); setTpTouched(true); }} disabled={trailNow || mcMissing} inputMode="decimal" placeholder={tpPlaceholder} aria-label="Your own take profit" className={inputCls} />
            <label className="mt-2 flex items-center justify-between gap-3 min-h-[44px] text-[14px]">
              <span>Start trailing now<span className="block text-[12px] muted">No target — lock in gains from today’s price.</span></span>
              <input type="checkbox" checked={trailNow} onChange={e => { setTrailNow(e.target.checked); setTpTouched(true); }} className="h-6 w-6 shrink-0 accent-[#C1502E]" />
            </label>
          </div>

          <div>
            <div className="text-[14px] font-semibold text-ink dark:text-cream-warm">Then trail <span className="font-normal muted text-[12.5px]">— sell when it falls this far from its peak</span></div>
            <div className={`mt-2 grid gap-1.5 ${trailChoices.length === 5 ? 'grid-cols-5' : 'grid-cols-4'}`}>
              {trailChoices.map(v => <Chip key={v} on={trail === v} onClick={() => { setTrail(v); setTrailTouched(true); }}>{v}%{rec?.trailingPct === v ? <span className="block text-[10px] font-normal leading-none mt-0.5">suggested</span> : null}</Chip>)}
            </div>
          </div>

          <div>
            <div className="flex items-baseline justify-between gap-3"><span className="text-[14px] font-semibold text-ink dark:text-cream-warm shrink-0">Stop loss</span>{slTouched ? <Level p={slPrice} tone="#B84A40" /> : current?.stopLossPrice ? <span className="text-[12px] muted">keeps {price(current.stopLossPrice)}</span> : null}</div>
            <div className="mt-2 grid grid-cols-5 gap-1.5">
              {SL.map(v => <Chip key={v} on={slTouched && !slNone && !slCustom && sl === v} onClick={() => { setSl(v); setSlNone(false); setSlCustom(''); setSlTouched(true); }}>−{v}%</Chip>)}
              <Chip on={slTouched && slNone} onClick={() => { setSlNone(true); setSlCustom(''); setSlTouched(true); }}>None</Chip>
            </div>
            <input value={slCustom} onChange={e => { setSlCustom(e.target.value.replace(/[^\d.kmbKMB]/g, '').slice(0, 14)); setSlNone(false); setSlTouched(true); }} disabled={mcMissing} inputMode="decimal" placeholder={slPlaceholder} aria-label="Your own stop loss" className={inputCls} />
            {slFromToday && !slBad && <p className="text-[12px] muted mt-1">You’re already below that from your entry, so it’s measured from today’s price.</p>}
            {slBad && <p className="text-[12.5px] text-[#B84A40] mt-1">That’s at or above today’s price — it would sell straight away. Choose a lower stop.</p>}
            {tpBad && <p className="text-[12.5px] text-[#B84A40] mt-1">The take profit must be above the stop loss.</p>}
          </div>

          <div>
            <div className="text-[14px] font-semibold text-ink dark:text-cream-warm">When it sells, put the money in</div>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              <Chip on={exitTo === 'USDC'} onClick={() => setExitTo('USDC')}>USDC · no SOL needed</Chip>
              <Chip on={exitTo === 'SOL'} onClick={() => setExitTo('SOL')}>SOL</Chip>
            </div>
          </div>

          {current && <p className="text-[12px] muted">Only what you change is updated — anything you leave stays as it is.</p>}
          <ErrorNote msg={err} className="text-[14px] text-[#B84A40]" />
          <div className="grid grid-cols-1 gap-2">
            <button onClick={saveCustom} disabled={busy || slBad || tpBad || nothing || (!current && !tpTouched && !slTouched && !trailNow) || (current != null && !tpTouched && !slTouched && !trailTouched && exitTo === current.exitTo)} className="btn-primary min-h-[52px] disabled:opacity-40">{busy ? 'Saving…' : current ? 'Save changes' : `Protect ${symbol}`}</button>
            {rec && !current && <button onClick={() => setMode('suggested')} className="btn-ghost min-h-[44px]">Use the suggested levels</button>}
            {current && <button onClick={() => setEditing(false)} className="btn-ghost min-h-[44px]">Cancel</button>}
          </div>
          <p className="text-[11.5px] muted">Fast markets can move past a level before the sale lands — a stop loss limits losses, it can’t guarantee the exact price. 1% fee on the sale.</p>
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
