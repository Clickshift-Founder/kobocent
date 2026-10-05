'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { kc, KcError, amount as fmt } from '@/lib/kc';
import { PageHeader } from '@/components/app/PageHeader';
import { Sheet, Skeleton } from '@/components/app/ui';
import { IconSwap, IconChevron } from '@/components/app/Icons';
import { newKey, store, read, useCountUp, HoldToConfirm, Outcome } from '@/components/app/money';

/**
 * Swap — SOL ↔ USDC / USDT. Backend /api/v1/swap (tradingEngine.executeSwap — same as Telegram;
 * Jupiter, gasless where the treasury can pay, 1% fee). Live quote (after the fee), flip, Max,
 * hold-to-confirm, server job (resumable, idempotency key).
 */

type Sym = 'SOL' | 'USDC' | 'USDT';
interface Balances { SOL: number | null; USDC: number; USDT: number; spendableSol: number | null }
interface Quote { from: Sym; to: Sym; amount: number; out: number; minOut: number; feePct: number; priceImpactPct: number; rate: number }
interface Job { id: string; status: 'running' | 'done'; stage: string; meta: { from: Sym; to: Sym; amount: number }; result: null | { ok: boolean; code?: string; error?: string; signature?: string | null } }

const JOB_KEY = 'kc-swap-job';
const META: Record<Sym, { name: string; color: string; dp: number }> = {
  SOL: { name: 'Solana', color: '#20211F', dp: 4 },
  USDC: { name: 'USD Coin', color: '#2775CA', dp: 2 },
  USDT: { name: 'Tether', color: '#26A17B', dp: 2 },
};
const partnersOf = (s: Sym): Sym[] => (s === 'SOL' ? ['USDC', 'USDT'] : ['SOL']);

function Token({ sym, onClick }: { sym: Sym; onClick?: () => void }) {
  return (
    <button onClick={onClick} disabled={!onClick} className="inline-flex items-center gap-2 rounded-full bg-cream-warm dark:bg-night pl-1.5 pr-3 min-h-[44px] font-semibold text-[16px] text-ink dark:text-cream-warm">
      <span className="grid place-items-center h-8 w-8 rounded-full text-white text-[11px] font-bold" style={{ background: META[sym].color }}>{sym === 'SOL' ? '◎' : '$'}</span>
      {sym}{onClick && <IconChevron size={14} className="rotate-90 muted" />}
    </button>
  );
}

export default function SwapPage() {
  const [bal, setBal] = useState<Balances | null>(null);
  const [error, setError] = useState('');
  const [needsLink, setNeedsLink] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [from, setFrom] = useState<Sym>('SOL');
  const [to, setTo] = useState<Sym>('USDC');
  const [amt, setAmt] = useState('');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [qErr, setQErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [picker, setPicker] = useState<'from' | 'to' | null>(null);
  const [review, setReview] = useState(false);
  const [starting, setStarting] = useState(false);
  const [startErr, setStartErr] = useState('');
  const keyRef = useRef(newKey());
  const value = Number(amt) || 0;
  const outShown = useCountUp(quote && value ? quote.out : null);

  const loadBal = useCallback(() => kc<{ balances: Balances }>('swap').then(r => setBal(r.balances)).catch(e => {
    if (e instanceof KcError && e.status === 409) setNeedsLink(true); else setError(e instanceof Error ? e.message : 'Could not load balances');
  }), []);
  useEffect(() => { const s = read(JOB_KEY); if (s) setJobId(s); loadBal(); }, [loadBal]);

  const have = !bal ? null : from === 'SOL' ? bal.spendableSol : bal[from];

  useEffect(() => {
    setQErr('');
    if (!value) { setQuote(null); return; }
    let live = true; setBusy(true);
    const t = setTimeout(() => {
      kc<Quote>('swap/quote', { method: 'POST', body: { from, to, amount: value } })
        .then(q => { if (live) setQuote(q); }).catch(e => { if (live) { setQuote(null); setQErr(e instanceof Error ? e.message : 'No quote right now'); } })
        .finally(() => { if (live) setBusy(false); });
    }, 400);
    return () => { live = false; clearTimeout(t); };
  }, [from, to, value]);

  function flip() { setFrom(to); setTo(from); setAmt(''); setQuote(null); }
  function pick(sym: Sym) {
    if (picker === 'from') { setFrom(sym); if (!partnersOf(sym).includes(to)) setTo(partnersOf(sym)[0]); }
    else setTo(sym);
    setPicker(null); setAmt(''); setQuote(null);
  }
  const over = have !== null && value > have + 1e-9;
  const ready = !!quote && !busy && !over && value > 0;

  async function start() {
    setStarting(true); setStartErr('');
    try {
      const job = await kc<Job>('swap/execute', { method: 'POST', body: { from, to, amount: value, idempotencyKey: keyRef.current } });
      setReview(false); store(JOB_KEY, job.id); setJobId(job.id);
    } catch (e) { setStartErr(e instanceof Error ? e.message : 'Could not start the swap'); keyRef.current = newKey(); }
    finally { setStarting(false); }
  }

  if (needsLink) return <div className="space-y-6"><PageHeader title="Swap" /><div className="surface rounded-3xl p-6 text-center"><p className="muted text-[15px] mb-4">Link your Telegram account to swap from the web app.</p><Link href="/app/settings" className="btn-primary">Open Settings</Link></div></div>;

  return (
    <div className="space-y-6">
      <PageHeader title="Swap" subtitle="SOL ↔ USDC or USDT in seconds, at the best route we can find." />
      {jobId ? (
        <SwapProgress jobId={jobId} onFinish={() => { store(JOB_KEY, null); setJobId(null); setAmt(''); setQuote(null); keyRef.current = newKey(); loadBal(); }} />
      ) : error ? <div className="surface rounded-2xl p-5 text-[15px]">{error}</div>
        : !bal ? <div className="space-y-3"><Skeleton className="h-40" /><Skeleton className="h-28" /></div> : (
        <div className="space-y-4 animate-fade-up">
          <section className="relative">
            <div className="surface rounded-3xl p-5">
              <div className="flex items-center justify-between text-[13px] muted"><span>You pay</span>
                <span>Balance {have === null ? '—' : fmt(have, META[from].dp)}{have !== null && have > 0 && <button onClick={() => setAmt(String(Math.floor(have * 10 ** META[from].dp) / 10 ** META[from].dp))} className="ml-2 font-semibold text-terracotta">Max</button>}</span>
              </div>
              <div className="mt-2 flex items-center gap-3">
                <input value={amt} onChange={e => { let s = e.target.value.replace(/[^\d.]/g, ''); const [i, ...r] = s.split('.'); s = r.length ? `${i}.${r.join('').slice(0, META[from].dp + 2)}` : i; setAmt(s.slice(0, 14)); }}
                  inputMode="decimal" placeholder="0" aria-label={`Amount of ${from}`} className={`flex-1 min-w-0 bg-transparent outline-none font-display font-bold text-[38px] ${over ? 'text-[#B84A40]' : 'text-ink dark:text-cream-warm'}`} />
                <Token sym={from} onClick={() => setPicker('from')} />
              </div>
              {over && <div className="text-[13px] text-[#B84A40]">{from === 'SOL' ? 'A little SOL stays for the swap to work — try Max.' : `You have ${fmt(have!, 2)} ${from}.`}</div>}
            </div>
            <button onClick={flip} aria-label="Flip" className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 grid place-items-center h-12 w-12 rounded-2xl bg-terracotta text-white shadow-card active:scale-95 transition"><IconSwap size={20} className="rotate-90" /></button>
            <div className="surface rounded-3xl p-5 mt-2">
              <div className="text-[13px] muted">You receive (estimate)</div>
              <div className="mt-2 flex items-center gap-3">
                <div className="flex-1 min-w-0 font-display font-bold text-[38px] tabular-nums text-ink dark:text-cream-warm truncate">
                  {!value ? <span className="text-cream-border dark:text-night-border">0</span> : busy || outShown === null ? <span className="inline-block h-9 w-32 rounded-xl bg-cream-warm dark:bg-night animate-pulse align-middle" /> : fmt(outShown, META[to].dp)}
                </div>
                <Token sym={to} onClick={partnersOf(from).length > 1 ? () => setPicker('to') : undefined} />
              </div>
            </div>
          </section>

          {qErr ? <div className="text-[14px] text-[#B84A40] text-center">{qErr}</div> : quote && (
            <dl className="surface rounded-2xl p-4 grid grid-cols-2 gap-y-1.5 text-[13.5px]">
              <dt className="muted">Rate</dt><dd className="text-right font-mono">1 {from} ≈ {fmt(quote.rate, from === 'SOL' ? 2 : 6)} {to}</dd>
              <dt className="muted">Fee</dt><dd className="text-right">{quote.feePct}% (included)</dd>
              <dt className="muted">At least</dt><dd className="text-right font-mono">{fmt(quote.minOut, META[to].dp)} {to}</dd>
              {quote.priceImpactPct > 0.5 && (<><dt className="muted">Price impact</dt><dd className="text-right text-[#B68B2A]">{quote.priceImpactPct.toFixed(2)}%</dd></>)}
              <dt className="muted">Network fee</dt><dd className="text-right text-[#58834C]">Covered by Kobocent</dd>
            </dl>
          )}

          <button disabled={!ready} onClick={() => { setStartErr(''); setReview(true); }} className="btn-primary w-full min-h-[56px] text-[16px] disabled:opacity-40 disabled:pointer-events-none">
            {!value ? 'Enter an amount' : over ? 'Not enough balance' : busy ? 'Finding the best route…' : `Review swap`}
          </button>
        </div>
      )}

      <Sheet open={!!picker} onClose={() => setPicker(null)} title={picker === 'from' ? 'Pay with' : 'Receive'}>
        <ul className="space-y-2">
          {(picker === 'from' ? (['SOL', 'USDC', 'USDT'] as Sym[]) : partnersOf(from)).map(s => (
            <li key={s}><button onClick={() => pick(s)} className="w-full flex items-center gap-3 rounded-2xl border border-cream-border dark:border-night-border px-4 min-h-[60px] hover:border-terracotta">
              <span className="grid place-items-center h-9 w-9 rounded-full text-white text-[12px] font-bold" style={{ background: META[s].color }}>{s === 'SOL' ? '◎' : '$'}</span>
              <span className="flex-1 text-left"><span className="font-semibold">{s}</span> <span className="muted text-[13px]">{META[s].name}</span></span>
              <span className="font-mono text-[13.5px] muted">{bal ? fmt(s === 'SOL' ? bal.SOL : bal[s], META[s].dp) : '—'}</span>
            </button></li>
          ))}
        </ul>
      </Sheet>

      <Sheet open={review} onClose={() => !starting && setReview(false)} title="Review swap">
        {quote && (
          <>
            <div className="flex items-center justify-center gap-4 py-3">
              <div className="text-center"><div className="font-display font-bold text-[26px]">{fmt(value, META[from].dp)}</div><div className="muted text-[13px]">{from}</div></div>
              <IconSwap size={22} className="text-terracotta" />
              <div className="text-center"><div className="font-display font-bold text-[26px]">≈ {fmt(quote.out, META[to].dp)}</div><div className="muted text-[13px]">{to}</div></div>
            </div>
            <p className="text-center muted text-[13px]">You’ll get at least {fmt(quote.minOut, META[to].dp)} {to}; the final amount depends on the market at the moment of the swap.</p>
            {startErr && <div className="mt-3 text-[14px] text-[#B84A40]">{startErr}</div>}
            <div className="mt-5"><HoldToConfirm label="Hold to swap" busy={starting} onConfirm={start} /></div>
          </>
        )}
      </Sheet>
    </div>
  );
}

function SwapProgress({ jobId, onFinish }: { jobId: string; onFinish: () => void }) {
  const [job, setJob] = useState<Job | null>(null);
  const [lost, setLost] = useState(false);
  useEffect(() => {
    let live = true; let misses = 0; let t: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try { const j = await kc<Job>(`swap/jobs/${jobId}`); if (!live) return; misses = 0; setJob(j); if (j.status === 'done') return; }
      catch (e) { if (e instanceof KcError && e.status === 404) { if (live) setLost(true); return; } misses++; }
      if (live) t = setTimeout(poll, misses ? Math.min(8000, 1500 * misses) : 1000);
    };
    poll();
    return () => { live = false; clearTimeout(t); };
  }, [jobId]);
  if (lost) return <Outcome tone="info" title="We lost track of this screen" body="Check your balance on Home — the swap itself is unaffected." actions={<><Link href="/app" onClick={onFinish} className="btn-primary w-full">Go to Home</Link><button onClick={onFinish} className="btn-ghost w-full">Close</button></>} />;
  const r = job?.result;
  if (job?.status === 'done' && r) {
    if (r.ok) return <Outcome tone="success" title="Swap complete" body={`${fmt(job.meta.amount, META[job.meta.from].dp)} ${job.meta.from} → ${job.meta.to}. Your new balance shows on Home.`} signature={r.signature} actions={<><Link href="/app" onClick={onFinish} className="btn-primary w-full">Done</Link><button onClick={onFinish} className="block w-full text-center text-[14px] font-semibold text-terracotta min-h-[44px]">Swap again</button></>} />;
    if (r.code === 'OUTCOME_UNKNOWN') return <Outcome tone="warn" title="Sent — confirming" body="Your swap was sent but the network hasn’t confirmed it to us yet. Check your balance in a minute before trying again — it has very likely gone through." signature={r.signature} actions={<><Link href="/app" onClick={onFinish} className="btn-primary w-full">Check balance</Link><button onClick={onFinish} className="btn-ghost w-full">Close</button></>} />;
    return <Outcome tone="error" title="The swap didn’t go through" body={`${r.error || 'Something went wrong'}. Check your balance before trying again.`} actions={<><button onClick={onFinish} className="btn-primary w-full">Try again</button><Link href="/app" onClick={onFinish} className="btn-ghost w-full">Check balance</Link></>} />;
  }
  return (
    <section className="surface rounded-3xl p-8 text-center animate-fade-up" aria-live="polite">
      <div className="relative mx-auto h-24 w-24"><span className="absolute inset-0 rounded-full border-4 border-cream-warm dark:border-night" /><span className="absolute inset-0 rounded-full border-4 border-terracotta border-t-transparent animate-spin" style={{ animationDuration: '1.1s' }} /><span className="absolute inset-0 grid place-items-center text-terracotta"><IconSwap size={30} /></span></div>
      <div className="font-display text-[22px] font-bold mt-5 text-ink dark:text-cream-warm">Swapping {job ? `${fmt(job.meta.amount, META[job.meta.from].dp)} ${job.meta.from}` : ''}</div>
      <p className="muted text-[14px] mt-1">Usually 5–20 seconds on Solana.</p>
    </section>
  );
}
