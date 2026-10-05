'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { kc, KcError, amount as fmt } from '@/lib/kc';
import { PageHeader } from '@/components/app/PageHeader';
import { Sheet, Skeleton } from '@/components/app/ui';
import { IconBridge, IconChevron, IconCheck, IconBank, IconLeaf, IconSend, IconSwap } from '@/components/app/Icons';
import { newKey, store, read, HoldToConfirm, Outcome } from '@/components/app/money';

/**
 * Bridge — move money between chains (deBridge). One layout, two directions:
 *   Bring in  — ETH/BNB/MATIC or USDC/USDT on Ethereum, BNB Chain, Polygon, Arbitrum, Robinhood Chain
 *               → USDC on Solana, spendable in Kobocent.
 *   Send out  — your USDC → USDC/USDT or the network coin on those chains, to your own 0x wallet or another.
 * Every fee is paid in stablecoin (founder, 2026-10-05): if the user lacks the network coin, Kobocent
 * covers the network costs and takes the USDC equivalent — never an "add gas" step.
 * Backend /api/v1/bridge (src/services/bridge.js — same code as Telegram). Order progress is durable.
 */

type Dir = 'in' | 'out';
interface Asset { id: string; symbol: string; native: boolean; decimals?: number; balance?: number | null }
interface Chain { key: string; label: string; native: string; minRecommendedUsd?: number; assets: Asset[] }
interface Order { direction: Dir; assetKey: string; chainKey: string; symbol: string | null; amountIn: number; estOut: number | null; orderId: string; srcTx: string | null; status: string; dlnStatus: string | null; createdAt: number; completedAt: number | null }
interface Options {
  in: { chains: Chain[]; evmAddress: string | null };
  out: { available: boolean; usdc: number | null; sol: number | null; evmAddress: string | null; minUsd: number; recommendedUsd: number; chains: Chain[] };
  recent: Order[];
}
interface InQuote { direction: 'in'; assetKey: string; chainLabel: string; symbol: string; native: string; amountIn: number; usdIn: number | null; receive: number; kobocentFee: number; fixFee: number; gasEstimate: number; gasFront: { amount: number; usd: number } | null; etaSeconds: number | null; minRecommendedUsd: number; smallWarning: boolean }
interface OutQuote { direction: 'out'; assetKey: string; chainLabel: string; symbol: string; amountIn: number; receive: number; kobocentFee: number; solCost: number; solCostUsd: number | null; coveredFromUsdc: number; totalUsdc: number; etaSeconds: number | null; recipient: string; ownRecipient: boolean; minRecommendedUsd: number; smallWarning: boolean }
type Quote = InQuote | OutQuote;
interface QErr { code?: string; error?: string }
interface Result { ok: boolean; code?: string; error?: string; txHash?: string | null; orderId?: string | null; q?: Quote }
interface Job { id: string; status: 'running' | 'done'; stage: string; meta: { assetKey: string; amount: number; direction?: Dir }; result: Result | null }

const JOB_KEY = 'kc-bridge-job';
const ORDER_KEY = 'kc-bridge-order';
const CHAIN_COLOR: Record<string, string> = { ETH: '#627EEA', BNB: '#F0B90B', POLYGON: '#8247E5', ARBITRUM: '#28A0F0', ROBINHOOD: '#58834C', SOLANA: '#20211F' };
const CHAIN_LABEL: Record<string, string> = { ETH: 'Ethereum', BNB: 'BNB Chain', POLYGON: 'Polygon', ARBITRUM: 'Arbitrum', ROBINHOOD: 'Robinhood Chain' };
const dpOf = (a: { native: boolean }) => (a.native ? 6 : 2);
const eta = (s: number | null) => (!s ? 'a few minutes' : s < 90 ? 'about a minute' : `about ${Math.round(s / 60)} minutes`);
const cleanAmt = (v: string, dp: number) => { let s = v.replace(/[^\d.]/g, ''); const [i, ...r] = s.split('.'); s = r.length ? `${i}.${r.join('').slice(0, dp)}` : i; return s.slice(0, 14); };

export default function BridgePage() {
  const [opts, setOpts] = useState<Options | null>(null);
  const [error, setError] = useState('');
  const [needsLink, setNeedsLink] = useState(false);
  const [dir, setDir] = useState<Dir>('in');
  // in
  const [inChain, setInChain] = useState('ARBITRUM');
  const [inAsset, setInAsset] = useState('usdc_arb');
  // out
  const [outAsset, setOutAsset] = useState('usdc_arb');
  const [toOther, setToOther] = useState(false);
  const [recipient, setRecipient] = useState('');
  // shared
  const [amt, setAmt] = useState('');
  const [useMax, setUseMax] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [qErr, setQErr] = useState<QErr | null>(null);
  const [busy, setBusy] = useState(false);
  const [picker, setPicker] = useState(false);
  const [review, setReview] = useState(false);
  const [starting, setStarting] = useState(false);
  const [startErr, setStartErr] = useState('');
  const [jobId, setJobId] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const keyRef = useRef(newKey());

  const load = useCallback(() => kc<Options>('bridge').then(o => {
    setOpts(o);
    const held = o.in.chains.flatMap(c => c.assets.filter(a => (a.balance || 0) > 0).map(a => ({ c: c.key, a: a.id })));
    if (held.length) { setInChain(held[0].c); setInAsset(held[0].a); }
  }).catch(e => {
    if (e instanceof KcError && e.status === 409) setNeedsLink(true); else setError(e instanceof Error ? e.message : 'Could not load Bridge');
  }), []);
  useEffect(() => { setJobId(read(JOB_KEY)); setOrderId(read(ORDER_KEY)); load(); }, [load]);

  const inC = opts?.in.chains.find(c => c.key === inChain) || null;
  const inA = inC?.assets.find(a => a.id === inAsset) || inC?.assets[0] || null;
  const outC = opts?.out.chains.find(c => c.assets.some(a => a.id === outAsset)) || null;
  const outA = outC?.assets.find(a => a.id === outAsset) || null;
  const value = Number(amt) || 0;
  const recipientOk = !toOther || /^0x[a-fA-F0-9]{40}$/.test(recipient.trim());

  function switchDir(d: Dir) { setDir(d); setAmt(''); setUseMax(false); setQuote(null); setQErr(null); }

  useEffect(() => {
    setQErr(null);
    const assetId = dir === 'in' ? inA?.id : outA?.id;
    if (!assetId || (!value && !useMax) || !recipientOk) { setQuote(null); return; }
    let live = true; setBusy(true);
    const path = dir === 'in' ? 'bridge/quote' : 'bridge/out/quote';
    const body = dir === 'in' ? { assetKey: assetId, amount: value, max: useMax } : { assetKey: assetId, amount: value, max: useMax, recipient: toOther ? recipient.trim() : null };
    const t = setTimeout(() => {
      kc<Quote>(path, { method: 'POST', body })
        .then(q => { if (!live) return; setQuote(q); if (useMax) setAmt(String(q.amountIn)); })
        .catch(e => { if (!live) return; setQuote(null); setQErr(e instanceof KcError ? (e.data as QErr) : { error: e instanceof Error ? e.message : 'No quote right now' }); })
        .finally(() => { if (live) setBusy(false); });
    }, 650);
    return () => { live = false; clearTimeout(t); };
  }, [dir, inA, outA, value, useMax, toOther, recipient, recipientOk]);

  async function start() {
    if (!quote) return;
    setStarting(true); setStartErr('');
    try {
      const path = quote.direction === 'in' ? 'bridge/execute' : 'bridge/out/execute';
      const body = quote.direction === 'in'
        ? { assetKey: quote.assetKey, amount: quote.amountIn, expectReceive: quote.receive, idempotencyKey: keyRef.current }
        : { assetKey: quote.assetKey, amount: quote.amountIn, expectReceive: quote.receive, recipient: quote.ownRecipient ? null : quote.recipient, idempotencyKey: keyRef.current };
      const job = await kc<Job>(path, { method: 'POST', body });
      setReview(false); store(JOB_KEY, job.id); setJobId(job.id);
    } catch (e) { setStartErr(e instanceof Error ? e.message : 'Could not start the bridge'); keyRef.current = newKey(); }
    finally { setStarting(false); }
  }
  const onSubmitted = useCallback((oid: string | null) => { store(JOB_KEY, null); setJobId(null); if (oid) { store(ORDER_KEY, oid); setOrderId(oid); } }, []);
  function finish() { store(JOB_KEY, null); store(ORDER_KEY, null); setJobId(null); setOrderId(null); setAmt(''); setUseMax(false); setQuote(null); keyRef.current = newKey(); load(); }

  if (needsLink) return <div className="space-y-6"><PageHeader title="Bridge" /><div className="surface rounded-3xl p-6 text-center"><p className="muted text-[15px] mb-4">Link your Telegram account to bridge from the web app.</p><Link href="/app/settings" className="btn-primary">Open Settings</Link></div></div>;

  const noInBalances = opts && opts.in.chains.every(c => c.assets.every(a => !a.balance));
  const amountInput = (dp: number, label: string) => (
    <input value={amt} onChange={e => { setUseMax(false); setAmt(cleanAmt(e.target.value, dp)); }} inputMode="decimal" placeholder="0" aria-label={label}
      className="flex-1 min-w-0 bg-transparent outline-none font-display font-bold text-[36px] text-ink dark:text-cream-warm" />
  );
  const receiveBox = (sym: string, color: string, sub: string) => (
    <div className="surface rounded-3xl p-5 mt-2">
      <div className="text-[13px] muted">{sub}</div>
      <div className="mt-2 flex items-center gap-3">
        <div className="flex-1 min-w-0 font-display font-bold text-[36px] tabular-nums text-ink dark:text-cream-warm truncate">
          {!value && !useMax ? <span className="text-cream-border dark:text-night-border">0</span> : busy || !quote ? <span className="inline-block h-9 w-32 rounded-xl bg-cream-warm dark:bg-night animate-pulse align-middle" /> : `≈ ${fmt(quote.receive, sym === 'USDC' || sym === 'USDT' ? 2 : 6)}`}
        </div>
        <span className="inline-flex items-center gap-2 rounded-full bg-cream-warm dark:bg-night pl-1.5 pr-3 min-h-[44px] font-semibold text-[15px]"><span className="grid place-items-center h-8 w-8 rounded-full text-white text-[11px] font-bold" style={{ background: color }}>{sym === 'USDC' || sym === 'USDT' ? '$' : sym.slice(0, 1)}</span>{sym}</span>
      </div>
    </div>
  );
  const arrow = <div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 grid place-items-center h-12 w-12 rounded-2xl bg-terracotta text-white shadow-card"><IconBridge size={20} className="rotate-90" /></div>;

  return (
    <div className="space-y-6">
      <PageHeader title="Bridge" subtitle="Move money between chains. Every fee is paid in stablecoin — no gas to buy." />
      {jobId ? <BridgeJob jobId={jobId} onSubmitted={onSubmitted} onFinish={finish} onPriceMoved={(q) => { store(JOB_KEY, null); setJobId(null); setQuote(q); keyRef.current = newKey(); setReview(true); }} />
        : orderId ? <Tracker orderId={orderId} onFinish={finish} />
        : error ? <div className="surface rounded-2xl p-5 text-[15px]">{error}</div>
        : !opts || !inC || !inA ? <div className="space-y-3"><Skeleton className="h-12" /><Skeleton className="h-40" /><Skeleton className="h-28" /></div> : (
        <div className="space-y-4 animate-fade-up">
          <div role="tablist" className="grid grid-cols-2 gap-1 rounded-2xl bg-cream-warm dark:bg-night p-1">
            {(['in', 'out'] as Dir[]).map(d => (
              <button key={d} role="tab" aria-selected={dir === d} onClick={() => switchDir(d)} className={`min-h-[44px] rounded-xl text-[14.5px] font-semibold ${dir === d ? 'bg-white dark:bg-night-card text-terracotta shadow-sm' : 'muted'}`}>{d === 'in' ? 'Bring in' : 'Send out'}</button>
            ))}
          </div>

          {dir === 'in' ? (
            <>
              <section className="rounded-2xl p-4" style={{ background: 'linear-gradient(135deg,#C1502E14,#C1502E05)' }}>
                <div className="font-semibold text-[14.5px] text-ink dark:text-cream-warm">Make it spendable</div>
                <p className="text-[13px] muted mt-0.5">Crypto on other chains just sits there. Bring it into your Kobocent balance and it works for you:</p>
                <div className="mt-3 grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-[12px] font-medium">
                  {[['🛒', 'Spend'], ['↗️', 'Send'], ['🏦', 'Withdraw'], ['⚡', 'Pay bills'], ['🌱', 'Earn'], ['📈', 'Trade']].map(([g, t]) => (
                    <div key={t} className="rounded-xl bg-white/70 dark:bg-night py-2"><div aria-hidden className="text-[17px]">{g}</div>{t}</div>
                  ))}
                </div>
                <p className="text-[12px] muted mt-2">Lands as USDC on Solana in minutes. Every fee is paid from what you bridge — no gas to buy.</p>
              </section>
              {noInBalances && (
                <div className="rounded-2xl p-4 text-[13.5px]" style={{ background: '#C1502E12' }}>
                  Nothing to bring in yet. Receive ETH, BNB, MATIC, USDC or USDT to your 0x address first — <Link href="/app/add-money?tab=crypto" className="font-semibold text-terracotta">Add money → Crypto</Link>.
                </div>
              )}
              <section className="relative">
                <div className="surface rounded-3xl p-5">
                  <div className="flex items-center justify-between text-[13px] muted"><span>From · your 0x wallet</span>
                    <span>Balance {inA.balance == null ? '—' : fmt(inA.balance, dpOf(inA))}{(inA.balance || 0) > 0 && <button onClick={() => { setUseMax(true); setAmt(''); }} className="ml-2 font-semibold text-terracotta">Max</button>}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    {amountInput(6, `Amount of ${inA.symbol}`)}
                    <button onClick={() => setPicker(true)} className="inline-flex items-center gap-2 rounded-full bg-cream-warm dark:bg-night pl-1.5 pr-3 min-h-[44px] font-semibold text-[15px] text-ink dark:text-cream-warm">
                      <span className="grid place-items-center h-8 w-8 rounded-full text-white text-[11px] font-bold" style={{ background: CHAIN_COLOR[inC.key] }}>{inA.native ? inA.symbol.slice(0, 1) : '$'}</span>
                      <span className="text-left leading-tight">{inA.symbol}<span className="block text-[11px] muted font-normal">{inC.label}</span></span><IconChevron size={14} className="rotate-90 muted" />
                    </button>
                  </div>
                  {quote?.direction === 'in' && quote.usdIn && <div className="text-[13px] muted">≈ ${fmt(quote.usdIn, 2)}</div>}
                </div>
                {arrow}
                {receiveBox('USDC', '#2775CA', 'To · spendable Kobocent balance')}
              </section>
            </>
          ) : (
            <>
              <section className="relative">
                <div className="surface rounded-3xl p-5">
                  <div className="flex items-center justify-between text-[13px] muted"><span>From · spendable Kobocent balance</span>
                    <span>USDC {opts.out.usdc == null ? '—' : fmt(opts.out.usdc, 2)}{(opts.out.usdc || 0) > 0 && <button onClick={() => { setUseMax(true); setAmt(''); }} className="ml-2 font-semibold text-terracotta">Max</button>}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    {amountInput(2, 'Amount of USDC')}
                    <span className="inline-flex items-center gap-2 rounded-full bg-cream-warm dark:bg-night pl-1.5 pr-3 min-h-[44px] font-semibold text-[15px]"><span className="grid place-items-center h-8 w-8 rounded-full text-white text-[11px] font-bold" style={{ background: '#2775CA' }}>$</span>USDC</span>
                  </div>
                </div>
                {arrow}
                <div className="surface rounded-3xl p-5 mt-2">
                  <div className="mt-2 flex items-center gap-3">
                    <div className="flex-1 min-w-0 font-display font-bold text-[36px] tabular-nums text-ink dark:text-cream-warm truncate">
                      {!value && !useMax ? <span className="text-cream-border dark:text-night-border">0</span> : busy || !quote ? <span className="inline-block h-9 w-32 rounded-xl bg-cream-warm dark:bg-night animate-pulse align-middle" /> : `≈ ${fmt(quote.receive, outA && !outA.native ? 2 : 6)}`}
                    </div>
                    <button onClick={() => setPicker(true)} className="inline-flex items-center gap-2 rounded-full bg-cream-warm dark:bg-night pl-1.5 pr-3 min-h-[44px] font-semibold text-[15px] text-ink dark:text-cream-warm">
                      <span className="grid place-items-center h-8 w-8 rounded-full text-white text-[11px] font-bold" style={{ background: CHAIN_COLOR[outC?.key || 'ETH'] }}>{outA?.native ? outA.symbol.slice(0, 1) : '$'}</span>
                      <span className="text-left leading-tight">{outA?.symbol}<span className="block text-[11px] muted font-normal">{outC?.label}</span></span><IconChevron size={14} className="rotate-90 muted" />
                    </button>
                  </div>
                </div>
              </section>
              <section className="surface rounded-2xl p-4 space-y-3">
                <div className="grid grid-cols-2 gap-1 rounded-xl bg-cream-warm dark:bg-night p-1">
                  <button onClick={() => setToOther(false)} className={`min-h-[44px] rounded-lg text-[13.5px] font-semibold ${!toOther ? 'bg-white dark:bg-night-card text-terracotta' : 'muted'}`}>My 0x wallet</button>
                  <button onClick={() => setToOther(true)} className={`min-h-[44px] rounded-lg text-[13.5px] font-semibold ${toOther ? 'bg-white dark:bg-night-card text-terracotta' : 'muted'}`}>Another address</button>
                </div>
                {toOther ? (
                  <>
                    <input value={recipient} onChange={e => setRecipient(e.target.value.trim())} placeholder="0x…" spellCheck={false} autoCapitalize="off" aria-label="Recipient address"
                      className="w-full rounded-xl border border-cream-border dark:border-night-border bg-transparent px-3 min-h-[48px] font-mono text-[14px]" />
                    {recipient && !recipientOk && <div className="text-[13px] text-[#B84A40]">0x addresses are 42 characters long</div>}
                    <p className="text-[12.5px] muted">Make sure this wallet or exchange supports {outA?.symbol} on {outC?.label}.</p>
                  </>
                ) : <p className="text-[12.5px] muted break-all">Your Kobocent 0x wallet: <span className="font-mono">{opts.out.evmAddress || '—'}</span></p>}
              </section>
            </>
          )}

          {qErr && <div className="text-[13.5px] text-[#B84A40] px-1">{qErr.error || 'Adjust the amount'}</div>}
          {quote && !qErr && <QuoteDetails q={quote} />}

          <button disabled={!quote || busy || !!qErr} onClick={() => { setStartErr(''); setReview(true); }} className="btn-primary w-full min-h-[56px] text-[16px] disabled:opacity-40 disabled:pointer-events-none">
            {!value && !useMax ? 'Enter an amount' : !recipientOk ? 'Add a valid address' : busy ? 'Finding the best route…' : qErr ? 'Adjust the amount' : 'Review bridge'}
          </button>

          {opts.recent.length > 0 && (
            <section>
              <div className="eyebrow mb-2">Recent bridges</div>
              <ul className="surface rounded-2xl divide-y divide-cream-border dark:divide-night-border px-4">
                {opts.recent.map(o => (
                  <li key={o.orderId}>
                    <button onClick={() => { store(ORDER_KEY, o.orderId); setOrderId(o.orderId); }} className="w-full flex items-center gap-3 py-3 text-left min-h-[56px]">
                      <span className="grid place-items-center h-9 w-9 rounded-xl text-white text-[11px] font-bold" style={{ background: CHAIN_COLOR[o.chainKey] || '#C1502E' }}>{o.direction === 'in' ? '↓' : '↑'}</span>
                      <span className="flex-1 min-w-0"><span className="block text-[14.5px] font-medium">{o.direction === 'in' ? `${fmt(o.amountIn, 4)} ${o.symbol} → USDC` : `${fmt(o.amountIn, 2)} USDC → ${o.symbol} · ${CHAIN_LABEL[o.chainKey] || o.chainKey}`}</span><span className="text-[12px] muted">{new Date(o.createdAt).toLocaleString()}</span></span>
                      <StatusPill s={o.status} />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      {opts && (
        <Sheet open={picker} onClose={() => setPicker(false)} title={dir === 'in' ? 'Bring in from' : 'Send to'}>
          <div className="space-y-4">
            {(dir === 'in' ? opts.in.chains : opts.out.chains).map(c => (
              <div key={c.key}>
                <div className="text-[12px] muted mb-1.5 flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: CHAIN_COLOR[c.key] }} />{c.label}</div>
                <ul className="space-y-1.5">
                  {c.assets.map(a => {
                    const selected = dir === 'in' ? a.id === inA?.id : a.id === outA?.id;
                    return (
                      <li key={a.id}><button onClick={() => { if (dir === 'in') { setInChain(c.key); setInAsset(a.id); } else setOutAsset(a.id); setAmt(''); setUseMax(false); setQuote(null); setPicker(false); }}
                        className={`w-full flex items-center gap-3 rounded-2xl border px-4 min-h-[52px] ${selected ? 'border-terracotta' : 'border-cream-border dark:border-night-border'}`}>
                        <span className="flex-1 text-left font-semibold">{a.symbol}{a.native && <span className="muted text-[12px] font-normal"> · network coin</span>}</span>
                        {dir === 'in' && <span className="font-mono text-[13.5px] muted">{a.balance == null ? '—' : fmt(a.balance, dpOf(a))}</span>}
                      </button></li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </Sheet>
      )}

      <Sheet open={review} onClose={() => !starting && setReview(false)} title="Review bridge">
        {quote && (
          <>
            <div className="flex items-center justify-center gap-4 py-3">
              <div className="text-center"><div className="font-display font-bold text-[24px]">{fmt(quote.amountIn, quote.direction === 'out' ? 2 : 6)}</div><div className="muted text-[13px]">{quote.direction === 'in' ? `${quote.symbol} · ${quote.chainLabel}` : 'USDC · Kobocent'}</div></div>
              <IconBridge size={22} className="text-terracotta" />
              <div className="text-center"><div className="font-display font-bold text-[24px]">≈ {fmt(quote.receive, quote.direction === 'in' ? 2 : 6)}</div><div className="muted text-[13px]">{quote.direction === 'in' ? 'USDC · Kobocent' : `${quote.symbol} · ${quote.chainLabel}`}</div></div>
            </div>
            {quote.direction === 'out' && <p className="text-center text-[13px] break-all"><span className="muted">To </span><span className="font-mono">{quote.recipient}</span>{quote.ownRecipient && <span className="muted"> (your wallet)</span>}</p>}
            <p className="text-center muted text-[13px] mt-2">
              {quote.direction === 'in'
                ? (quote.gasFront ? `Network fees (~$${fmt(quote.gasFront.usd, 2)}) are paid for you and taken from the USDC that lands.` : `Plus ${fmt(quote.fixFee, 6)} ${quote.native} bridge fee and gas from your ${quote.native}.`)
                : `Total from your balance: $${fmt(quote.totalUsdc, 2)} USDC${quote.coveredFromUsdc > 0 ? ` (includes ~$${fmt(quote.coveredFromUsdc, 2)} for Solana network fees)` : ''}.`}
              {' '}Arrives in {eta(quote.etaSeconds)}; the final amount can shift slightly with the market.
            </p>
            {startErr && <div className="mt-3 text-[14px] text-[#B84A40]">{startErr}</div>}
            <div className="mt-5"><HoldToConfirm label="Hold to bridge" busy={starting} onConfirm={start} /></div>
          </>
        )}
      </Sheet>
    </div>
  );
}

function QuoteDetails({ q }: { q: Quote }) {
  return (
    <>
      <dl className="surface rounded-2xl p-4 grid grid-cols-2 gap-y-1.5 text-[13.5px]">
        <dt className="muted">{q.direction === 'in' ? 'You receive' : q.ownRecipient ? 'You receive' : 'They receive'}</dt><dd className="text-right font-mono font-semibold">≈ {fmt(q.receive, q.direction === 'in' ? 2 : 6)} {q.direction === 'in' ? 'USDC' : q.symbol}</dd>
        <dt className="muted">Kobocent fee</dt><dd className="text-right font-mono">{fmt(q.kobocentFee, 2)} USDC</dd>
        {q.direction === 'in' ? (
          q.gasFront ? (<><dt className="muted">Network fees</dt><dd className="text-right">~${fmt(q.gasFront.usd, 2)} <span className="muted">· paid for you</span></dd></>)
            : (<><dt className="muted">Bridge fee</dt><dd className="text-right font-mono">{fmt(q.fixFee, 6)} {q.native}</dd><dt className="muted">Network gas</dt><dd className="text-right">≈ {fmt(q.gasEstimate, 6)} {q.native}</dd></>)
        ) : (
          <><dt className="muted">Solana network fees</dt><dd className="text-right">{q.coveredFromUsdc > 0 ? <>~${fmt(q.coveredFromUsdc, 2)} <span className="muted">· from your USDC</span></> : <>{fmt(q.solCost, 4)} SOL</>}</dd>
            <dt className="muted">Total from balance</dt><dd className="text-right font-mono">{fmt(q.totalUsdc, 2)} USDC</dd></>
        )}
        <dt className="muted">Arrives in</dt><dd className="text-right">{eta(q.etaSeconds)}</dd>
      </dl>
      {q.smallWarning && <p className="text-[13px] text-[#B68B2A] px-1">Small bridges lose a big share to fixed network costs — we recommend at least ~${q.minRecommendedUsd}.</p>}
    </>
  );
}

function StatusPill({ s }: { s: string }) {
  const m: Record<string, [string, string]> = { fulfilled: ['Arrived', '#58834C'], submitted: ['On its way', '#B68B2A'], stuck: ['Delayed', '#B68B2A'], cancelled: ['Refunded', '#B84A40'], abandoned: ['Needs attention', '#B84A40'] };
  const [label, color] = m[s] || [s, '#6B5D52'];
  return <span className="text-[12px] font-semibold rounded-full px-2.5 py-1" style={{ background: `${color}1F`, color }}>{label}</span>;
}

function BridgeJob({ jobId, onSubmitted, onFinish, onPriceMoved }: { jobId: string; onSubmitted: (orderId: string | null) => void; onFinish: () => void; onPriceMoved: (q: Quote) => void }) {
  const [job, setJob] = useState<Job | null>(null);
  const [lost, setLost] = useState(false);
  useEffect(() => {
    let live = true; let misses = 0; let t: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try { const j = await kc<Job>(`bridge/jobs/${jobId}`); if (!live) return; misses = 0; setJob(j); if (j.status === 'done') return; }
      catch (e) { if (e instanceof KcError && e.status === 404) { if (live) setLost(true); return; } misses++; }
      if (live) t = setTimeout(poll, misses ? Math.min(8000, 1500 * misses) : 1500);
    };
    poll();
    return () => { live = false; clearTimeout(t); };
  }, [jobId]);
  const r = job?.result;
  useEffect(() => { if (job?.status === 'done' && r?.ok) onSubmitted(r.orderId || null); }, [job, r, onSubmitted]);
  if (lost) return <Outcome tone="info" title="We lost track of this screen" body="Your recent bridges show what happened — the bridge itself is unaffected." actions={<button onClick={onFinish} className="btn-primary w-full">Back to Bridge</button>} />;
  if (job?.status === 'done' && r && !r.ok) {
    if (r.code === 'PRICE_MOVED' && r.q) return <Outcome tone="warn" title="The rate moved" body={r.error || 'Review the new amount.'} actions={<><button onClick={() => onPriceMoved(r.q!)} className="btn-primary w-full">Review new amount</button><button onClick={onFinish} className="btn-ghost w-full">Cancel</button></>} />;
    if (r.code === 'OUTCOME_UNKNOWN') return <Outcome tone="warn" title="Sent — confirming" body={r.error || 'Your bridge is confirming.'} signature={r.txHash} actions={<>{r.orderId ? <button onClick={() => onSubmitted(r.orderId!)} className="btn-primary w-full">Track it</button> : null}<button onClick={onFinish} className="btn-ghost w-full">Close</button></>} />;
    return <Outcome tone="error" title="Not bridged" body={`${r.error || 'Something went wrong'}`} actions={<><button onClick={onFinish} className="btn-primary w-full">Try again</button><Link href="/app" onClick={onFinish} className="btn-ghost w-full">Check balances</Link></>} />;
  }
  return (
    <section className="surface rounded-3xl p-8 text-center animate-fade-up" aria-live="polite">
      <div className="relative mx-auto h-24 w-24"><span className="absolute inset-0 rounded-full border-4 border-cream-warm dark:border-night" /><span className="absolute inset-0 rounded-full border-4 border-terracotta border-t-transparent animate-spin" style={{ animationDuration: '1.1s' }} /><span className="absolute inset-0 grid place-items-center text-terracotta"><IconBridge size={30} /></span></div>
      <div className="font-display text-[22px] font-bold mt-5 text-ink dark:text-cream-warm">Sending your bridge</div>
      <p className="muted text-[14px] mt-1">{job?.meta.direction === 'out' ? 'Usually under a minute on Solana.' : 'Approving and sending can take a minute, longer on Ethereum.'}</p>
    </section>
  );
}

function Tracker({ orderId, onFinish }: { orderId: string; onFinish: () => void }) {
  const [o, setO] = useState<Order | null>(null);
  const [gone, setGone] = useState(false);
  useEffect(() => {
    let live = true; let t: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const x = await kc<Order>(`bridge/orders/${orderId}`); if (!live) return; setO(x);
        if (['fulfilled', 'cancelled', 'abandoned'].includes(x.status)) return;
      } catch (e) { if (e instanceof KcError && e.status === 404) { if (live) setGone(true); return; } }
      if (live) t = setTimeout(poll, 5000);
    };
    poll();
    return () => { live = false; clearTimeout(t); };
  }, [orderId]);
  if (gone) return <Outcome tone="info" title="Bridge not found" body="It may have been made from another account." actions={<button onClick={onFinish} className="btn-primary w-full">Back to Bridge</button>} />;
  const out = o?.direction === 'out';
  const dest = out ? (CHAIN_LABEL[o?.chainKey || ''] || o?.chainKey || 'the other chain') : 'Solana';
  const done = o?.status === 'fulfilled';
  const failed = o?.status === 'cancelled' || o?.status === 'abandoned';
  const steps = [
    { t: o ? (out ? `Sent ${fmt(o.amountIn, 2)} USDC` : `Sent ${fmt(o.amountIn, 6)} ${o.symbol || ''}`) : 'Sent', ok: !!o },
    { t: o?.status === 'stuck' ? `Crossing to ${dest} — taking longer than usual` : `Crossing to ${dest}`, ok: done, active: !!o && !done && !failed },
    { t: done ? (out ? `≈ ${fmt(o?.estOut ?? 0, 4)} ${o?.symbol || ''} delivered` : `≈ ${fmt(o?.estOut ?? 0, 2)} USDC in your wallet`) : (out ? 'Delivered' : 'USDC in your wallet'), ok: done },
  ];
  return (
    <section className="surface rounded-3xl p-6 animate-fade-up" aria-live="polite">
      <div className="text-center">
        <div className={`mx-auto grid place-items-center h-20 w-20 rounded-full ${done ? 'bg-[#58834C1A] text-[#58834C]' : failed ? 'bg-[#B84A401A] text-[#B84A40]' : 'bg-terracotta/10 text-terracotta'}`}>{done ? <IconCheck size={34} /> : <IconBridge size={30} />}</div>
        <div className="font-display text-[22px] font-bold mt-4 text-ink dark:text-cream-warm">{done ? 'Arrived' : failed ? 'Needs attention' : 'On its way'}</div>
        <p className="muted text-[14px] mt-1">{done ? (out ? `Delivered on ${dest}.` : 'Your USDC is ready to use.') : failed ? 'Our team has been alerted and will make sure your funds come back to you.' : 'You can leave this screen — we’ll message you on Telegram when it lands.'}</p>
      </div>
      <ol className="mt-6 space-y-3">
        {steps.map((s, i) => (
          <li key={i} className="flex items-center gap-3">
            <span className={`grid place-items-center h-7 w-7 rounded-full text-[12px] font-bold ${s.ok ? 'bg-[#58834C] text-white' : s.active ? 'bg-terracotta/15 text-terracotta' : 'bg-cream-warm dark:bg-night muted'}`}>{s.ok ? <IconCheck size={14} /> : s.active ? <span className="h-3 w-3 rounded-full border-2 border-terracotta border-t-transparent animate-spin" /> : i + 1}</span>
            <span className={`text-[14.5px] ${s.ok || s.active ? 'text-ink dark:text-cream-warm font-medium' : 'muted'}`}>{s.t}</span>
          </li>
        ))}
      </ol>
      {done && !out && (
        <div className="mt-6">
          <div className="text-[13px] muted mb-2 text-center">What next?</div>
          <div className="grid grid-cols-2 gap-2">
            {[{ href: '/app/withdraw', label: 'Withdraw to bank', Icon: IconBank }, { href: '/app/earn', label: 'Earn on it', Icon: IconLeaf },
              { href: '/app/send', label: 'Send to bank', Icon: IconSend }, { href: '/app/swap', label: 'Swap', Icon: IconSwap }].map(a => (
              <Link key={a.href} href={a.href} onClick={onFinish} className="surface rounded-2xl min-h-[56px] flex items-center justify-center gap-2 text-[14px] font-semibold text-ink dark:text-cream-warm border border-cream-border dark:border-night-border"><a.Icon size={18} />{a.label}</Link>
            ))}
          </div>
        </div>
      )}
      <div className="mt-6 grid gap-2">
        {done ? <Link href="/app" onClick={onFinish} className="btn-primary w-full">Done</Link> : <button onClick={onFinish} className="btn-ghost w-full">Back to Bridge</button>}
        <a href={`https://app.debridge.finance/order?orderId=${orderId}`} target="_blank" rel="noopener noreferrer" className="block text-center text-[13.5px] font-semibold text-terracotta min-h-[44px] leading-[44px]">Track on deBridge</a>
      </div>
    </section>
  );
}
