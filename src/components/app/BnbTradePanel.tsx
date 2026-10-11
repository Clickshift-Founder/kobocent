'use client';
import { useEffect, useRef, useState } from 'react';
import { kc, KcError } from '@/lib/kc';
import { ErrorNote } from './ErrorNote';
import { HoldToConfirm, newKey } from './money';
import { price, tokenAmount } from './trade';

/**
 * Buy / sell on BNB Chain (2026-10-11). Backend /trade/bnb/quote + /trade/bnb/execute (src/trading/evmTrade.js): best route via
 * KyberSwap (PancakeSwap and others), Kobocent's 1% taken inside the swap, the network fee (~$0.01) covered by Kobocent when your
 * wallet has no BNB, contract checked by GoPlus before every buy (honeypots and heavy taxes are refused).
 */

export interface Security { verdict: 'danger' | 'caution' | 'clear' | null; danger: string[]; warnings: string[]; buyTaxPct: number | null; sellTaxPct: number | null; holders: number | null; topHolderPct: number | null; checked: boolean }
interface Quote {
  side: 'buy' | 'sell'; symbol: string; pay: 'USDT' | 'USDC' | 'BNB'; amountInUnits: number; amountOutUnits: number; minOutUnits: number; usdIn: number | null; usdOut: number | null;
  feePct: number; feeUsd: number | null; impactPct: number | null; slippagePct: number; gasUsd: number | null; gasCoveredByKobocent: boolean; security: Security; routeVia: string[];
}
interface Result { ok: boolean; code?: string; error?: string; side?: string; symbol?: string; tokens?: number; usd?: number | null; received?: number; receivedAsset?: string; pnlUsd?: number | null; explorerUrl?: string | null; gasCovered?: boolean }
interface Job { id: string; status: 'running' | 'done'; result: Result | null }

const BUY_USD = [5, 10, 25, 50, 100];
const SELL_PCT = [25, 50, 100];

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} aria-pressed={on} className={`min-h-[44px] rounded-xl border px-2 text-[14px] font-semibold transition-colors ${on ? 'border-terracotta bg-terracotta-soft text-terracotta' : 'border-cream-border dark:border-night-border text-ink dark:text-cream-warm'}`}>{children}</button>;
}

export function BnbTradePanel({ token, symbol, held, onDone }: { token: string; symbol: string; held: boolean; onDone: () => void }) {
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [pay, setPay] = useState<'USDT' | 'USDC' | 'BNB'>('USDT');
  const [receive, setReceive] = useState<'USDT' | 'BNB'>('USDT');
  const [usdAmt, setUsdAmt] = useState(10);
  const [custom, setCustom] = useState('');
  const [pct, setPct] = useState(100);
  const [q, setQ] = useState<Quote | null>(null);
  const [qErr, setQErr] = useState('');
  const [quoting, setQuoting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [res, setRes] = useState<Result | null>(null);
  const [tick, setTick] = useState(0);
  const keyRef = useRef(newKey());
  const amount = custom ? Number(custom) : usdAmt;

  useEffect(() => {
    setQErr('');
    if (side === 'buy' && !(amount > 0)) { setQ(null); return; }
    let live = true; setQuoting(true);
    const t = setTimeout(() => {
      kc<Quote>('trade/bnb/quote', { method: 'POST', body: side === 'buy' ? { side, token, amount, payWith: pay } : { side, token, percent: pct, receive } })
        .then(r => { if (live) setQ(r); })
        .catch(e => { if (live) { setQ(null); setQErr(e instanceof Error ? e.message : 'No quote right now'); } })
        .finally(() => { if (live) setQuoting(false); });
    }, 350);
    return () => { live = false; clearTimeout(t); };
  }, [side, token, amount, pay, pct, receive, tick]);
  // Keep the quote fresh while it is on screen (every 15 s, not while a trade is running)
  useEffect(() => {
    const t = window.setInterval(() => { if (document.visibilityState === 'visible' && !busy) setTick(n => n + 1); }, 15_000);
    return () => window.clearInterval(t);
  }, [busy]);

  async function go() {
    if (!q) return;
    setBusy(true); setErr('');
    try {
      let j = await kc<Job>('trade/bnb/execute', { method: 'POST', body: { ...(side === 'buy' ? { side, token, amount, payWith: pay } : { side, token, percent: pct, receive }), expectOut: q.amountOutUnits, idempotencyKey: keyRef.current } });
      for (let i = 0; i < 90 && j.status !== 'done'; i++) { await new Promise(r => setTimeout(r, 1500)); try { j = await kc<Job>(`trade/jobs/${j.id}`); } catch (e) { if (e instanceof KcError && e.status === 404) break; } }
      keyRef.current = newKey();
      const r = j.result || { ok: false, code: 'OUTCOME_UNKNOWN', error: 'Still going through — check your tokens in a minute before trying again.' };
      if (r.ok || r.code === 'OUTCOME_UNKNOWN') { setRes(r); if (r.ok) onDone(); } else setErr(r.error || 'The trade didn’t go through — nothing was traded.');
    } catch (e) { setErr(e instanceof Error ? e.message : 'The trade didn’t go through.'); keyRef.current = newKey(); }
    finally { setBusy(false); }
  }

  if (res) return (
    <section className="surface rounded-3xl p-5 animate-fade-up" aria-live="polite">
      <div className="font-display font-bold text-[22px] text-ink dark:text-cream-warm">{res.ok ? (res.side === 'buy' ? `Bought ${res.symbol}` : `Sold ${res.symbol}`) : 'Still confirming'}</div>
      <p className="text-[14.5px] muted mt-1 leading-relaxed">
        {res.ok ? (res.side === 'buy' ? `${tokenAmount(res.tokens || 0)} ${res.symbol} for $${res.usd?.toFixed(2)}.` : `Received ${res.received?.toFixed(res.receivedAsset === 'BNB' ? 5 : 2)} ${res.receivedAsset}.${res.pnlUsd != null ? ` ${res.pnlUsd >= 0 ? 'Profit' : 'Loss'}: $${Math.abs(res.pnlUsd).toFixed(2)}.` : ''}`) + (res.gasCovered ? ' Kobocent paid the network fee.' : '') : res.error}
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button onClick={() => setRes(null)} className="btn-primary">Trade again</button>
        {res.explorerUrl ? <a href={res.explorerUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost text-center">Proof on BscScan</a> : <span />}
      </div>
    </section>
  );

  const sec = q?.security;
  return (
    <section className="surface rounded-3xl p-5 space-y-4">
      <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-cream-warm dark:bg-night" role="tablist">
        {(['buy', 'sell'] as const).map(s => (
          <button key={s} role="tab" aria-selected={side === s} onClick={() => setSide(s)} disabled={s === 'sell' && !held}
            className={`min-h-[44px] rounded-xl text-[15px] font-semibold disabled:opacity-40 ${side === s ? 'bg-white dark:bg-night-card text-ink dark:text-cream-warm shadow-sm' : 'muted'}`}>{s === 'buy' ? 'Buy' : 'Sell'}</button>
        ))}
      </div>

      {side === 'buy' ? (
        <>
          <div>
            <div className="text-[13px] muted mb-1.5">Pay with (on BNB Chain)</div>
            <div className="grid grid-cols-3 gap-1.5">{(['USDT', 'USDC', 'BNB'] as const).map(a => <Chip key={a} on={pay === a} onClick={() => setPay(a)}>{a}</Chip>)}</div>
          </div>
          <div>
            <div className="text-[13px] muted mb-1.5">Amount</div>
            <div className="grid grid-cols-5 gap-1.5">{BUY_USD.map(v => <Chip key={v} on={!custom && usdAmt === v} onClick={() => { setUsdAmt(v); setCustom(''); }}>${v}</Chip>)}</div>
            <input value={custom} onChange={e => setCustom(e.target.value.replace(/[^0-9.]/g, ''))} inputMode="decimal" placeholder="Or type dollars"
              className="mt-2 w-full surface rounded-2xl px-4 min-h-[48px] text-[16px] outline-none focus:border-terracotta" />
          </div>
        </>
      ) : (
        <>
          <div>
            <div className="text-[13px] muted mb-1.5">How much</div>
            <div className="grid grid-cols-3 gap-1.5">{SELL_PCT.map(v => <Chip key={v} on={pct === v} onClick={() => setPct(v)}>{v === 100 ? 'All' : `${v}%`}</Chip>)}</div>
          </div>
          <div>
            <div className="text-[13px] muted mb-1.5">Receive</div>
            <div className="grid grid-cols-2 gap-1.5">{(['USDT', 'BNB'] as const).map(a => <Chip key={a} on={receive === a} onClick={() => setReceive(a)}>{a}</Chip>)}</div>
          </div>
        </>
      )}

      {quoting && !q ? <div className="h-28 rounded-2xl bg-cream-warm dark:bg-night animate-pulse" /> : qErr ? <ErrorNote msg={qErr} /> : q && (
        <div className="rounded-2xl bg-cream-warm dark:bg-night p-4 text-[13.5px] space-y-1.5">
          <div className="flex justify-between"><span className="muted">You get</span><span className="font-semibold font-mono text-ink dark:text-cream-warm">{side === 'buy' ? `${tokenAmount(q.amountOutUnits)} ${q.symbol}` : `${q.amountOutUnits.toFixed(q.pay === 'BNB' ? 5 : 2)} ${q.pay}`}</span></div>
          <div className="flex justify-between"><span className="muted">At least</span><span className="font-mono text-ink dark:text-cream-warm">{side === 'buy' ? tokenAmount(q.minOutUnits) : q.minOutUnits.toFixed(q.pay === 'BNB' ? 5 : 2)} · {q.slippagePct}% slippage</span></div>
          <div className="flex justify-between"><span className="muted">Kobocent fee</span><span className="font-mono text-ink dark:text-cream-warm">{q.feePct}%{q.feeUsd != null ? ` ($${q.feeUsd.toFixed(2)})` : ''}</span></div>
          <div className="flex justify-between"><span className="muted">Network fee</span><span className="font-mono text-ink dark:text-cream-warm">{q.gasCoveredByKobocent ? 'Covered by Kobocent' : q.gasUsd != null ? `~$${q.gasUsd.toFixed(3)} in BNB` : '—'}</span></div>
          {q.impactPct != null && q.impactPct >= 1 && <div className="flex justify-between"><span className="muted">Price impact</span><span className="font-mono" style={{ color: q.impactPct >= 3 ? '#B84A40' : '#B68B2A' }}>{q.impactPct}%</span></div>}
          {q.routeVia.length > 0 && <div className="text-[12px] muted pt-1">Best route via {q.routeVia.join(', ')} · price {price(q.usdIn && q.amountOutUnits && side === 'buy' ? q.usdIn / q.amountOutUnits : null)}</div>}
        </div>
      )}

      {sec && side === 'buy' && sec.verdict && sec.verdict !== 'clear' && (
        <div className="rounded-2xl p-3.5 text-[13.5px]" style={{ background: '#B68B2A14' }}>
          <div className="font-semibold" style={{ color: '#B68B2A' }}>Contract check: things to know</div>
          <div className="text-ink dark:text-cream-warm mt-0.5">{sec.warnings.slice(0, 4).join(' · ')}</div>
        </div>
      )}

      <ErrorNote msg={err} />
      {q ? <HoldToConfirm label={side === 'buy' ? `Hold to buy ${q.symbol}` : `Hold to sell ${pct === 100 ? 'all' : `${pct}%`}`} onConfirm={go} busy={busy} />
        : <button disabled className="w-full rounded-2xl bg-cream-warm dark:bg-night muted font-semibold min-h-[60px] text-[15px]">{quoting ? 'Getting the best price…' : 'Choose an amount'}</button>}
      <p className="text-[12px] muted">Trades from your 0x wallet on BNB Chain. Honeypots and tokens with heavy taxes are refused automatically. Only trade what you can afford to lose.</p>
    </section>
  );
}
