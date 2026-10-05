'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { kc, KcError, amount as fmt } from '@/lib/kc';
import { PageHeader } from '@/components/app/PageHeader';
import { Sheet, Skeleton, CopyButton } from '@/components/app/ui';
import { IconBridge, IconChevron, IconCheck } from '@/components/app/Icons';
import { newKey, store, read, HoldToConfirm, Outcome } from '@/components/app/money';

/**
 * Bridge — move money between chains (deBridge). Two directions, one layout:
 *   Bring in  — ETH/BNB/MATIC or USDC/USDT on Ethereum, BNB Chain, Polygon, Arbitrum, Robinhood Chain
 *               → USDC on Solana, spendable in Kobocent. Live (backend /api/v1/bridge, same engine as Telegram).
 *   Send out  — USDC → another chain. Same screen reversed; not executable yet.
 * Live quote, hold to bridge, then a tracker that follows the deBridge order until the USDC lands
 * (order progress is durable on the server — it survives refreshes and restarts).
 */

interface Asset { id: string; symbol: string; native: boolean; decimals: number; balance: number | null }
interface Chain { key: string; label: string; native: string; minRecommendedUsd: number; assets: Asset[] }
interface Order { direction: 'in' | 'out'; assetKey: string; chainKey: string; symbol: string | null; amountIn: number; estOut: number | null; orderId: string; srcTx: string | null; status: string; dlnStatus: string | null; createdAt: number; completedAt: number | null }
interface Options { in: { chains: Chain[]; evmAddress: string | null }; out: { available: boolean }; recent: Order[] }
interface Quote { assetKey: string; chainKey: string; chainLabel: string; symbol: string; native: string; amountIn: number; usdIn: number | null; receive: number; grossUsdc: number; kobocentFee: number; fixFee: number; gasEstimate: number; etaSeconds: number | null; minRecommendedUsd: number; smallWarning: boolean }
interface QErr { code?: string; error?: string; gasNeeded?: number; native?: string; address?: string }
interface Result { ok: boolean; code?: string; error?: string; txHash?: string | null; orderId?: string | null; amountSent?: number; reduced?: boolean; receive?: number; symbol?: string; chainLabel?: string; explorerUrl?: string | null; trackUrl?: string | null; q?: Quote }
interface Job { id: string; status: 'running' | 'done'; stage: string; meta: { assetKey: string; amount: number }; result: Result | null }

const JOB_KEY = 'kc-bridge-job';
const ORDER_KEY = 'kc-bridge-order';
const CHAIN_COLOR: Record<string, string> = { ETH: '#627EEA', BNB: '#F0B90B', POLYGON: '#8247E5', ARBITRUM: '#28A0F0', ROBINHOOD: '#58834C', SOLANA: '#20211F' };
const dpOf = (a: { native: boolean; symbol: string }) => (a.native ? 6 : 2);
const eta = (s: number | null) => (!s ? 'a few minutes' : s < 90 ? 'about a minute' : `about ${Math.round(s / 60)} minutes`);

export default function BridgePage() {
  const [opts, setOpts] = useState<Options | null>(null);
  const [error, setError] = useState('');
  const [needsLink, setNeedsLink] = useState(false);
  const [dir, setDir] = useState<'in' | 'out'>('in');
  const [chainKey, setChainKey] = useState('ARBITRUM');
  const [assetId, setAssetId] = useState('usdc_arb');
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
    // Start on the first chain/asset the user actually holds.
    const held = o.in.chains.flatMap(c => c.assets.filter(a => (a.balance || 0) > 0).map(a => ({ c: c.key, a: a.id })));
    if (held.length) { setChainKey(held[0].c); setAssetId(held[0].a); }
  }).catch(e => {
    if (e instanceof KcError && e.status === 409) setNeedsLink(true); else setError(e instanceof Error ? e.message : 'Could not load Bridge');
  }), []);
  useEffect(() => { setJobId(read(JOB_KEY)); setOrderId(read(ORDER_KEY)); load(); }, [load]);

  const chain = opts?.in.chains.find(c => c.key === chainKey) || null;
  const asset = chain?.assets.find(a => a.id === assetId) || chain?.assets[0] || null;
  const value = Number(amt) || 0;

  useEffect(() => {
    setQErr(null);
    if (dir !== 'in' || !asset || (!value && !useMax)) { setQuote(null); return; }
    let live = true; setBusy(true);
    const t = setTimeout(() => {
      kc<Quote>('bridge/quote', { method: 'POST', body: { assetKey: asset.id, amount: value, max: useMax } })
        .then(q => { if (!live) return; setQuote(q); if (useMax) setAmt(String(q.amountIn)); })
        .catch(e => { if (!live) return; setQuote(null); setQErr(e instanceof KcError ? (e.data as QErr) : { error: e instanceof Error ? e.message : 'No quote right now' }); })
        .finally(() => { if (live) setBusy(false); });
    }, 600);
    return () => { live = false; clearTimeout(t); };
  }, [dir, asset, value, useMax]);

  function pick(c: Chain, a: Asset) { setChainKey(c.key); setAssetId(a.id); setAmt(''); setUseMax(false); setQuote(null); setPicker(false); }

  async function start() {
    if (!quote) return;
    setStarting(true); setStartErr('');
    try {
      const job = await kc<Job>('bridge/execute', { method: 'POST', body: { assetKey: quote.assetKey, amount: quote.amountIn, expectReceive: quote.receive, idempotencyKey: keyRef.current } });
      setReview(false); store(JOB_KEY, job.id); setJobId(job.id);
    } catch (e) { setStartErr(e instanceof Error ? e.message : 'Could not start the bridge'); keyRef.current = newKey(); }
    finally { setStarting(false); }
  }
  function onSubmitted(oid: string | null) {
    store(JOB_KEY, null); setJobId(null);
    if (oid) { store(ORDER_KEY, oid); setOrderId(oid); }
  }
  function finish() {
    store(JOB_KEY, null); store(ORDER_KEY, null); setJobId(null); setOrderId(null);
    setAmt(''); setUseMax(false); setQuote(null); keyRef.current = newKey(); load();
  }

  if (needsLink) return <div className="space-y-6"><PageHeader title="Bridge" /><div className="surface rounded-3xl p-6 text-center"><p className="muted text-[15px] mb-4">Link your Telegram account to bridge from the web app.</p><Link href="/app/settings" className="btn-primary">Open Settings</Link></div></div>;

  const noBalances = opts && opts.in.chains.every(c => c.assets.every(a => !a.balance));

  return (
    <div className="space-y-6">
      <PageHeader title="Bridge" subtitle="Move money between chains — it lands as spendable USDC." />
      {jobId ? <BridgeJob jobId={jobId} onSubmitted={onSubmitted} onFinish={finish} onPriceMoved={(q) => { store(JOB_KEY, null); setJobId(null); setQuote(q); keyRef.current = newKey(); setReview(true); }} />
        : orderId ? <Tracker orderId={orderId} onFinish={finish} />
        : error ? <div className="surface rounded-2xl p-5 text-[15px]">{error}</div>
        : !opts || !chain || !asset ? <div className="space-y-3"><Skeleton className="h-12" /><Skeleton className="h-40" /><Skeleton className="h-28" /></div> : (
        <div className="space-y-4 animate-fade-up">
          <div role="tablist" className="grid grid-cols-2 gap-1 rounded-2xl bg-cream-warm dark:bg-night p-1">
            <button role="tab" aria-selected={dir === 'in'} onClick={() => setDir('in')} className={`min-h-[44px] rounded-xl text-[14.5px] font-semibold ${dir === 'in' ? 'bg-white dark:bg-night-card text-terracotta shadow-sm' : 'muted'}`}>Bring in</button>
            <button role="tab" aria-selected={dir === 'out'} onClick={() => setDir('out')} className={`min-h-[44px] rounded-xl text-[14.5px] font-semibold ${dir === 'out' ? 'bg-white dark:bg-night-card text-terracotta shadow-sm' : 'muted'}`}>Send out <span className="ml-1 rounded-full bg-terracotta/15 text-terracotta px-1.5 py-0.5 text-[10.5px] align-middle">SOON</span></button>
          </div>

          {dir === 'out' ? <OutSoon /> : (
            <>
              {noBalances && (
                <div className="rounded-2xl p-4 text-[13.5px]" style={{ background: '#C1502E12' }}>
                  Nothing to bring in yet. Receive ETH, BNB, MATIC, USDC or USDT to your 0x address first — <Link href="/app/add-money?tab=crypto" className="font-semibold text-terracotta">Add money → Crypto</Link>.
                </div>
              )}
              <section className="relative">
                <div className="surface rounded-3xl p-5">
                  <div className="flex items-center justify-between text-[13px] muted"><span>From</span>
                    <span>Balance {asset.balance === null ? '—' : fmt(asset.balance, dpOf(asset))}{(asset.balance || 0) > 0 && <button onClick={() => { setUseMax(true); setAmt(''); }} className="ml-2 font-semibold text-terracotta">Max</button>}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <input value={amt} onChange={e => { setUseMax(false); let s = e.target.value.replace(/[^\d.]/g, ''); const [i, ...r] = s.split('.'); s = r.length ? `${i}.${r.join('').slice(0, 6)}` : i; setAmt(s.slice(0, 14)); }}
                      inputMode="decimal" placeholder="0" aria-label={`Amount of ${asset.symbol}`} className="flex-1 min-w-0 bg-transparent outline-none font-display font-bold text-[36px] text-ink dark:text-cream-warm" />
                    <button onClick={() => setPicker(true)} className="inline-flex items-center gap-2 rounded-full bg-cream-warm dark:bg-night pl-1.5 pr-3 min-h-[44px] font-semibold text-[15px] text-ink dark:text-cream-warm">
                      <span className="grid place-items-center h-8 w-8 rounded-full text-white text-[11px] font-bold" style={{ background: CHAIN_COLOR[chain.key] }}>{asset.native ? asset.symbol.slice(0, 1) : '$'}</span>
                      <span className="text-left leading-tight">{asset.symbol}<span className="block text-[11px] muted font-normal">{chain.label}</span></span><IconChevron size={14} className="rotate-90 muted" />
                    </button>
                  </div>
                  {quote?.usdIn && <div className="text-[13px] muted">≈ ${fmt(quote.usdIn, 2)}</div>}
                </div>
                <div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 grid place-items-center h-12 w-12 rounded-2xl bg-terracotta text-white shadow-card"><IconBridge size={20} className="rotate-90" /></div>
                <div className="surface rounded-3xl p-5 mt-2">
                  <div className="text-[13px] muted">To · your Kobocent balance</div>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="flex-1 min-w-0 font-display font-bold text-[36px] tabular-nums text-ink dark:text-cream-warm truncate">
                      {!value && !useMax ? <span className="text-cream-border dark:text-night-border">0</span> : busy || !quote ? <span className="inline-block h-9 w-32 rounded-xl bg-cream-warm dark:bg-night animate-pulse align-middle" /> : `≈ ${fmt(quote.receive, 2)}`}
                    </div>
                    <span className="inline-flex items-center gap-2 rounded-full bg-cream-warm dark:bg-night pl-1.5 pr-3 min-h-[44px] font-semibold text-[15px]"><span className="grid place-items-center h-8 w-8 rounded-full text-white text-[11px] font-bold" style={{ background: '#2775CA' }}>$</span>USDC</span>
                  </div>
                </div>
              </section>

              {qErr && <QuoteError e={qErr} />}
              {quote && !qErr && (
                <>
                  <dl className="surface rounded-2xl p-4 grid grid-cols-2 gap-y-1.5 text-[13.5px]">
                    <dt className="muted">You receive</dt><dd className="text-right font-mono font-semibold">≈ {fmt(quote.receive, 2)} USDC</dd>
                    <dt className="muted">Kobocent fee</dt><dd className="text-right font-mono">{fmt(quote.kobocentFee, 2)} USDC</dd>
                    <dt className="muted">Bridge fee</dt><dd className="text-right font-mono">{fmt(quote.fixFee, 6)} {quote.native}</dd>
                    <dt className="muted">Network gas</dt><dd className="text-right">≈ {fmt(quote.gasEstimate, 6)} {quote.native}</dd>
                    <dt className="muted">Arrives in</dt><dd className="text-right">{eta(quote.etaSeconds)}</dd>
                  </dl>
                  {quote.smallWarning && <p className="text-[13px] text-[#B68B2A] px-1">Small bridges lose a big share to fixed network fees — on {quote.chainLabel} we recommend at least ~${quote.minRecommendedUsd}.</p>}
                </>
              )}
              <button disabled={!quote || busy || !!qErr} onClick={() => { setStartErr(''); setReview(true); }} className="btn-primary w-full min-h-[56px] text-[16px] disabled:opacity-40 disabled:pointer-events-none">
                {!value && !useMax ? 'Enter an amount' : busy ? 'Finding the best route…' : qErr ? 'Adjust the amount' : 'Review bridge'}
              </button>
            </>
          )}

          {opts.recent.length > 0 && (
            <section>
              <div className="eyebrow mb-2">Recent bridges</div>
              <ul className="surface rounded-2xl divide-y divide-cream-border dark:divide-night-border px-4">
                {opts.recent.map(o => (
                  <li key={o.orderId}>
                    <button onClick={() => { store(ORDER_KEY, o.orderId); setOrderId(o.orderId); }} className="w-full flex items-center gap-3 py-3 text-left min-h-[56px]">
                      <span className="grid place-items-center h-9 w-9 rounded-xl text-white text-[11px] font-bold" style={{ background: CHAIN_COLOR[o.chainKey] || '#C1502E' }}>{(o.symbol || '?').slice(0, 1)}</span>
                      <span className="flex-1 min-w-0"><span className="block text-[14.5px] font-medium">{fmt(o.amountIn, 4)} {o.symbol} → USDC</span><span className="text-[12px] muted">{new Date(o.createdAt).toLocaleString()}</span></span>
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
        <Sheet open={picker} onClose={() => setPicker(false)} title="Bring in from">
          <div className="space-y-4">
            {opts.in.chains.map(c => (
              <div key={c.key}>
                <div className="text-[12px] muted mb-1.5 flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: CHAIN_COLOR[c.key] }} />{c.label}</div>
                <ul className="space-y-1.5">
                  {c.assets.map(a => (
                    <li key={a.id}><button onClick={() => pick(c, a)} className={`w-full flex items-center gap-3 rounded-2xl border px-4 min-h-[52px] ${a.id === asset?.id ? 'border-terracotta' : 'border-cream-border dark:border-night-border'}`}>
                      <span className="flex-1 text-left font-semibold">{a.symbol}{a.native && <span className="muted text-[12px] font-normal"> · network coin</span>}</span>
                      <span className="font-mono text-[13.5px] muted">{a.balance === null ? '—' : fmt(a.balance, dpOf(a))}</span>
                    </button></li>
                  ))}
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
              <div className="text-center"><div className="font-display font-bold text-[24px]">{fmt(quote.amountIn, 6)}</div><div className="muted text-[13px]">{quote.symbol} · {quote.chainLabel}</div></div>
              <IconBridge size={22} className="text-terracotta" />
              <div className="text-center"><div className="font-display font-bold text-[24px]">≈ {fmt(quote.receive, 2)}</div><div className="muted text-[13px]">USDC · Kobocent</div></div>
            </div>
            <p className="text-center muted text-[13px]">Plus {fmt(quote.fixFee, 6)} {quote.native} bridge fee and network gas, paid from your {quote.native} on {quote.chainLabel}. Arrives in {eta(quote.etaSeconds)}; the final amount can shift slightly with the market.</p>
            {startErr && <div className="mt-3 text-[14px] text-[#B84A40]">{startErr}</div>}
            <div className="mt-5"><HoldToConfirm label="Hold to bridge" busy={starting} onConfirm={start} /></div>
          </>
        )}
      </Sheet>
    </div>
  );
}

function OutSoon() {
  return (
    <section className="space-y-3">
      <div className="relative">
        <div className="surface rounded-3xl p-5 opacity-60">
          <div className="text-[13px] muted">From · your Kobocent balance</div>
          <div className="mt-2 font-display font-bold text-[36px] text-cream-border dark:text-night-border">0</div>
          <div className="text-[13px] muted">USDC</div>
        </div>
        <div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 grid place-items-center h-12 w-12 rounded-2xl bg-terracotta/60 text-white"><IconBridge size={20} className="rotate-90" /></div>
        <div className="surface rounded-3xl p-5 mt-2 opacity-60">
          <div className="text-[13px] muted">To · Ethereum, BNB Chain, Polygon, Arbitrum…</div>
          <div className="mt-2 font-display font-bold text-[36px] text-cream-border dark:text-night-border">0</div>
          <div className="text-[13px] muted">USDC or USDT</div>
        </div>
      </div>
      <div className="surface rounded-2xl p-4 text-[14px] leading-relaxed">
        <div className="font-semibold text-ink dark:text-cream-warm">Sending out is coming soon</div>
        <p className="muted mt-1">Move your USDC to Ethereum, BNB Chain, Polygon or Arbitrum in one step. Until then, <Link href="/app/send-wallet" className="font-semibold text-terracotta">Send to wallet</Link> moves crypto on the network it’s already on.</p>
      </div>
    </section>
  );
}

function QuoteError({ e }: { e: QErr }) {
  if (e.code === 'NEEDS_GAS' && e.address) {
    return (
      <div className="rounded-2xl p-4 text-[13.5px]" style={{ background: '#B68B2A14' }}>
        <div className="text-[#B68B2A] font-semibold">{e.error}</div>
        {e.gasNeeded ? <div className="mt-1">Add about <b>{fmt(e.gasNeeded, 6)} {e.native}</b> to:</div> : null}
        <div className="mt-2 font-mono text-[12.5px] break-all">{e.address}</div>
        <div className="mt-2"><CopyButton value={e.address} label="Copy address" /></div>
      </div>
    );
  }
  return <div className="text-[13.5px] text-[#B84A40] px-1">{e.error || 'Adjust the amount'}</div>;
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
  if (lost) return <Outcome tone="info" title="We lost track of this screen" body="Your recent bridges below show what happened — the bridge itself is unaffected." actions={<button onClick={onFinish} className="btn-primary w-full">Back to Bridge</button>} />;
  if (job?.status === 'done' && r && !r.ok) {
    if (r.code === 'PRICE_MOVED' && r.q) return <Outcome tone="warn" title="The rate moved" body={r.error || 'Review the new amount.'} actions={<><button onClick={() => onPriceMoved(r.q!)} className="btn-primary w-full">Review new amount</button><button onClick={onFinish} className="btn-ghost w-full">Cancel</button></>} />;
    if (r.code === 'OUTCOME_UNKNOWN') return <Outcome tone="warn" title="Sent — confirming" body={r.error || 'Your bridge is confirming.'} signature={r.txHash} actions={<>{r.orderId ? <button onClick={() => onSubmitted(r.orderId!)} className="btn-primary w-full">Track it</button> : null}<button onClick={onFinish} className="btn-ghost w-full">Close</button></>} />;
    if (r.code === 'NEEDS_GAS') return <Outcome tone="warn" title="Network fee needed" body={`${r.error}.`} actions={<button onClick={onFinish} className="btn-primary w-full">Back</button>} />;
    return <Outcome tone="error" title="Not bridged" body={`${r.error || 'Something went wrong'}.`} actions={<><button onClick={onFinish} className="btn-primary w-full">Try again</button><Link href="/app" onClick={onFinish} className="btn-ghost w-full">Check balances</Link></>} />;
  }
  return (
    <section className="surface rounded-3xl p-8 text-center animate-fade-up" aria-live="polite">
      <div className="relative mx-auto h-24 w-24"><span className="absolute inset-0 rounded-full border-4 border-cream-warm dark:border-night" /><span className="absolute inset-0 rounded-full border-4 border-terracotta border-t-transparent animate-spin" style={{ animationDuration: '1.1s' }} /><span className="absolute inset-0 grid place-items-center text-terracotta"><IconBridge size={30} /></span></div>
      <div className="font-display text-[22px] font-bold mt-5 text-ink dark:text-cream-warm">Sending your bridge</div>
      <p className="muted text-[14px] mt-1">Approving and sending can take a minute, longer on Ethereum.</p>
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
  const done = o?.status === 'fulfilled';
  const failed = o?.status === 'cancelled' || o?.status === 'abandoned';
  const steps = [
    { t: `Sent${o ? ` ${fmt(o.amountIn, 6)} ${o.symbol || ''}` : ''}`, ok: !!o },
    { t: o?.status === 'stuck' ? 'Crossing to Solana — taking longer than usual' : 'Crossing to Solana', ok: done, active: !!o && !done && !failed },
    { t: done ? `≈ ${fmt(o?.estOut ?? 0, 2)} USDC in your wallet` : 'USDC in your wallet', ok: done },
  ];
  return (
    <section className="surface rounded-3xl p-6 animate-fade-up" aria-live="polite">
      <div className="text-center">
        <div className={`mx-auto grid place-items-center h-20 w-20 rounded-full ${done ? 'bg-[#58834C1A] text-[#58834C]' : failed ? 'bg-[#B84A401A] text-[#B84A40]' : 'bg-terracotta/10 text-terracotta'}`}>{done ? <IconCheck size={34} /> : <IconBridge size={30} />}</div>
        <div className="font-display text-[22px] font-bold mt-4 text-ink dark:text-cream-warm">{done ? 'Arrived' : failed ? 'Needs attention' : 'On its way'}</div>
        <p className="muted text-[14px] mt-1">{done ? 'Your USDC is ready to spend.' : failed ? 'Our team has been alerted and will make sure your funds come back to you.' : 'You can leave this screen — we’ll message you on Telegram when it lands.'}</p>
      </div>
      <ol className="mt-6 space-y-3">
        {steps.map((s, i) => (
          <li key={i} className="flex items-center gap-3">
            <span className={`grid place-items-center h-7 w-7 rounded-full text-[12px] font-bold ${s.ok ? 'bg-[#58834C] text-white' : s.active ? 'bg-terracotta/15 text-terracotta' : 'bg-cream-warm dark:bg-night muted'}`}>{s.ok ? <IconCheck size={14} /> : s.active ? <span className="h-3 w-3 rounded-full border-2 border-terracotta border-t-transparent animate-spin" /> : i + 1}</span>
            <span className={`text-[14.5px] ${s.ok || s.active ? 'text-ink dark:text-cream-warm font-medium' : 'muted'}`}>{s.t}</span>
          </li>
        ))}
      </ol>
      <div className="mt-6 grid gap-2">
        {done ? <Link href="/app" onClick={onFinish} className="btn-primary w-full">Done</Link> : <button onClick={onFinish} className="btn-ghost w-full">Back to Bridge</button>}
        <a href={`https://app.debridge.finance/order?orderId=${orderId}`} target="_blank" rel="noopener noreferrer" className="block text-center text-[13.5px] font-semibold text-terracotta min-h-[44px] leading-[44px]">Track on deBridge</a>
      </div>
    </section>
  );
}
