'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { kc, KcError } from '@/lib/kc';
import { Sheet } from './ui';
import { ErrorNote } from './ErrorNote';
import { newKey, store, read, HoldToConfirm, Outcome } from './money';
import { IconBolt } from './Icons';
import { price, compact, signedUsd, pct, tokenAmount, pnlColor, readCache } from './trade';

/**
 * Buy / sell on a token page — Trade T2a (2026-10-09). Backend POST /trade/quote + /trade/execute
 * (src/services/trading.js → the same tradingEngine calls as Telegram: 1% fee, Ultra +3% unless subscribed).
 * T2a: buy with SOL / sell to SOL, Normal or Ultra. T2b (2026-10-09): pay with USDC or USDT and sell to USDC —
 * no SOL needed (src/trading/stableTrade.js: the treasury pays gas and opens token accounts). Either rail works.
 */

type Side = 'buy' | 'sell';
type Mode = 'normal' | 'ultra';
type Asset = 'SOL' | 'USDC' | 'USDT';
interface Fees { platformPct: number; ultraPct: number; totalPct: number; totalSol: number; totalUsd: number | null }
interface Ultra { subscribed: boolean; daysLeft: number; plan: string | null }
interface BuyQuote { side: 'buy'; rail?: 'stable'; payWith?: Asset; gasless?: boolean; needsAccount?: boolean; mode: Mode; symbol: string; sol: number | null; usd: number; tokensOut: number; priceUsd: number | null; priceImpactPct: number; slippagePct: number; fees: Fees; ultra: Ultra; maxSol?: number; maxUsd: number; solPrice?: number }
interface SellQuote { side: 'sell'; rail?: 'stable'; receive?: Asset; gasless?: boolean; mode: Mode; symbol: string; tokens: number; percent: number | null; heldTokens: number; all: boolean; solOut: number | null; netSol: number | null; netUsd?: number; usdOut: number | null; priceImpactPct: number; slippagePct: number; fees: Fees; pnl: { entryPriceUsd: number; usd: number | null; pct: number | null } | null; ultra: Ultra; solPrice: number | null }
type Quote = BuyQuote | SellQuote;
interface TradeResult { ok: boolean; code?: string; error?: string; side?: Side; mode?: Mode; symbol?: string; signature?: string | null; payWith?: Asset; receive?: Asset; spentSol?: number; spentUsd?: number | null; tokens?: number; priceUsd?: number | null; receivedSol?: number | null; receivedUsd?: number | null; pnlUsd?: number | null; pnlPct?: number | null; all?: boolean; maxUsd?: number; maxSol?: number }
interface Cash { sol: { amount: number; usd: number | null }; usdc: { amount: number }; usdt: { amount: number } }
interface Job { id: string; status: 'running' | 'done'; stage: string; meta: { side: Side; mint: string; mode: Mode }; result: TradeResult | null }

const BUY_PICKS = [5, 10, 25, 50];
const SELL_PICKS = [25, 50, 100];
const jobKey = (mint: string) => `kc-trade-job-${mint}`;

export function TradePanel({ mint, symbol, held, onDone }: { mint: string; symbol: string; held: boolean; onDone: () => void }) {
  const [side, setSide] = useState<Side>('buy');
  const [mode, setMode] = useState<Mode>('normal');
  const [unit, setUnit] = useState<'USD' | 'SOL'>('USD');
  const [amt, setAmt] = useState('');
  const [percent, setPercent] = useState<number | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [qErr, setQErr] = useState('');
  const [qMax, setQMax] = useState<{ usd?: number; sol?: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [review, setReview] = useState(false);
  const [starting, setStarting] = useState(false);
  const [startErr, setStartErr] = useState('');
  const [jobId, setJobId] = useState<string | null>(null);
  const keyRef = useRef(newKey());
  // What you pay with (buys) / receive (sells). Default: the stablecoin you hold, else SOL (2026-10-09).
  const [cash, setCash] = useState<Cash | null>(null);
  const [payWith, setPayWith] = useState<Asset>('USDC');
  const [receive, setReceive] = useState<Asset>('USDC');
  const [picked, setPicked] = useState(false);

  useEffect(() => { const s = read(jobKey(mint)); if (s) setJobId(s); }, [mint]);
  useEffect(() => { setAmt(''); setPercent(null); setQuote(null); setQErr(''); setQMax(null); }, [side]);
  useEffect(() => {
    const apply = (c: Cash) => {
      setCash(c);
      if (picked) return;
      setPayWith(c.usdc.amount >= 5 ? 'USDC' : c.usdt.amount >= 5 ? 'USDT' : (c.sol.usd ?? 0) >= 1 ? 'SOL' : 'USDC');
    };
    const cached = readCache<{ cash: Cash }>('home'); if (cached?.cash) apply(cached.cash);
    kc<{ cash: Cash }>('trade').then(r => { if (r?.cash) apply(r.cash); }).catch(() => {});
  }, [picked]);
  const stableRail = side === 'buy' ? payWith !== 'SOL' : receive !== 'SOL';
  useEffect(() => { if (stableRail) { setMode('normal'); setUnit('USD'); } }, [stableRail]);

  const value = Number(amt) || 0;
  const hasInput = side === 'buy' ? value > 0 : (percent !== null || value > 0);
  useEffect(() => {
    setQErr(''); setQMax(null);
    if (!hasInput) { setQuote(null); return; }
    let live = true; setBusy(true);
    const body = side === 'buy' ? { side, mint, mode, amount: value, unit, payWith } : { side, mint, mode, receive, ...(percent !== null ? { percent } : { tokens: value }) };
    const t = setTimeout(() => {
      kc<Quote>('trade/quote', { method: 'POST', body })
        .then(q => { if (live) setQuote(q); })
        .catch(e => {
          if (!live) return;
          setQuote(null);
          setQErr(e instanceof Error ? e.message : 'No quote right now');
          const d = e instanceof KcError ? (e.data as { maxUsd?: number; maxSol?: number } | undefined) : undefined;
          if (d && (d.maxUsd || d.maxSol)) setQMax({ usd: d.maxUsd, sol: d.maxSol });
        })
        .finally(() => { if (live) setBusy(false); });
    }, 450);
    return () => { live = false; clearTimeout(t); };
  }, [side, mint, mode, unit, value, percent, hasInput, payWith, receive]);

  async function start() {
    if (!quote) return;
    setStarting(true); setStartErr('');
    const sq = quote as SellQuote;
    const body = side === 'buy'
      ? { side, mint, mode, amount: value, unit, payWith, expectTokens: (quote as BuyQuote).tokensOut, idempotencyKey: keyRef.current }
      : { side, mint, mode, receive, ...(percent !== null ? { percent } : { tokens: value }), ...(sq.rail === 'stable' ? { expectUsd: sq.netUsd } : { expectSol: sq.netSol }), idempotencyKey: keyRef.current };
    try {
      const job = await kc<Job>('trade/execute', { method: 'POST', body });
      setReview(false); store(jobKey(mint), job.id); setJobId(job.id);
    } catch (e) { setStartErr(e instanceof Error ? e.message : 'Could not start the trade'); keyRef.current = newKey(); }
    finally { setStarting(false); }
  }
  function finish() { store(jobKey(mint), null); setJobId(null); setAmt(''); setPercent(null); setQuote(null); keyRef.current = newKey(); onDone(); }

  if (jobId) return <TradeProgress jobId={jobId} symbol={symbol} onFinish={finish} />;

  const ultra = quote?.ultra;
  const ultraLabel = ultra?.subscribed ? `Included · ${ultra.daysLeft} day${ultra.daysLeft === 1 ? '' : 's'} left` : '+3% per trade';
  return (
    <section className="surface rounded-3xl p-5 space-y-4" aria-label={`Trade ${symbol}`}>
      {/* Buy / Sell */}
      <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-cream-warm dark:bg-night" role="tablist">
        {(['buy', 'sell'] as Side[]).map(s => (
          <button key={s} role="tab" aria-selected={side === s} onClick={() => setSide(s)} disabled={s === 'sell' && !held}
            className="min-h-[46px] rounded-xl font-semibold text-[15px] transition-colors disabled:opacity-40"
            style={side === s ? { background: s === 'buy' ? '#58834C' : '#B84A40', color: '#fff' } : undefined}>
            {s === 'buy' ? `Buy ${symbol}` : `Sell ${symbol}`}
          </button>
        ))}
      </div>

      {/* Pay with / Receive — SOL or stablecoins, both work */}
      <div>
        <div className="text-[13px] muted mb-1.5">{side === 'buy' ? 'Pay with' : 'Receive'}</div>
        <div className={`grid gap-2 ${side === 'buy' ? 'grid-cols-3' : 'grid-cols-2'}`}>
          {(side === 'buy' ? (['USDC', 'USDT', 'SOL'] as Asset[]) : (['USDC', 'SOL'] as Asset[])).map(a => {
            const on = (side === 'buy' ? payWith : receive) === a;
            const bal = !cash ? null : a === 'SOL' ? cash.sol.usd : a === 'USDC' ? cash.usdc.amount : cash.usdt.amount;
            return (
              <button key={a} aria-pressed={on} onClick={() => { setPicked(true); if (side === 'buy') setPayWith(a); else setReceive(a); }}
                className={`rounded-2xl border px-3 py-2 text-left min-h-[56px] transition-colors ${on ? 'border-terracotta bg-terracotta-soft' : 'border-cream-border dark:border-night-border'}`}>
                <div className="font-semibold text-[14.5px] text-ink dark:text-cream-warm">{a}</div>
                <div className="text-[11.5px] muted truncate">{side === 'sell' ? (a === 'SOL' ? 'to your SOL' : 'digital dollars') : bal == null ? '—' : `${compact(bal)}`}</div>
              </button>
            );
          })}
        </div>
        {stableRail && <p className="text-[12px] text-[#58834C] mt-1.5">No SOL needed — Kobocent covers the network fee.</p>}
      </div>

      {/* Speed */}
      <div className="grid grid-cols-2 gap-2">
        {(['normal', 'ultra'] as Mode[]).map(m => (
          <button key={m} onClick={() => setMode(m)} aria-pressed={mode === m} disabled={m === 'ultra' && stableRail}
            className={`rounded-2xl border px-3.5 py-2.5 text-left min-h-[60px] transition-colors disabled:opacity-50 ${mode === m ? 'border-terracotta bg-terracotta-soft' : 'border-cream-border dark:border-night-border'}`}>
            <div className="font-semibold text-[14.5px] text-ink dark:text-cream-warm flex items-center gap-1.5">{m === 'ultra' && <IconBolt size={15} className="text-terracotta" />}{m === 'normal' ? 'Normal' : 'Ultra'}</div>
            <div className="text-[12px] muted">{m === 'normal' ? '1% fee' : stableRail ? `Uses SOL — ${side === 'buy' ? 'pay' : 'receive'} SOL` : ultra ? ultraLabel : 'MEV-protected, priority'}</div>
          </button>
        ))}
      </div>

      {/* Amount */}
      {side === 'buy' ? (
        <div>
          <div className="flex items-center justify-between text-[13px] muted">
            <span>Amount{payWith !== 'SOL' ? ` · from $5` : ''}</span>
            {payWith === 'SOL' && <button onClick={() => { setUnit(unit === 'USD' ? 'SOL' : 'USD'); setAmt(''); }} className="font-semibold text-terracotta min-h-[36px]">Enter in {unit === 'USD' ? 'SOL' : '$'}</button>}
          </div>
          <div className="mt-1 flex items-center gap-2">
            {unit === 'USD' && <span className="font-display font-bold text-[34px] muted">$</span>}
            <input value={amt} onChange={e => { let s = e.target.value.replace(/[^\d.]/g, ''); const [i, ...r] = s.split('.'); s = r.length ? `${i}.${r.join('').slice(0, unit === 'SOL' ? 6 : 2)}` : i; setAmt(s.slice(0, 12)); }}
              inputMode="decimal" placeholder="0" aria-label={`Amount in ${unit}`} className="flex-1 min-w-0 bg-transparent outline-none font-display font-bold text-[38px] text-ink dark:text-cream-warm" />
            {unit === 'SOL' && <span className="font-semibold muted">SOL</span>}
          </div>
          {unit === 'USD' && (
            <div className="mt-2 grid grid-cols-5 gap-2">
              {BUY_PICKS.map(v => <button key={v} onClick={() => setAmt(String(v))} className={`min-h-[44px] rounded-xl border text-[14px] font-semibold ${value === v ? 'border-terracotta text-terracotta' : 'border-cream-border dark:border-night-border'}`}>${v}</button>)}
              <button onClick={() => quote && quote.side === 'buy' ? setAmt(String(Math.floor(quote.maxUsd * 100) / 100)) : qMax?.usd && setAmt(String(qMax.usd))} disabled={!(quote?.side === 'buy' || qMax?.usd)}
                className="min-h-[44px] rounded-xl border border-cream-border dark:border-night-border text-[14px] font-semibold disabled:opacity-40">Max</button>
            </div>
          )}
        </div>
      ) : (
        <div>
          <div className="text-[13px] muted">How much to sell</div>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {SELL_PICKS.map(p => <button key={p} onClick={() => { setPercent(p); setAmt(''); }} className={`min-h-[48px] rounded-xl border text-[15px] font-semibold ${percent === p ? 'border-terracotta bg-terracotta-soft text-terracotta' : 'border-cream-border dark:border-night-border'}`}>{p === 100 ? 'All' : `${p}%`}</button>)}
          </div>
          <input value={amt} onChange={e => { setPercent(null); setAmt(e.target.value.replace(/[^\d.]/g, '').slice(0, 18)); }} inputMode="decimal" placeholder={`Or an amount of ${symbol}`} aria-label={`Amount of ${symbol}`}
            className="mt-2 w-full min-h-[48px] rounded-xl border border-cream-border dark:border-night-border bg-transparent px-3.5 text-[16px] outline-none focus:border-terracotta" />
        </div>
      )}

      {/* Quote */}
      {qErr ? <ErrorNote msg={qErr} className="text-[14px] text-[#B84A40]" />
        : busy && hasInput ? <div className="h-24 rounded-2xl bg-cream-warm dark:bg-night animate-pulse" />
        : quote && <QuoteBox q={quote} />}

      <button disabled={!quote || busy} onClick={() => { setStartErr(''); setReview(true); }}
        className="w-full min-h-[56px] rounded-2xl font-semibold text-[16px] text-white disabled:opacity-40 disabled:pointer-events-none"
        style={{ background: side === 'buy' ? '#58834C' : '#B84A40' }}>
        {!hasInput ? (side === 'buy' ? 'Enter an amount' : 'Choose how much') : busy ? 'Finding the best price…' : `Review ${side}`}
      </button>

      <Sheet open={review} onClose={() => !starting && setReview(false)} title={side === 'buy' ? `Buy ${symbol}` : `Sell ${symbol}`}>
        {quote && (
          <>
            <QuoteBox q={quote} big />
            <p className="muted text-[13px] mt-3">Prices move fast. If what you get falls more than 3% before it sends, we stop and show you the new price. Slippage limit {quote.slippagePct}%.</p>
            <ErrorNote msg={startErr} className="mt-3 text-[14px] text-[#B84A40]" />
            <div className="mt-5"><HoldToConfirm label={side === 'buy' ? `Hold to buy` : `Hold to sell`} busy={starting} onConfirm={start} /></div>
          </>
        )}
      </Sheet>
    </section>
  );
}

function QuoteBox({ q, big = false }: { q: Quote; big?: boolean }) {
  const row = (k: string, v: React.ReactNode, color?: string) => (<><dt className="muted">{k}</dt><dd className="text-right font-mono" style={color ? { color } : undefined}>{v}</dd></>);
  return (
    <div className={`rounded-2xl bg-cream-warm dark:bg-night ${big ? 'p-4' : 'p-3.5'}`}>
      <div className="text-[12.5px] muted">{q.side === 'buy' ? 'You get about' : 'You receive about'}</div>
      <div className={`font-display font-bold text-ink dark:text-cream-warm ${big ? 'text-[30px]' : 'text-[24px]'}`}>
        {q.side === 'buy' ? `${tokenAmount(q.tokensOut)} ${q.symbol}` : q.rail === 'stable' ? `${compact(q.netUsd ?? 0)} ${q.receive}` : `${(q.netSol ?? 0).toFixed(4)} SOL`}
        <span className="text-[14px] font-normal muted"> {q.side === 'buy' ? `for ${compact(q.usd)}` : q.rail !== 'stable' && q.usdOut != null ? `≈ ${compact(q.usdOut)}` : ''}</span>
      </div>
      <dl className="mt-2 grid grid-cols-2 gap-y-1 text-[13px]">
        {q.side === 'buy' && row('You pay', q.rail === 'stable' ? `${q.usd.toFixed(2)} ${q.payWith}` : `${(q.sol ?? 0).toFixed(4)} SOL`)}
        {q.side === 'sell' && row('Selling', `${tokenAmount(q.tokens)} ${q.symbol}${q.all ? ' (all)' : ''}`)}
        {q.side === 'buy' && q.priceUsd != null && row('Price', price(q.priceUsd))}
        {row(`Fee${q.fees.ultraPct ? ' (1% + 3% Ultra)' : q.mode === 'ultra' ? ' (1%, Ultra included)' : ''}`, `${q.fees.totalPct}% · ${q.fees.totalUsd != null ? compact(q.fees.totalUsd) : `${q.fees.totalSol.toFixed(5)} SOL`}`)}
        {q.priceImpactPct > 1 && row('Price impact', `${q.priceImpactPct.toFixed(2)}%`, '#B68B2A')}
        {q.side === 'sell' && q.pnl && row('Result', <>{signedUsd(q.pnl.usd)} ({pct(q.pnl.pct)})</>, pnlColor(q.pnl.usd))}
        {row('Network fee', 'Covered by Kobocent', '#58834C')}
        {q.side === 'buy' && q.rail !== 'stable' && <p className="col-span-2 text-[11.5px] muted mt-1">A first buy of a token keeps about 0.002 SOL to open its account (returned if you close it).</p>}
        {q.side === 'buy' && q.rail === 'stable' && q.needsAccount && <p className="col-span-2 text-[11.5px] muted mt-1">First time holding this token — we open its account for you, free.</p>}
      </dl>
    </div>
  );
}

function TradeProgress({ jobId, symbol, onFinish }: { jobId: string; symbol: string; onFinish: () => void }) {
  const [job, setJob] = useState<Job | null>(null);
  const [lost, setLost] = useState(false);
  useEffect(() => {
    let live = true; let misses = 0; let t: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try { const j = await kc<Job>(`trade/jobs/${jobId}`); if (!live) return; misses = 0; setJob(j); if (j.status === 'done') return; }
      catch (e) { if (e instanceof KcError && e.status === 404) { if (live) setLost(true); return; } misses++; }
      if (live) t = setTimeout(poll, misses ? Math.min(8000, 1500 * misses) : 1000);
    };
    poll();
    return () => { live = false; clearTimeout(t); };
  }, [jobId]);
  if (lost) return <Outcome tone="info" title="We lost track of this screen" body="Check your tokens on Trade — the trade itself is unaffected." actions={<><Link href="/app/trade" onClick={onFinish} className="btn-primary w-full">Open Trade</Link><button onClick={onFinish} className="btn-ghost w-full">Close</button></>} />;
  const r = job?.result;
  if (job?.status === 'done' && r) {
    if (r.ok && r.side === 'buy') return <Outcome tone="success" title={`Bought ${r.symbol || symbol}`} body={`${tokenAmount(r.tokens || 0)} ${r.symbol || symbol} for ${r.payWith && r.payWith !== 'SOL' ? `${compact(r.spentUsd ?? 0)} ${r.payWith}` : `${(r.spentSol || 0).toFixed(4)} SOL${r.spentUsd ? ` (${compact(r.spentUsd)})` : ''}`}${r.mode === 'ultra' ? ' with Ultra' : ''}. Protect it with take profit or a stop loss on Telegram — coming here next.`} signature={r.signature} actions={<button onClick={onFinish} className="btn-primary w-full">Done</button>} />;
    if (r.ok) return <SoldResult jobId={jobId} r={r} symbol={symbol} onFinish={onFinish} />;
    if (r.code === 'OUTCOME_UNKNOWN') return <Outcome tone="warn" title="Sent — confirming" body={r.error || 'Your trade was sent and is still confirming. Check your tokens in a minute before trading again.'} signature={r.signature} actions={<button onClick={onFinish} className="btn-primary w-full">OK</button>} />;
    return <Outcome tone="error" title="The trade didn’t go through" body={r.error || 'Nothing was traded. Try again in a moment.'} actions={<button onClick={onFinish} className="btn-primary w-full">Try again</button>} />;
  }
  return (
    <section className="surface rounded-3xl p-8 text-center animate-fade-up" aria-live="polite">
      <div className="relative mx-auto h-24 w-24"><span className="absolute inset-0 rounded-full border-4 border-cream-warm dark:border-night" /><span className="absolute inset-0 rounded-full border-4 border-terracotta border-t-transparent animate-spin" style={{ animationDuration: '1.1s' }} /><span className="absolute inset-0 grid place-items-center text-terracotta"><IconBolt size={30} /></span></div>
      <div className="font-display text-[22px] font-bold mt-5 text-ink dark:text-cream-warm">{job?.meta.side === 'sell' ? 'Selling' : 'Buying'} {symbol}{job?.meta.mode === 'ultra' ? ' with Ultra' : ''}</div>
      <p className="muted text-[14px] mt-1">Usually 5–20 seconds on Solana.</p>
    </section>
  );
}

/** After a sell: the branded result card (server-drawn from this sale), with Share and Save (2026-10-09). */
function SoldResult({ jobId, r, symbol, onFinish }: { jobId: string; r: TradeResult; symbol: string; onFinish: () => void }) {
  const src = `/api/kc/trade/jobs/${jobId}/card`;
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [note, setNote] = useState('');
  const name = `kobocent-${(r.symbol || symbol).replace(/[^A-Za-z0-9]/g, '')}-result.png`;
  async function file() { const b = await (await fetch(src)).blob(); return new File([b], name, { type: 'image/png' }); }
  async function share() {
    setNote('');
    try {
      const f = await file();
      const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
      if (nav.share && nav.canShare?.({ files: [f] })) await nav.share({ files: [f], text: `My $${r.symbol || symbol} trade on Kobocent` });
      else { save(f); setNote('Saved — share it from your photos or downloads.'); }
    } catch (e) { if (!(e instanceof DOMException && e.name === 'AbortError')) setNote('Could not share — try Save.'); }
  }
  function save(f?: File) {
    const go = (blob: Blob) => { const u = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000); };
    if (f) go(f); else file().then(go).catch(() => setNote('Could not save the card'));
  }
  const win = (r.pnlUsd ?? 0) >= 0;
  return (
    <section className="surface rounded-3xl p-5 text-center animate-fade-up" aria-live="polite">
      <h2 className="font-display text-[24px] font-bold text-ink dark:text-cream-warm">Sold {r.symbol || symbol}</h2>
      <p className="muted text-[14.5px] mt-1">
        {tokenAmount(r.tokens || 0)} {r.symbol || symbol} → {r.receive && r.receive !== 'SOL' ? `${compact(r.receivedUsd ?? 0)} ${r.receive}` : `${(r.receivedSol || 0).toFixed(4)} SOL${r.receivedUsd ? ` (${compact(r.receivedUsd)})` : ''}`}
        {r.pnlUsd != null && <> · <span className="font-semibold" style={{ color: pnlColor(r.pnlUsd) }}>{signedUsd(r.pnlUsd)}{r.pnlPct != null ? ` (${pct(r.pnlPct)})` : ''}</span></>}
      </p>
      {!failed && (
        <div className="mt-4 mx-auto max-w-[360px] rounded-2xl overflow-hidden shadow-card bg-cream-warm dark:bg-night aspect-[4/5] relative">
          {!loaded && <div className="absolute inset-0 animate-pulse" />}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={`${r.symbol || symbol} trade result: ${r.pnlPct != null ? pct(r.pnlPct) : ''}`} className="w-full h-full object-cover" onLoad={() => setLoaded(true)} onError={() => setFailed(true)} />
        </div>
      )}
      {!failed && (
        <div className="mt-4 grid grid-cols-2 gap-2 max-w-[360px] mx-auto">
          <button onClick={share} disabled={!loaded} className="btn-primary min-h-[48px] disabled:opacity-50">{win ? 'Share your win' : 'Share'}</button>
          <button onClick={() => save()} disabled={!loaded} className="btn-ghost min-h-[48px] disabled:opacity-50">Save</button>
        </div>
      )}
      {note && <p className="text-[13px] muted mt-2">{note}</p>}
      {r.signature && <a href={`https://solscan.io/tx/${r.signature}`} target="_blank" rel="noopener noreferrer" className="block mt-3 text-[13px] text-terracotta font-semibold min-h-[40px] leading-[40px]">View the transaction</a>}
      <button onClick={onFinish} className="btn-ghost w-full mt-2 min-h-[48px]">Done</button>
    </section>
  );
}
