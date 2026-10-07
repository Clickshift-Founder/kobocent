'use client';
import { ErrorNote } from '@/components/app/ErrorNote';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { kc, KcError, amount as fmt } from '@/lib/kc';
import { PageHeader } from '@/components/app/PageHeader';
import { Sheet, Skeleton, CopyButton } from '@/components/app/ui';
import { IconWallet, IconChevron, IconShield } from '@/components/app/Icons';
import { newKey, store, read, HoldToConfirm, Outcome } from '@/components/app/money';

/**
 * Send to wallet — SOL, USDC, USDT and the native coins / stablecoins on Ethereum, BNB Chain,
 * Polygon, Arbitrum and Robinhood Chain. Backend /api/v1/transfer (src/services/transfer.js — same
 * money steps as the Telegram transfer). Address checked as you paste (network, checksum, your own
 * wallet, program addresses); amount quoted live against the chain; review with the full address
 * highlighted; hold to send; server job (resumable, idempotency key).
 */

interface Asset { id: string; symbol: string; native: boolean; decimals: number; balance: number | null }
interface Chain { key: string; label: string; native: string; kind: 'solana' | 'evm'; available: boolean; assets: Asset[] }
interface Options { chains: Chain[]; feePct: number; addresses: { solana: string | null; evm: string | null } }
interface Quote { assetId: string; chain: string; chainLabel: string; symbol: string; amount: number; fee: number; receive: number; feePct: number; destination: string | null; maxSendable: number; networkFee: { paidIn: string; estimate: number; oneTimeAccount?: boolean }; usdPrice: number | null }
interface QErr { code?: string; error?: string; gasNeeded?: number; native?: string; address?: string; maxSendable?: number }
interface Result { ok: boolean; code?: string; error?: string; txHash?: string | null; explorerUrl?: string | null; amount?: number; receive?: number; fee?: number; feeCollected?: boolean; symbol?: string; chainLabel?: string; destination?: string }
interface Job { id: string; status: 'running' | 'done'; stage: string; meta: { assetId: string; amount: number; destination: string }; result: Result | null }

const JOB_KEY = 'kc-transfer-job';
const RECENT_KEY = 'kc-transfer-recent';
const CHAIN_COLOR: Record<string, string> = { SOLANA: '#20211F', ETH: '#627EEA', BNB: '#F0B90B', POLYGON: '#8247E5', ARBITRUM: '#28A0F0', ROBINHOOD: '#58834C' };
const dpOf = (a: Asset) => (a.native ? (a.symbol === 'SOL' ? 4 : 6) : 2);

interface Recent { chain: string; address: string; at: number }
function loadRecent(): Recent[] { try { return JSON.parse(window.localStorage.getItem(RECENT_KEY) || '[]'); } catch { return []; } }
function saveRecent(chain: string, address: string) {
  try {
    const list = [{ chain, address, at: Date.now() }, ...loadRecent().filter(r => !(r.chain === chain && r.address === address))].slice(0, 8);
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch { /* private mode */ }
}

/** Address with the first and last 6 characters emphasised — what people actually compare. */
function Addr({ a, className = '' }: { a: string; className?: string }) {
  if (a.length < 14) return <span className={`font-mono break-all ${className}`}>{a}</span>;
  return (
    <span className={`font-mono break-all ${className}`}>
      <b className="text-terracotta">{a.slice(0, 6)}</b><span className="muted">{a.slice(6, -6)}</span><b className="text-terracotta">{a.slice(-6)}</b>
    </span>
  );
}

export default function SendWalletPage() {
  const [opts, setOpts] = useState<Options | null>(null);
  const [error, setError] = useState('');
  const [needsLink, setNeedsLink] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [chainKey, setChainKey] = useState('SOLANA');
  const [assetId, setAssetId] = useState('usdc_sol');
  const [addr, setAddr] = useState('');
  const [addrState, setAddrState] = useState<{ ok: boolean; address?: string; error?: string } | null>(null);
  const [checking, setChecking] = useState(false);
  const [amt, setAmt] = useState('');
  const [useMax, setUseMax] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [qErr, setQErr] = useState<QErr | null>(null);
  const [busy, setBusy] = useState(false);
  const [review, setReview] = useState(false);
  const [checked, setChecked] = useState(false);
  const [starting, setStarting] = useState(false);
  const [startErr, setStartErr] = useState('');
  const [recent, setRecent] = useState<Recent[]>([]);
  const [assetSheet, setAssetSheet] = useState(false);
  const keyRef = useRef(newKey());

  const load = useCallback(() => kc<Options>('transfer').then(setOpts).catch(e => {
    if (e instanceof KcError && e.status === 409) setNeedsLink(true); else setError(e instanceof Error ? e.message : 'Could not load your wallets');
  }), []);
  useEffect(() => { const s = read(JOB_KEY); if (s) setJobId(s); setRecent(loadRecent()); load(); }, [load]);

  const chain = opts?.chains.find(c => c.key === chainKey) || null;
  const asset = chain?.assets.find(a => a.id === assetId) || chain?.assets[0] || null;
  const value = Number(amt) || 0;

  function pickChain(k: string) {
    const c = opts?.chains.find(x => x.key === k);
    if (!c) return;
    setChainKey(k);
    const stable = c.assets.find(a => a.symbol === 'USDC') || c.assets[0];
    setAssetId(stable.id); setAddr(''); setAddrState(null); setAmt(''); setUseMax(false); setQuote(null); setQErr(null);
  }

  // Address check as you paste/type.
  useEffect(() => {
    setAddrState(null);
    const a = addr.trim();
    if (!asset || a.length < 26) return;
    let live = true; setChecking(true);
    const t = setTimeout(() => {
      kc<{ ok: boolean; address?: string; error?: string }>('transfer/address', { method: 'POST', body: { assetId: asset.id, destination: a } })
        .then(r => { if (live) setAddrState(r); })
        .catch(e => { if (live) setAddrState({ ok: false, error: e instanceof Error ? e.message : 'Could not check this address' }); })
        .finally(() => { if (live) setChecking(false); });
    }, 350);
    return () => { live = false; clearTimeout(t); };
  }, [addr, asset]);

  // Live quote.
  useEffect(() => {
    setQErr(null);
    if (!asset || (!value && !useMax)) { setQuote(null); return; }
    let live = true; setBusy(true);
    const t = setTimeout(() => {
      kc<Quote>('transfer/quote', { method: 'POST', body: { assetId: asset.id, amount: value, max: useMax, destination: addrState?.ok ? addrState.address : undefined } })
        .then(q => { if (!live) return; setQuote(q); if (useMax) setAmt(String(q.amount)); })
        .catch(e => { if (!live) return; setQuote(null); setQErr(e instanceof KcError ? (e.data as QErr) : { error: e instanceof Error ? e.message : 'No quote right now' }); })
        .finally(() => { if (live) setBusy(false); });
    }, 450);
    return () => { live = false; clearTimeout(t); };
  }, [asset, value, useMax, addrState]);

  const recentHere = useMemo(() => recent.filter(r => r.chain === chainKey).slice(0, 3), [recent, chainKey]);
  const ready = !!quote && !busy && !!addrState?.ok && !qErr;
  const isNew = addrState?.ok && !recent.some(r => r.chain === chainKey && r.address === addrState.address);

  async function paste() {
    try { const t = await navigator.clipboard.readText(); if (t) setAddr(t.trim()); } catch { /* clipboard blocked — user types */ }
  }

  async function start() {
    if (!quote || !addrState?.address) return;
    setStarting(true); setStartErr('');
    try {
      const job = await kc<Job>('transfer/send', { method: 'POST', body: { assetId: quote.assetId, amount: quote.amount, destination: addrState.address, idempotencyKey: keyRef.current } });
      saveRecent(chainKey, addrState.address);
      setReview(false); store(JOB_KEY, job.id); setJobId(job.id);
    } catch (e) { setStartErr(e instanceof Error ? e.message : 'Could not start the transfer'); keyRef.current = newKey(); }
    finally { setStarting(false); }
  }

  function finish() {
    store(JOB_KEY, null); setJobId(null); setAmt(''); setUseMax(false); setQuote(null); setChecked(false);
    keyRef.current = newKey(); setRecent(loadRecent()); load();
  }

  if (needsLink) return <div className="space-y-6"><PageHeader title="Send to wallet" /><div className="surface rounded-3xl p-6 text-center"><p className="muted text-[15px] mb-4">Link your Telegram account to send from the web app.</p><Link href="/app/settings" className="btn-primary">Open Settings</Link></div></div>;

  return (
    <div className="space-y-6">
      <PageHeader title="Send to wallet" subtitle="Move crypto to any wallet or exchange — on six networks." />
      {jobId ? <TransferProgress jobId={jobId} onFinish={finish} />
        : error ? <div className="surface rounded-2xl p-5 text-[15px]">{error}</div>
        : !opts || !chain || !asset ? <div className="space-y-3"><Skeleton className="h-14" /><Skeleton className="h-28" /><Skeleton className="h-36" /></div> : (
        <div className="space-y-5 animate-fade-up">
          {/* Network */}
          <section>
            <div className="text-[13px] muted mb-2">Network</div>
            <div className="-mx-4 px-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
              {opts.chains.map(c => (
                <button key={c.key} onClick={() => pickChain(c.key)} disabled={!c.available}
                  className={`shrink-0 inline-flex items-center gap-2 rounded-full min-h-[44px] px-4 text-[14px] font-semibold border transition ${chainKey === c.key ? 'border-terracotta bg-terracotta/10 text-terracotta' : 'border-cream-border dark:border-night-border'} disabled:opacity-40`}>
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: CHAIN_COLOR[c.key] || '#C1502E' }} />{c.label}
                </button>
              ))}
            </div>
          </section>

          {/* Asset */}
          <button onClick={() => setAssetSheet(true)} className="surface rounded-3xl p-4 w-full flex items-center gap-3 text-left min-h-[64px]">
            <span className="grid place-items-center h-10 w-10 rounded-full text-white text-[13px] font-bold" style={{ background: CHAIN_COLOR[chain.key] }}>{asset.native ? asset.symbol.slice(0, 1) : '$'}</span>
            <span className="flex-1 min-w-0"><span className="block font-semibold text-[16px] text-ink dark:text-cream-warm">{asset.symbol}</span><span className="muted text-[13px]">on {chain.label}</span></span>
            <span className="text-right"><span className="block font-mono text-[15px]">{asset.balance === null ? '—' : fmt(asset.balance, dpOf(asset))}</span><span className="muted text-[12px]">available</span></span>
            <IconChevron size={16} className="muted" />
          </button>

          {/* Recipient */}
          <section className="surface rounded-3xl p-4">
            <div className="flex items-center justify-between"><label htmlFor="dest" className="text-[13px] muted">To ({chain.kind === 'solana' ? 'Solana address' : '0x address'})</label>
              <button onClick={paste} className="text-[13px] font-semibold text-terracotta min-h-[44px] px-2">Paste</button></div>
            <textarea id="dest" value={addr} onChange={e => setAddr(e.target.value.replace(/\s+/g, ''))} rows={2} spellCheck={false} autoCapitalize="off" autoCorrect="off"
              placeholder={chain.kind === 'solana' ? 'e.g. 7xKX…' : '0x…'} className="mt-1 w-full resize-none bg-transparent outline-none font-mono text-[15px] break-all text-ink dark:text-cream-warm" />
            {checking && <div className="text-[13px] muted">Checking…</div>}
            {addrState && !addrState.ok && <div className="text-[13px] text-[#B84A40]">{addrState.error}</div>}
            {addrState?.ok && <div className="text-[13px] text-[#58834C] flex items-center gap-1.5"><IconShield size={14} />Valid {chain.label} address{isNew ? ' · new — double-check it' : ' · sent before'}</div>}
            {!addr && recentHere.length > 0 && (
              <div className="mt-2 space-y-1.5">
                <div className="text-[12px] muted">Recent</div>
                {recentHere.map(r => (
                  <button key={r.address} onClick={() => setAddr(r.address)} className="w-full text-left rounded-xl border border-cream-border dark:border-night-border px-3 min-h-[44px] text-[13px]"><Addr a={r.address} /></button>
                ))}
              </div>
            )}
          </section>

          {/* Amount */}
          <section className="surface rounded-3xl p-4">
            <div className="flex items-center justify-between text-[13px] muted"><span>Amount</span>
              {asset.balance !== null && asset.balance > 0 && <button onClick={() => { setUseMax(true); setAmt(''); }} className="font-semibold text-terracotta min-h-[44px] px-2">Max</button>}
            </div>
            <div className="flex items-baseline gap-2">
              <input value={amt} onChange={e => { setUseMax(false); let s = e.target.value.replace(/[^\d.]/g, ''); const [i, ...r] = s.split('.'); s = r.length ? `${i}.${r.join('').slice(0, Math.min(asset.decimals, 8))}` : i; setAmt(s.slice(0, 16)); }}
                inputMode="decimal" placeholder="0" aria-label={`Amount of ${asset.symbol}`} className="flex-1 min-w-0 bg-transparent outline-none font-display font-bold text-[36px] text-ink dark:text-cream-warm" />
              <span className="font-semibold muted">{asset.symbol}</span>
            </div>
            {quote?.usdPrice && value > 0 && <div className="text-[13px] muted">≈ ${fmt(value * quote.usdPrice, 2)}</div>}
            {qErr && <QuoteError e={qErr} chainLabel={chain.label} />}
          </section>

          {quote && !qErr && (
            <dl className="surface rounded-2xl p-4 grid grid-cols-2 gap-y-1.5 text-[13.5px]">
              <dt className="muted">They receive</dt><dd className="text-right font-mono font-semibold">{fmt(quote.receive, 6)} {quote.symbol}</dd>
              <dt className="muted">Kobocent fee ({quote.feePct}%)</dt><dd className="text-right font-mono">{fmt(quote.fee, 6)} {quote.symbol}</dd>
              <dt className="muted">Network fee</dt><dd className="text-right">≈ {fmt(quote.networkFee.estimate, 6)} {quote.networkFee.paidIn}</dd>
              {quote.networkFee.oneTimeAccount && (<><dt className="muted col-span-2 text-[12.5px] text-[#B68B2A]">First {quote.symbol} to this wallet: includes a one-time account fee (0.002 SOL).</dt></>)}
            </dl>
          )}

          <button disabled={!ready} onClick={() => { setStartErr(''); setChecked(false); setReview(true); }} className="btn-primary w-full min-h-[56px] text-[16px] disabled:opacity-40 disabled:pointer-events-none">
            {!addrState?.ok ? 'Add a valid address' : !value && !useMax ? 'Enter an amount' : busy ? 'Checking…' : qErr ? 'Fix the amount' : 'Review'}
          </button>
          <p className="text-center muted text-[12.5px] px-4">Onchain transfers can’t be reversed. Only send to a {chain.label} address — sending to the wrong network can lose the funds.</p>
        </div>
      )}

      {opts && chain && (
        <Sheet open={assetSheet} onClose={() => setAssetSheet(false)} title={`Send on ${chain.label}`}>
          <ul className="space-y-2">
            {chain.assets.map(a => (
              <li key={a.id}><button onClick={() => { setAssetId(a.id); setAssetSheet(false); setAmt(''); setUseMax(false); setQuote(null); setAddrState(null); setAddr(addr); }}
                className={`w-full flex items-center gap-3 rounded-2xl border px-4 min-h-[60px] ${a.id === asset?.id ? 'border-terracotta' : 'border-cream-border dark:border-night-border'}`}>
                <span className="grid place-items-center h-9 w-9 rounded-full text-white text-[12px] font-bold" style={{ background: CHAIN_COLOR[chain.key] }}>{a.native ? a.symbol.slice(0, 1) : '$'}</span>
                <span className="flex-1 text-left font-semibold">{a.symbol}{a.native && <span className="muted text-[12px] font-normal"> · network coin</span>}</span>
                <span className="font-mono text-[13.5px] muted">{a.balance === null ? '—' : fmt(a.balance, dpOf(a))}</span>
              </button></li>
            ))}
          </ul>
        </Sheet>
      )}

      <Sheet open={review} onClose={() => !starting && setReview(false)} title="Review transfer">
        {quote && addrState?.address && chain && (
          <>
            <div className="text-center py-2">
              <div className="muted text-[13px]">They receive</div>
              <div className="font-display font-bold text-[32px] tabular-nums">{fmt(quote.receive, 6)} {quote.symbol}</div>
              <div className="muted text-[13px]">on {quote.chainLabel}</div>
            </div>
            <div className="rounded-2xl border border-cream-border dark:border-night-border p-4">
              <div className="text-[12px] muted mb-1">To</div>
              <Addr a={addrState.address} className="text-[14.5px] leading-relaxed" />
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-y-1 text-[13.5px]">
              <dt className="muted">You send</dt><dd className="text-right font-mono">{fmt(quote.amount, 6)} {quote.symbol}</dd>
              <dt className="muted">Fee ({quote.feePct}%)</dt><dd className="text-right font-mono">{fmt(quote.fee, 6)}</dd>
              <dt className="muted">Network fee</dt><dd className="text-right">≈ {fmt(quote.networkFee.estimate, 6)} {quote.networkFee.paidIn}</dd>
            </dl>
            <label className="mt-4 flex items-start gap-3 rounded-2xl bg-cream-warm dark:bg-night p-3 min-h-[44px] cursor-pointer">
              <input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)} className="mt-1 h-5 w-5 accent-[#C1502E]" />
              <span className="text-[13.5px]">I’ve checked the first and last characters, and this is a <b>{quote.chainLabel}</b> address. Transfers can’t be reversed.</span>
            </label>
            <ErrorNote msg={startErr} className="mt-3 text-[14px] text-[#B84A40]" />
            <div className="mt-4">{checked ? <HoldToConfirm label="Hold to send" busy={starting} onConfirm={start} /> : <button disabled className="btn-primary w-full min-h-[56px] opacity-40">Tick the box to continue</button>}</div>
          </>
        )}
      </Sheet>
    </div>
  );
}

function QuoteError({ e, chainLabel }: { e: QErr; chainLabel: string }) {
  if (e.code === 'NEEDS_GAS' && e.address) {
    return (
      <div className="mt-2 rounded-2xl p-3 text-[13.5px]" style={{ background: '#B68B2A14' }}>
        <div className="text-[#B68B2A] font-semibold">{e.error}</div>
        {e.gasNeeded ? <div className="mt-1">Add about <b>{fmt(e.gasNeeded, 6)} {e.native}</b> to your {chainLabel} address:</div> : null}
        <div className="mt-2 font-mono text-[12.5px] break-all">{e.address}</div>
        <div className="mt-2"><CopyButton value={e.address} label="Copy address" /></div>
      </div>
    );
  }
  return <div className="mt-1 text-[13px] text-[#B84A40]">{e.error || 'Check the amount'}</div>;
}

function TransferProgress({ jobId, onFinish }: { jobId: string; onFinish: () => void }) {
  const [job, setJob] = useState<Job | null>(null);
  const [lost, setLost] = useState(false);
  useEffect(() => {
    let live = true; let misses = 0; let t: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try { const j = await kc<Job>(`transfer/jobs/${jobId}`); if (!live) return; misses = 0; setJob(j); if (j.status === 'done') return; }
      catch (e) { if (e instanceof KcError && e.status === 404) { if (live) setLost(true); return; } misses++; }
      if (live) t = setTimeout(poll, misses ? Math.min(8000, 1500 * misses) : 1200);
    };
    poll();
    return () => { live = false; clearTimeout(t); };
  }, [jobId]);
  const explorer = (r: Result) => r.explorerUrl ? <a href={r.explorerUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost w-full">View on explorer</a> : null;
  if (lost) return <Outcome tone="info" title="We lost track of this screen" body="Check your balance on Home — the transfer itself is unaffected." actions={<><Link href="/app" onClick={onFinish} className="btn-primary w-full">Go to Home</Link><button onClick={onFinish} className="btn-ghost w-full">Close</button></>} />;
  const r = job?.result;
  if (job?.status === 'done' && r) {
    if (r.ok) return <Outcome tone="success" title="Sent" body={`${fmt(r.receive ?? 0, 6)} ${r.symbol} is on its way on ${r.chainLabel}.`} signature={r.txHash} actions={<>{explorer(r)}<Link href="/app" onClick={onFinish} className="btn-primary w-full">Done</Link><button onClick={onFinish} className="block w-full text-center text-[14px] font-semibold text-terracotta min-h-[44px]">Send again</button></>} />;
    if (r.code === 'OUTCOME_UNKNOWN') return <Outcome tone="warn" title="Sent — confirming" body={`${r.error || 'Your transfer is being confirmed.'}`} signature={r.txHash} actions={<>{explorer(r)}<Link href="/app" onClick={onFinish} className="btn-primary w-full">Check balance</Link></>} />;
    return <Outcome tone="error" title="Not sent" body={`${r.error || 'Something went wrong'}.`} actions={<><button onClick={onFinish} className="btn-primary w-full">Try again</button><Link href="/app" onClick={onFinish} className="btn-ghost w-full">Check balance</Link></>} />;
  }
  return (
    <section className="surface rounded-3xl p-8 text-center animate-fade-up" aria-live="polite">
      <div className="relative mx-auto h-24 w-24"><span className="absolute inset-0 rounded-full border-4 border-cream-warm dark:border-night" /><span className="absolute inset-0 rounded-full border-4 border-terracotta border-t-transparent animate-spin" style={{ animationDuration: '1.1s' }} /><span className="absolute inset-0 grid place-items-center text-terracotta"><IconWallet size={30} /></span></div>
      <div className="font-display text-[22px] font-bold mt-5 text-ink dark:text-cream-warm">Sending</div>
      <p className="muted text-[14px] mt-1">Seconds on Solana; up to a few minutes on Ethereum.</p>
    </section>
  );
}
