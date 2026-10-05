'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { kc, KcError, amount as fmt } from '@/lib/kc';
import { PageHeader } from '@/components/app/PageHeader';
import { Sheet, Skeleton } from '@/components/app/ui';
import { IconLeaf, IconChevron } from '@/components/app/Icons';
import { newKey, store, read, HoldToConfirm, Outcome } from '@/components/app/money';

/**
 * Earn — stake USDC, USDT or SOL in a flexible or locked plan. Backend /api/v1/earn (yieldEngine —
 * same as Telegram; earnings accrue every hour). The earned figure ticks live between refreshes from
 * the per-second rate. Stake / withdraw run as server jobs (resumable, idempotency key).
 */

type Asset = 'USDC' | 'USDT' | 'SOL';
interface Plan { id: string; name: string; apy: number; lockDays: number; minAmount: number }
interface Position { id: number; ref: string; asset: Asset; amount: number; apy: number; planName: string; lockDays: number; depositedAt: number | null; unlockAt: number | null; earned: number; perSecond: number; withdrawable: boolean }
interface Overview { plans: Plan[]; positions: Position[]; totals: Partial<Record<Asset, { staked: number; earned: number; perSecond: number }>>; asOf: number; balances: { USDC: number; USDT: number; SOL: number | null } }
interface JobResult { ok: boolean; code?: string; error?: string; signature?: string | null; ref?: string; unlockAt?: number | null; asset?: Asset; amount?: number; returned?: number | null; earned?: number; principal?: number | null }
interface Job { id: string; status: 'running' | 'done'; stage: string; meta: { kind: 'deposit' | 'withdraw'; asset?: Asset; amount?: number; depositId?: number }; result: JobResult | null }

const JOB_KEY = 'kc-earn-job';
const DP: Record<Asset, number> = { USDC: 2, USDT: 2, SOL: 4 };
const COLOR: Record<Asset, string> = { USDC: '#2775CA', USDT: '#26A17B', SOL: '#20211F' };
const money = (n: number, a: Asset, extra = 0) => a === 'SOL' ? `${fmt(n, DP.SOL + extra)} SOL` : `$${fmt(n, DP[a] + extra)}`;
const day = (ms: number) => new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

/** A number that grows at `perSecond` from `base` (measured at `asOf`) — smooth, ~10 fps. */
function useTicker(base: number, perSecond: number, asOf: number) {
  const [v, setV] = useState(base);
  useEffect(() => {
    const tick = () => setV(base + perSecond * Math.max(0, (Date.now() - asOf) / 1000));
    tick();
    if (!perSecond) return;
    const t = setInterval(tick, 100);
    return () => clearInterval(t);
  }, [base, perSecond, asOf]);
  return v;
}

function Coin({ a, size = 32 }: { a: Asset; size?: number }) {
  return <span className="grid place-items-center rounded-full text-white font-bold shrink-0" style={{ background: COLOR[a], width: size, height: size, fontSize: size * 0.36 }}>{a === 'SOL' ? '◎' : '$'}</span>;
}

export default function EarnPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState('');
  const [needsLink, setNeedsLink] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [out, setOut] = useState<Position | null>(null);

  const load = useCallback(() => kc<Overview>('earn').then(setData).catch(e => {
    if (e instanceof KcError && e.status === 409) setNeedsLink(true); else setError(e instanceof Error ? e.message : 'Could not load Earn');
  }), []);
  useEffect(() => { const s = read(JOB_KEY); if (s) setJobId(s); load(); }, [load]);
  // Re-sync with the server's hourly accrual every minute; the ticker fills the gaps.
  useEffect(() => { const t = setInterval(() => { if (document.visibilityState === 'visible') load(); }, 60_000); return () => clearInterval(t); }, [load]);

  const started = (id: string) => { setPlan(null); setOut(null); store(JOB_KEY, id); setJobId(id); };

  if (needsLink) return <div className="space-y-6"><PageHeader title="Earn" /><div className="surface rounded-3xl p-6 text-center"><p className="muted text-[15px] mb-4">Link your Telegram account to earn from the web app.</p><Link href="/app/settings" className="btn-primary">Open Settings</Link></div></div>;

  return (
    <div className="space-y-6">
      <PageHeader title="Earn" subtitle="Put idle stablecoins to work. Earnings build every hour." />
      {jobId ? (
        <EarnProgress jobId={jobId} onFinish={() => { store(JOB_KEY, null); setJobId(null); load(); }} />
      ) : error ? <div className="surface rounded-2xl p-5 text-[15px]">{error}</div>
        : !data ? <div className="space-y-3"><Skeleton className="h-44" /><Skeleton className="h-24" /><Skeleton className="h-24" /></div> : (
        <div className="space-y-6 animate-fade-up">
          <Hero data={data} />

          <section>
            <h2 className="font-display text-[18px] font-bold text-ink dark:text-cream-warm mb-3">Plans</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {data.plans.map(p => (
                <button key={p.id} onClick={() => setPlan(p)} className="surface rounded-3xl p-5 text-left min-h-[44px] active:scale-[0.99] transition border border-transparent hover:border-terracotta">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-[16px] text-ink dark:text-cream-warm">{p.name}</div>
                      <div className="muted text-[13px] mt-0.5">{p.lockDays ? `Locked ${p.lockDays} days` : 'Withdraw anytime'}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-display font-bold text-[30px] leading-none text-terracotta tabular-nums">{fmt(p.apy, p.apy % 1 ? 1 : 0)}%</div>
                      <div className="muted text-[11.5px] mt-1">a year · current rate</div>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-[13.5px]">
                    <span className="muted">$100 earns ≈ <span className="font-semibold text-ink dark:text-cream-warm">${fmt(100 * p.apy / 100 / 12, 2)}</span> a month</span>
                    <span className="inline-flex items-center gap-1 font-semibold text-terracotta">Start <IconChevron size={14} /></span>
                  </div>
                </button>
              ))}
            </div>
            <p className="muted text-[12.5px] mt-3">Rates are what each plan pays today and can change. Earnings are added every hour; you get your stake plus earnings back when you withdraw.</p>
          </section>

          {data.positions.length > 0 && (
            <section>
              <h2 className="font-display text-[18px] font-bold text-ink dark:text-cream-warm mb-3">Your positions</h2>
              <ul className="space-y-3">
                {data.positions.map(p => <PositionRow key={p.id} p={p} asOf={data.asOf} onWithdraw={() => setOut(p)} />)}
              </ul>
            </section>
          )}
        </div>
      )}

      {data && <StakeSheet plan={plan} balances={data.balances} onClose={() => setPlan(null)} onStarted={started} />}
      {data && <WithdrawSheet p={out} asOf={data.asOf} onClose={() => setOut(null)} onStarted={started} />}
    </div>
  );
}

function Hero({ data }: { data: Overview }) {
  const assets = (Object.keys(data.totals) as Asset[]).sort(a => (a === 'USDC' ? -1 : 1));
  const main = assets[0];
  const t = main ? data.totals[main]! : { staked: 0, earned: 0, perSecond: 0 };
  const earned = useTicker(t.earned, t.perSecond, data.asOf);
  const best = data.plans.reduce((m, p) => Math.max(m, p.apy), 0);
  if (!main) {
    return (
      <section className="rounded-3xl p-6 text-white relative overflow-hidden" style={{ background: 'linear-gradient(135deg,#C1502E,#9A3E22)' }}>
        <IconLeaf size={120} className="absolute -right-6 -bottom-6 opacity-15" />
        <div className="text-[14px] opacity-90">Earn up to</div>
        <div className="font-display font-bold text-[44px] leading-tight tabular-nums">{best ? `${fmt(best, best % 1 ? 1 : 0)}%` : '—'} <span className="text-[18px] font-semibold opacity-90">a year</span></div>
        <p className="text-[14px] opacity-90 mt-1 max-w-[30ch]">on USDC, USDT or SOL — pick a plan below. Earnings show up every hour.</p>
      </section>
    );
  }
  return (
    <section className="rounded-3xl p-6 text-white relative overflow-hidden" style={{ background: 'linear-gradient(135deg,#C1502E,#9A3E22)' }}>
      <IconLeaf size={120} className="absolute -right-6 -bottom-6 opacity-15" />
      <div className="text-[14px] opacity-90">Earned so far</div>
      <div className="font-display font-bold text-[40px] leading-tight tabular-nums">{money(earned, main, main === 'SOL' ? 2 : 4)}</div>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[14px]">
        <span><span className="opacity-80">Staked</span> <span className="font-semibold">{money(t.staked, main)}</span></span>
        <span><span className="opacity-80">Per day</span> <span className="font-semibold">+{money(t.perSecond * 86400, main, 2)}</span></span>
      </div>
      {assets.length > 1 && <div className="mt-2 text-[13px] opacity-90">{assets.slice(1).map(a => `+ ${money(data.totals[a]!.staked, a)} staked`).join(' · ')}</div>}
      <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[12px]"><span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />Earning now</div>
    </section>
  );
}

function PositionRow({ p, asOf, onWithdraw }: { p: Position; asOf: number; onWithdraw: () => void }) {
  const earned = useTicker(p.earned, p.perSecond, asOf);
  const now = Date.now();
  const total = p.unlockAt && p.depositedAt ? p.unlockAt - p.depositedAt : 0;
  const pct = total ? Math.min(100, Math.max(0, ((now - (p.depositedAt || now)) / total) * 100)) : 100;
  const daysLeft = p.unlockAt ? Math.max(0, Math.ceil((p.unlockAt - now) / 86_400_000)) : 0;
  return (
    <li className="surface rounded-3xl p-5">
      <div className="flex items-center gap-3">
        <Coin a={p.asset} size={40} />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-[16px] text-ink dark:text-cream-warm">{money(p.amount, p.asset)}</div>
          <div className="muted text-[13px] truncate">{p.planName} · {fmt(p.apy, p.apy % 1 ? 1 : 0)}% a year</div>
        </div>
        <div className="text-right">
          <div className="font-mono font-semibold text-[15px] text-[#58834C] tabular-nums">+{money(earned, p.asset, p.asset === 'SOL' ? 2 : 4)}</div>
          <div className="muted text-[12px]">earned</div>
        </div>
      </div>
      {p.unlockAt && (
        <div className="mt-4">
          <div className="h-2 rounded-full bg-cream-warm dark:bg-night overflow-hidden"><div className="h-full rounded-full bg-terracotta transition-all" style={{ width: `${pct}%` }} /></div>
          <div className="mt-1.5 flex justify-between text-[12.5px] muted"><span>{p.withdrawable ? 'Unlocked' : `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`}</span><span>Unlocks {day(p.unlockAt)}</span></div>
        </div>
      )}
      <button onClick={onWithdraw} disabled={!p.withdrawable} className="mt-4 w-full btn-ghost min-h-[48px] disabled:opacity-40 disabled:pointer-events-none">
        {p.withdrawable ? 'Withdraw' : `Locked until ${day(p.unlockAt!)}`}
      </button>
    </li>
  );
}

function StakeSheet({ plan, balances, onClose, onStarted }: { plan: Plan | null; balances: Overview['balances']; onClose: () => void; onStarted: (id: string) => void }) {
  const [asset, setAsset] = useState<Asset>('USDC');
  const [amt, setAmt] = useState('');
  const [starting, setStarting] = useState(false);
  const [err, setErr] = useState('');
  const keyRef = useRef(newKey());
  useEffect(() => { if (plan) { setAmt(''); setErr(''); keyRef.current = newKey(); setAsset(balances.USDC >= balances.USDT || !balances.USDT ? 'USDC' : 'USDT'); } }, [plan, balances]);
  if (!plan) return null;
  const value = Number(amt) || 0;
  // SOL keeps a little back for network fees on paths the user's wallet signs.
  const have = asset === 'SOL' ? (balances.SOL === null ? null : Math.max(0, balances.SOL - 0.005)) : balances[asset];
  const over = have !== null && value > have + 1e-9;
  const under = value > 0 && value < plan.minAmount;
  const daily = value * plan.apy / 100 / 365;
  const unlock = plan.lockDays ? Date.now() + plan.lockDays * 86_400_000 : null;
  const ready = value > 0 && !over && !under;

  async function start() {
    setStarting(true); setErr('');
    try {
      const job = await kc<Job>('earn/deposit', { method: 'POST', body: { planId: plan!.id, asset, amount: value, idempotencyKey: keyRef.current } });
      onStarted(job.id);
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not start'); keyRef.current = newKey(); }
    finally { setStarting(false); }
  }

  return (
    <Sheet open={!!plan} onClose={() => !starting && onClose()} title={`${plan.name} · ${fmt(plan.apy, plan.apy % 1 ? 1 : 0)}%`}>
      <div className="flex gap-2">
        {(['USDC', 'USDT', 'SOL'] as Asset[]).map(a => (
          <button key={a} onClick={() => { setAsset(a); setAmt(''); }} className={`flex-1 inline-flex items-center justify-center gap-2 rounded-2xl min-h-[48px] font-semibold text-[15px] border ${asset === a ? 'border-terracotta bg-terracotta/10 text-terracotta' : 'border-cream-border dark:border-night-border'}`}>
            <Coin a={a} size={22} />{a}
          </button>
        ))}
      </div>
      <div className="mt-4 rounded-2xl bg-cream-warm dark:bg-night p-4">
        <div className="flex justify-between text-[13px] muted"><span>Amount</span>
          <span>Balance {have === null ? '—' : fmt(have, DP[asset])}{have !== null && have > 0 && <button onClick={() => setAmt(String(Math.floor(have * 10 ** DP[asset]) / 10 ** DP[asset]))} className="ml-2 font-semibold text-terracotta">Max</button>}</span>
        </div>
        <input value={amt} onChange={e => { let s = e.target.value.replace(/[^\d.]/g, ''); const [i, ...r] = s.split('.'); s = r.length ? `${i}.${r.join('').slice(0, DP[asset] + 2)}` : i; setAmt(s.slice(0, 14)); }}
          inputMode="decimal" placeholder="0" aria-label={`Amount of ${asset}`} className={`mt-1 w-full bg-transparent outline-none font-display font-bold text-[34px] ${over ? 'text-[#B84A40]' : 'text-ink dark:text-cream-warm'}`} />
        {over && <div className="text-[13px] text-[#B84A40]">That’s more than you have.</div>}
        {under && <div className="text-[13px] text-[#B68B2A]">The minimum for this plan is {fmt(plan.minAmount, DP[asset])} {asset}.</div>}
      </div>
      <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
        {[['Per day', daily], ['Per month', daily * 30], ['Per year', daily * 365]].map(([l, n]) => (
          <div key={l as string} className="rounded-2xl border border-cream-border dark:border-night-border p-3">
            <dt className="muted text-[12px]">{l}</dt><dd className="font-mono font-semibold text-[14px] text-[#58834C] tabular-nums">+{value ? money(n as number, asset, asset === 'SOL' ? 1 : 0) : '—'}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-[13px] muted">{unlock ? <>Locked until <span className="font-semibold text-ink dark:text-cream-warm">{day(unlock)}</span> — you can’t withdraw before then.</> : 'Withdraw anytime, stake plus earnings.'} At today’s rate; rates can change. Network fees are covered.</p>
      {err && <div className="mt-3 text-[14px] text-[#B84A40]">{err}</div>}
      <div className="mt-5">{ready ? <HoldToConfirm label={`Hold to stake ${money(value, asset)}`} busy={starting} onConfirm={start} /> : <button disabled className="btn-primary w-full min-h-[56px] opacity-40">{value ? (over ? 'Not enough balance' : 'Below the minimum') : 'Enter an amount'}</button>}</div>
    </Sheet>
  );
}

function WithdrawSheet({ p, asOf, onClose, onStarted }: { p: Position | null; asOf: number; onClose: () => void; onStarted: (id: string) => void }) {
  const [starting, setStarting] = useState(false);
  const [err, setErr] = useState('');
  const keyRef = useRef(newKey());
  const earned = useTicker(p?.earned || 0, p?.perSecond || 0, asOf);
  useEffect(() => { if (p) { setErr(''); keyRef.current = newKey(); } }, [p]);
  if (!p) return null;
  async function start() {
    setStarting(true); setErr('');
    try {
      const job = await kc<Job>('earn/withdraw', { method: 'POST', body: { depositId: p!.id, idempotencyKey: keyRef.current } });
      onStarted(job.id);
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not start'); keyRef.current = newKey(); }
    finally { setStarting(false); }
  }
  return (
    <Sheet open={!!p} onClose={() => !starting && onClose()} title="Withdraw">
      <div className="text-center py-2">
        <div className="muted text-[13px]">You’ll receive about</div>
        <div className="font-display font-bold text-[34px] tabular-nums text-ink dark:text-cream-warm">{money(p.amount + earned, p.asset)}</div>
      </div>
      <dl className="rounded-2xl border border-cream-border dark:border-night-border p-4 grid grid-cols-2 gap-y-1.5 text-[14px]">
        <dt className="muted">Your stake</dt><dd className="text-right font-mono">{money(p.amount, p.asset)}</dd>
        <dt className="muted">Earned</dt><dd className="text-right font-mono text-[#58834C]">+{money(earned, p.asset, p.asset === 'SOL' ? 2 : 4)}</dd>
        <dt className="muted">To</dt><dd className="text-right">Your Kobocent wallet</dd>
      </dl>
      <p className="mt-3 text-[13px] muted">This position stops earning once withdrawn. The final amount is worked out to the second.</p>
      {err && <div className="mt-3 text-[14px] text-[#B84A40]">{err}</div>}
      <div className="mt-5"><HoldToConfirm label="Hold to withdraw" busy={starting} onConfirm={start} /></div>
    </Sheet>
  );
}

function EarnProgress({ jobId, onFinish }: { jobId: string; onFinish: () => void }) {
  const [job, setJob] = useState<Job | null>(null);
  const [lost, setLost] = useState(false);
  useEffect(() => {
    let live = true; let misses = 0; let t: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try { const j = await kc<Job>(`earn/jobs/${jobId}`); if (!live) return; misses = 0; setJob(j); if (j.status === 'done') return; }
      catch (e) { if (e instanceof KcError && e.status === 404) { if (live) setLost(true); return; } misses++; }
      if (live) t = setTimeout(poll, misses ? Math.min(8000, 1500 * misses) : 1000);
    };
    poll();
    return () => { live = false; clearTimeout(t); };
  }, [jobId]);
  const home = <><button onClick={onFinish} className="btn-primary w-full">Back to Earn</button><Link href="/app" onClick={onFinish} className="btn-ghost w-full">Go to Home</Link></>;
  if (lost) return <Outcome tone="info" title="We lost track of this screen" body="Your positions on Earn show what happened — nothing was affected." actions={home} />;
  const r = job?.result; const isDep = job?.meta.kind === 'deposit';
  if (job?.status === 'done' && r) {
    if (r.ok && isDep) return <Outcome tone="success" title="You’re earning" body={`${money(r.amount || 0, r.asset || 'USDC')} is staked${r.unlockAt ? ` until ${day(r.unlockAt)}` : ' — withdraw anytime'}. Your first earnings show within the hour.`} signature={r.signature} actions={home} />;
    if (r.ok) return <Outcome tone="success" title="Withdrawn" body={`${r.returned ? money(r.returned, r.asset || 'USDC') : 'Your stake plus earnings'} ${r.returned ? 'is' : 'are'} back in your wallet${r.earned ? ` — including ${money(r.earned, r.asset || 'USDC', 2)} earned` : ''}.`} signature={r.signature} actions={home} />;
    if (r.code === 'OUTCOME_UNKNOWN') return <Outcome tone="warn" title="Sent — confirming" body={isDep ? 'Your deposit was sent and is being confirmed. Please don’t deposit again — we’ll add it or message you.' : 'Your withdrawal was sent and is being confirmed. Please don’t withdraw again — we’re checking it and will message you.'} signature={r.signature} actions={home} />;
    return <Outcome tone="error" title={isDep ? 'Not staked' : 'Not withdrawn'} body={`${r.error || 'Something went wrong'}.`} actions={home} />;
  }
  return (
    <section className="surface rounded-3xl p-8 text-center animate-fade-up" aria-live="polite">
      <div className="relative mx-auto h-24 w-24"><span className="absolute inset-0 rounded-full border-4 border-cream-warm dark:border-night" /><span className="absolute inset-0 rounded-full border-4 border-terracotta border-t-transparent animate-spin" style={{ animationDuration: '1.1s' }} /><span className="absolute inset-0 grid place-items-center text-terracotta"><IconLeaf size={30} /></span></div>
      <div className="font-display text-[22px] font-bold mt-5 text-ink dark:text-cream-warm">{isDep ? `Staking ${job?.meta.amount ? `${fmt(job.meta.amount, DP[job.meta.asset || 'USDC'])} ${job.meta.asset}` : ''}` : job ? 'Withdrawing' : 'Working…'}</div>
      <p className="muted text-[14px] mt-1">Usually 5–20 seconds on Solana.</p>
    </section>
  );
}
