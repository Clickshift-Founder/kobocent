'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { kc, KcError, usd, naira, BOT_URL } from '@/lib/kc';
import { PageHeader } from '@/components/app/PageHeader';
import { Sheet, Skeleton, CopyButton, ReceiptButton } from '@/components/app/ui';
import { TelegramLogin, type TelegramUser } from '@/components/app/TelegramLogin';
import { IconBank, IconCheck, IconShield, IconChevron, IconPlus } from '@/components/app/Icons';
import { useLiveRefresh } from '@/lib/useLiveRefresh';

/**
 * Withdraw to bank — backend: /api/v1/withdraw (the same service the Telegram withdrawal runs).
 * Flow: payout bank (verified by the bank, saved after a Telegram re-auth) → amount with a live
 * naira quote → hold-to-confirm review → live progress → outcome. The withdrawal runs as a job on
 * the server and this screen polls it; the job id survives a refresh, and every attempt carries an
 * idempotency key, so nothing here can pay twice.
 */

interface Bank { bankName: string; bankCode: string; accountNumber: string; accountName: string }
interface Overview {
  bank: Bank | null;
  balances: { usdc: number; usdt: number; total: number } | null;
  limits: { minUsd: number; maxUsd: number };
  feeTiers: Array<{ upToUsd: number | null; pct: number }>;
  running: boolean;
}
interface Quote { amountUsd: number; feeRate: number; fee: number; net: number; displayRate: number; midMarket: number; payoutNgn: number; enough: boolean | null }
interface Job {
  id: string; status: 'running' | 'done'; stage: string; amountUsd: number;
  result: null | { ok: boolean; code: string | null; reference: string | null; payoutNgn: number | null; signature: string | null; error: string | null };
}
type Screen = 'loading' | 'bank' | 'amount' | 'progress';

const JOB_KEY = 'kc-withdraw-job';
const SUPPORT_URL = 'https://t.me/ClickShiftAlerts';

function newKey() {
  return (typeof crypto !== 'undefined' && 'randomUUID' in crypto) ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}-wd`;
}
function store(k: string, v: string | null) {
  try { if (v === null) window.sessionStorage.removeItem(k); else window.sessionStorage.setItem(k, v); } catch { /* private mode */ }
}
function read(k: string) {
  try { return window.sessionStorage.getItem(k); } catch { return null; }
}
const initials = (s: string) => s.replace(/[^A-Za-z ]/g, '').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || 'B';

/** Smoothly counts towards `value` (the naira figure feels alive as you type). */
function useCountUp(value: number | null, ms = 450) {
  const [shown, setShown] = useState<number | null>(value);
  const from = useRef<number>(value || 0);
  useEffect(() => {
    if (value === null) { setShown(null); return; }
    const start = performance.now(); const a = from.current; const b = value;
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / ms); const e = 1 - Math.pow(1 - k, 3);
      setShown(a + (b - a) * e);
      if (k < 1) raf = requestAnimationFrame(tick); else from.current = b;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, ms]);
  return shown;
}

export default function WithdrawPage() {
  const [screen, setScreen] = useState<Screen>('loading');
  const [ov, setOv] = useState<Overview | null>(null);
  const [error, setError] = useState('');
  const [needsLink, setNeedsLink] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    try {
      const o = await kc<Overview>('withdraw');
      setOv(o);
      if (!silent) setScreen(s => (s === 'loading' ? (o.bank ? 'amount' : 'bank') : s));
    } catch (e) {
      if (e instanceof KcError && e.status === 409) { setNeedsLink(true); return; }
      if (!silent) setError(e instanceof Error ? e.message : 'Could not load withdrawals');
    }
  }, []);

  useEffect(() => {
    const saved = read(JOB_KEY);
    if (saved) { setJobId(saved); setScreen('progress'); }
    load();
  }, [load]);
  useLiveRefresh(() => { if (screen === 'amount') load(true); }, 30_000);

  if (needsLink) {
    return (
      <div className="space-y-6">
        <PageHeader title="Withdraw to bank" />
        <div className="surface rounded-3xl p-6 text-center">
          <p className="muted text-[15px] leading-relaxed mb-4">Link your Telegram account to withdraw from the web app.</p>
          <Link href="/app/settings" className="btn-primary">Open Settings</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Withdraw to bank" subtitle={screen === 'bank' ? 'Where should we send your naira?' : 'USDC or USDT to naira, straight to your bank.'} />
      {error && screen !== 'progress' ? (
        <div className="surface rounded-2xl p-5 text-[15px]">{error} <button onClick={() => { setError(''); load(); }} className="underline font-semibold text-terracotta">Retry</button></div>
      ) : screen === 'loading' || !ov ? (
        screen === 'progress' && jobId ? null : <div className="space-y-3"><Skeleton className="h-24" /><Skeleton className="h-40" /><Skeleton className="h-28" /></div>
      ) : screen === 'bank' ? (
        <BankSetup current={ov.bank} onCancel={ov.bank ? () => setScreen('amount') : undefined}
          onSaved={(b) => { setOv({ ...ov, bank: b }); setScreen('amount'); }} />
      ) : screen === 'amount' ? (
        <AmountStep ov={ov} onChangeBank={() => setScreen('bank')}
          onStarted={(id) => { store(JOB_KEY, id); setJobId(id); setScreen('progress'); }} />
      ) : null}
      {screen === 'progress' && jobId && (
        <Progress jobId={jobId} bankName={ov?.bank?.bankName || 'your bank'}
          onFinish={() => { store(JOB_KEY, null); setJobId(null); setScreen(ov?.bank ? 'amount' : 'bank'); load(true); }} />
      )}
    </div>
  );
}

// ───────────────────────────── Bank setup ─────────────────────────────

function BankSetup({ current, onSaved, onCancel }: { current: Bank | null; onSaved: (b: Bank) => void; onCancel?: () => void }) {
  const [banks, setBanks] = useState<Array<{ code: string; name: string }> | null>(null);
  const [q, setQ] = useState('');
  const [bank, setBank] = useState<{ code: string; name: string } | null>(null);
  const [acct, setAcct] = useState('');
  const [name, setName] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [err, setErr] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    kc<{ banks: Array<{ code: string; name: string }> }>('withdraw/banks').then(r => setBanks(r.banks)).catch(e => setErr(e instanceof Error ? e.message : 'Could not load banks'));
  }, []);

  // Verify the name with the bank as soon as we have a bank and 10 digits.
  useEffect(() => {
    setName(null); setErr('');
    if (!bank || acct.length !== 10) return;
    let live = true;
    setChecking(true);
    kc<{ accountName: string }>('withdraw/resolve', { method: 'POST', body: { accountNumber: acct, bankCode: bank.code } })
      .then(r => { if (live) setName(r.accountName); })
      .catch(e => { if (live) setErr(e instanceof Error ? e.message : 'Could not verify this account'); })
      .finally(() => { if (live) setChecking(false); });
    return () => { live = false; };
  }, [bank, acct]);

  const filtered = useMemo(() => {
    if (!banks) return [];
    const s = q.trim().toLowerCase();
    return s ? banks.filter(b => b.name.toLowerCase().includes(s)) : banks;
  }, [banks, q]);

  async function onAuth(user: TelegramUser) {
    if (!bank) return;
    setSaving(true); setErr('');
    try {
      const { reauthToken } = await kc<{ reauthToken: string }>('auth/reauth', { method: 'POST', body: user });
      const r = await kc<{ bank: Bank }>('withdraw/bank', { method: 'POST', body: { accountNumber: acct, bankCode: bank.code }, headers: { 'X-Reauth-Token': reauthToken } });
      setConfirmOpen(false);
      onSaved(r.bank);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not save your bank');
      setConfirmOpen(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5 animate-fade-up">
      {current && (
        <div className="rounded-2xl bg-cream-warm dark:bg-night px-4 py-3 text-[14px] muted">
          Currently: <strong className="text-ink dark:text-cream-warm">{current.bankName} ····{current.accountNumber.slice(-4)}</strong>
        </div>
      )}

      {/* 1 — bank */}
      <section className="surface rounded-3xl p-5">
        <div className="eyebrow mb-3">1 · Your bank</div>
        {bank ? (
          <button onClick={() => { setBank(null); setQ(''); }} className="w-full flex items-center gap-3 rounded-2xl border border-terracotta bg-terracotta-soft p-3 text-left min-h-[56px]">
            <span className="grid place-items-center h-11 w-11 rounded-xl bg-terracotta text-white font-semibold text-[14px]">{initials(bank.name)}</span>
            <span className="flex-1 font-medium text-ink dark:text-cream-warm">{bank.name}</span>
            <span className="text-[13px] text-terracotta font-semibold">Change</span>
          </button>
        ) : (
          <>
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search — e.g. GTBank, Opay, Kuda" autoComplete="off"
              className="w-full rounded-xl border border-cream-border dark:border-night-border bg-cream dark:bg-night px-4 min-h-[48px] text-[16px] outline-none focus:border-terracotta" />
            <ul className="mt-3 max-h-72 overflow-y-auto -mx-1 px-1 divide-y divide-cream-border dark:divide-night-border">
              {!banks ? [0, 1, 2, 3].map(i => <li key={i} className="py-2"><Skeleton className="h-11" /></li>) :
                filtered.length === 0 ? <li className="py-6 text-center muted text-[14px]">No bank matches “{q}”</li> :
                filtered.map(b => (
                  <li key={b.code}>
                    <button onClick={() => setBank(b)} className="w-full flex items-center gap-3 py-2.5 min-h-[52px] text-left hover:text-terracotta">
                      <span className="grid place-items-center h-9 w-9 rounded-lg bg-cream-warm dark:bg-night text-[12px] font-semibold text-terracotta">{initials(b.name)}</span>
                      <span className="flex-1 text-[15px]">{b.name}</span>
                      <IconChevron size={16} className="muted" />
                    </button>
                  </li>
                ))}
            </ul>
          </>
        )}
      </section>

      {/* 2 — account number */}
      <section className={`surface rounded-3xl p-5 transition-opacity ${bank ? '' : 'opacity-50 pointer-events-none'}`}>
        <div className="eyebrow mb-3">2 · Account number</div>
        <input value={acct} onChange={e => setAcct(e.target.value.replace(/\D/g, '').slice(0, 10))} inputMode="numeric" autoComplete="off"
          placeholder="10-digit account number" aria-label="Account number"
          className="w-full rounded-xl border border-cream-border dark:border-night-border bg-cream dark:bg-night px-4 min-h-[56px] font-mono text-[22px] tracking-[0.12em] outline-none focus:border-terracotta" />
        <div className="mt-3 min-h-[56px]">
          {checking ? (
            <div className="flex items-center gap-3 muted text-[14px]"><span className="h-5 w-5 rounded-full border-2 border-terracotta border-t-transparent animate-spin" />Checking with {bank?.name}…</div>
          ) : name ? (
            <div className="flex items-center gap-3 rounded-2xl bg-[#58834C]/10 px-4 py-3 animate-fade-up">
              <span className="grid place-items-center h-8 w-8 rounded-full bg-[#58834C] text-white"><IconCheck size={16} /></span>
              <div><div className="text-[12px] muted">Account name</div><div className="font-semibold text-ink dark:text-cream-warm">{name}</div></div>
            </div>
          ) : acct.length > 0 && acct.length < 10 ? (
            <div className="muted text-[13.5px]">{10 - acct.length} more digit{10 - acct.length === 1 ? '' : 's'}</div>
          ) : null}
          {err && <div className="text-[14px] text-[#B84A40] mt-1">{err}</div>}
        </div>
      </section>

      <button disabled={!name} onClick={() => setConfirmOpen(true)} className="btn-primary w-full min-h-[52px] disabled:opacity-40 disabled:pointer-events-none">
        {name ? `This is me — save ${bank?.name}` : 'Save bank'}
      </button>
      {onCancel && <button onClick={onCancel} className="btn-ghost w-full">Keep my current bank</button>}

      <Sheet open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Confirm it’s you">
        <div className="flex items-start gap-3 mb-5 rounded-2xl bg-terracotta-soft p-4">
          <IconShield size={22} className="text-terracotta shrink-0 mt-0.5" />
          <div className="text-[14.5px] leading-relaxed">
            <div className="font-semibold text-ink dark:text-cream-warm">This step is for your security</div>
            <p className="muted mt-1">
              It confirms that you — the owner of this Kobocent account — are the one authorising where your money is paid.
              Even if someone got into your web session, they couldn’t change it without your Telegram.
            </p>
          </div>
        </div>
        <p className="muted text-[13.5px] mb-4">Tap the button below to confirm. We’ll also message you on Telegram about this change.</p>
        <div className="rounded-2xl bg-cream-warm dark:bg-night p-4 mb-5 text-[14.5px]">
          <div className="font-semibold text-ink dark:text-cream-warm">{name}</div>
          <div className="muted">{bank?.name} · {acct}</div>
        </div>
        <div className={saving ? 'opacity-50 pointer-events-none' : ''}><TelegramLogin onAuth={onAuth} /></div>
        {saving && <p className="text-center muted text-[14px] mt-3">Saving…</p>}
      </Sheet>
    </div>
  );
}

// ───────────────────────────── Amount + review ─────────────────────────────

function AmountStep({ ov, onChangeBank, onStarted }: { ov: Overview; onChangeBank: () => void; onStarted: (jobId: string) => void }) {
  const bank = ov.bank!;
  const total = ov.balances?.total ?? null;
  const [raw, setRaw] = useState('');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [qErr, setQErr] = useState('');
  const [quoting, setQuoting] = useState(false);
  const [review, setReview] = useState(false);
  const [starting, setStarting] = useState(false);
  const [startErr, setStartErr] = useState('');
  const keyRef = useRef<string>(newKey());

  const value = Number(raw) || 0;
  const maxUsd = total === null ? null : Math.min(Math.floor(total * 100) / 100, ov.limits.maxUsd);
  const shownNgn = useCountUp(quote && value > 0 ? quote.payoutNgn : null);

  // Debounced live quote.
  useEffect(() => {
    setQErr('');
    if (!value) { setQuote(null); return; }
    if (value < ov.limits.minUsd) { setQuote(null); setQErr(`The minimum is ${usd(ov.limits.minUsd)}`); return; }
    if (value > ov.limits.maxUsd) { setQuote(null); setQErr(`Above ${usd(ov.limits.maxUsd)} we process withdrawals by hand — message support and we’ll do it for you.`); return; }
    let live = true;
    setQuoting(true);
    const t = setTimeout(() => {
      kc<Quote>('withdraw/quote', { method: 'POST', body: { amountUsd: value } })
        .then(q => { if (live) setQuote(q); })
        .catch(e => { if (live) { setQuote(null); setQErr(e instanceof Error ? e.message : 'Could not get a rate'); } })
        .finally(() => { if (live) setQuoting(false); });
    }, 350);
    return () => { live = false; clearTimeout(t); };
  }, [value, ov.limits.minUsd, ov.limits.maxUsd]);

  const short = total !== null && value > total;
  const canReview = !!quote && !short && !quoting && value >= ov.limits.minUsd;

  function onInput(v: string) {
    let s = v.replace(/[^\d.]/g, '');
    const [i, ...rest] = s.split('.');
    s = rest.length ? `${i}.${rest.join('').slice(0, 2)}` : i;
    if (s.length > 1 && s.startsWith('0') && !s.startsWith('0.')) s = s.replace(/^0+/, '') || '0';
    setRaw(s.slice(0, 9));
  }

  async function start() {
    setStarting(true); setStartErr('');
    try {
      const job = await kc<Job>('withdraw', { method: 'POST', body: { amountUsd: value, idempotencyKey: keyRef.current } });
      setReview(false);
      onStarted(job.id);
    } catch (e) {
      setStartErr(e instanceof Error ? e.message : 'Could not start the withdrawal');
      keyRef.current = newKey();
    } finally {
      setStarting(false);
    }
  }

  const chips = [10, 25, 50, 100].filter(c => maxUsd === null || c <= maxUsd);

  return (
    <div className="space-y-5 animate-fade-up">
      {/* Payout bank */}
      <button onClick={onChangeBank} className="w-full surface rounded-2xl p-4 flex items-center gap-3.5 text-left hover:border-terracotta transition-colors min-h-[64px]">
        <span className="grid place-items-center h-12 w-12 rounded-2xl bg-terracotta text-white font-semibold">{initials(bank.bankName)}</span>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-ink dark:text-cream-warm truncate">{bank.accountName}</div>
          <div className="text-[13.5px] muted truncate">{bank.bankName} · ····{bank.accountNumber.slice(-4)}</div>
        </div>
        <span className="text-[13px] font-semibold text-terracotta">Change</span>
      </button>

      {/* Amount */}
      <section className="surface rounded-3xl p-6 text-center">
        <label htmlFor="wd-amount" className="eyebrow">You withdraw</label>
        <div className="mt-2 flex items-baseline justify-center gap-1">
          <span className="font-display text-[34px] text-warmgray">$</span>
          <input id="wd-amount" value={raw} onChange={e => onInput(e.target.value)} inputMode="decimal" placeholder="0" autoComplete="off" autoFocus
            style={{ width: `${Math.max(1, raw.length || 1) + 0.6}ch` }}
            className="bg-transparent font-display font-bold text-[56px] leading-none text-ink dark:text-cream-warm outline-none text-center placeholder:text-cream-border dark:placeholder:text-night-border max-w-full" />
        </div>
        <div className="mt-3 text-[13.5px] muted">
          {ov.balances ? <>Available <strong className="text-ink dark:text-cream-warm">{usd(ov.balances.total)}</strong> · USDC {usd(ov.balances.usdc)} · USDT {usd(ov.balances.usdt)}</> : 'Balance unavailable right now'}
        </div>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {chips.map(c => (
            <button key={c} onClick={() => setRaw(String(c))} className={`rounded-full px-4 min-h-[40px] text-[14px] font-semibold border transition-colors ${value === c ? 'bg-terracotta text-white border-terracotta' : 'border-cream-border dark:border-night-border hover:border-terracotta'}`}>${c}</button>
          ))}
          {maxUsd !== null && maxUsd >= ov.limits.minUsd && (
            <button onClick={() => setRaw(String(maxUsd))} className={`rounded-full px-4 min-h-[40px] text-[14px] font-semibold border transition-colors ${value === maxUsd ? 'bg-terracotta text-white border-terracotta' : 'border-cream-border dark:border-night-border hover:border-terracotta'}`}>Max</button>
          )}
        </div>
      </section>

      {/* Quote */}
      <section className={`rounded-3xl p-6 transition-all ${quote && !short ? 'bg-ink dark:bg-night-card text-cream shadow-card' : 'surface'}`}>
        {short ? (
          <div>
            <div className="font-semibold text-ink dark:text-cream-warm">That’s more than you have</div>
            <p className="muted text-[14px] mt-1">You can withdraw up to {usd(maxUsd)}. Top up with naira first, or swap SOL to USDC.</p>
            <Link href="/app" className="inline-flex items-center gap-1.5 mt-3 text-terracotta font-semibold text-[14px]"><IconPlus size={16} />Add money</Link>
          </div>
        ) : qErr ? (
          <div className="text-[14.5px] text-[#B84A40]">{qErr}{value > ov.limits.maxUsd && <> <a href={SUPPORT_URL} target="_blank" rel="noopener noreferrer" className="underline font-semibold">Message support</a></>}</div>
        ) : !value ? (
          <div className="flex items-center gap-3 muted text-[14.5px]"><IconBank size={20} className="text-terracotta" />Type an amount to see exactly how much naira lands in your account.</div>
        ) : (
          <div>
            <div className={`text-[13.5px] ${quote ? 'text-cream/70' : 'muted'}`}>{bank.accountName.split(' ')[0]} receives</div>
            <div className="font-display font-bold text-[40px] leading-tight mt-1 tabular-nums">
              {shownNgn === null ? <span className="inline-block h-10 w-44 rounded-xl bg-white/10 animate-pulse align-middle" /> : naira(shownNgn)}
            </div>
            {quote && (
              <dl className="mt-4 grid grid-cols-2 gap-y-2 text-[14px]">
                <dt className="text-cream/70">Fee ({(quote.feeRate * 100).toFixed(1).replace(/\.0$/, '')}%)</dt><dd className="text-right font-mono">{usd(quote.fee)}</dd>
                <dt className="text-cream/70">Rate</dt><dd className="text-right font-mono">₦{quote.displayRate.toLocaleString('en-NG')} / $1</dd>
                {quote.displayRate > quote.midMarket && (<><dt className="text-cream/70">Above mid-market</dt><dd className="text-right font-mono text-terracotta-light">+₦{(quote.displayRate - quote.midMarket).toLocaleString('en-NG')} / $1</dd></>)}
                <dt className="text-cream/70">Arrives</dt><dd className="text-right">Usually within minutes</dd>
              </dl>
            )}
          </div>
        )}
      </section>

      <button disabled={!canReview} onClick={() => { setStartErr(''); setReview(true); }} className="btn-primary w-full min-h-[56px] text-[16px] disabled:opacity-40 disabled:pointer-events-none">
        {quoting && value ? 'Getting your rate…' : 'Review withdrawal'}
      </button>

      <details className="group text-[13.5px] muted">
        <summary className="cursor-pointer list-none flex items-center justify-center gap-1 min-h-[44px]">How fees work <IconChevron size={14} className="transition-transform group-open:rotate-90" /></summary>
        <ul className="surface rounded-2xl px-4 py-2 mt-1 divide-y divide-cream-border dark:divide-night-border">
          {ov.feeTiers.map((t, i) => {
            const from = i === 0 ? ov.limits.minUsd : ov.feeTiers[i - 1].upToUsd!;
            return <li key={i} className="flex justify-between py-2"><span>{t.upToUsd ? `${usd(from)} – under ${usd(t.upToUsd)}` : `${usd(from)} and above`}</span><span className="font-mono text-ink dark:text-cream-warm">{t.pct}%</span></li>;
          })}
        </ul>
        <p className="mt-2 text-center">No network fees for you — Kobocent covers them.</p>
      </details>

      <Sheet open={review} onClose={() => !starting && setReview(false)} title="Review withdrawal">
        {quote && (
          <>
            <div className="text-center py-2">
              <div className="muted text-[13.5px]">Sending to {bank.accountName}</div>
              <div className="font-display font-bold text-[40px] text-ink dark:text-cream-warm leading-tight">{naira(quote.payoutNgn)}</div>
              <div className="muted text-[13.5px]">{bank.bankName} · {bank.accountNumber}</div>
            </div>
            <dl className="mt-4 rounded-2xl bg-cream-warm dark:bg-night p-4 grid grid-cols-2 gap-y-2 text-[14px]">
              <dt className="muted">You withdraw</dt><dd className="text-right font-mono">{usd(quote.amountUsd)}</dd>
              <dt className="muted">Fee</dt><dd className="text-right font-mono">{usd(quote.fee)}</dd>
              <dt className="muted">Rate</dt><dd className="text-right font-mono">₦{quote.displayRate.toLocaleString('en-NG')} / $1</dd>
              <dt className="muted">Paid from</dt><dd className="text-right">USDC first, then USDT</dd>
            </dl>
            {startErr && <div className="mt-4 text-[14px] text-[#B84A40]">{startErr}</div>}
            <div className="mt-5">
              <HoldToConfirm label={`Hold to send ${naira(quote.payoutNgn)}`} busy={starting} onConfirm={start} />
            </div>
            <p className="mt-3 text-center text-[12.5px] muted">Press and hold so nothing is sent by accident.</p>
          </>
        )}
      </Sheet>
    </div>
  );
}

/** Press-and-hold (≈1 s) button: a deliberate gesture for sending money. Enter/Space work too. */
function HoldToConfirm({ label, onConfirm, busy }: { label: string; onConfirm: () => void; busy: boolean }) {
  const [p, setP] = useState(0);
  const raf = useRef(0);
  const startAt = useRef(0);
  const done = useRef(false);
  const HOLD = 1000;

  const stop = () => { cancelAnimationFrame(raf.current); if (!done.current) setP(0); };
  const begin = () => {
    if (busy) return;
    done.current = false;
    startAt.current = performance.now();
    const tick = (t: number) => {
      const k = Math.min(1, (t - startAt.current) / HOLD);
      setP(k);
      if (k >= 1) {
        done.current = true;
        if (navigator.vibrate) navigator.vibrate(30);
        onConfirm();
        return;
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  };
  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  useEffect(() => { if (!busy && done.current) { done.current = false; setP(0); } }, [busy]);

  return (
    <button
      onPointerDown={e => { e.preventDefault(); begin(); }} onPointerUp={stop} onPointerLeave={stop} onPointerCancel={stop}
      onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) { e.preventDefault(); begin(); } }}
      onKeyUp={e => { if (e.key === 'Enter' || e.key === ' ') stop(); }}
      onContextMenu={e => e.preventDefault()}
      aria-label={label} disabled={busy}
      className="relative w-full overflow-hidden rounded-2xl bg-terracotta-dark text-white font-semibold min-h-[60px] select-none touch-none"
      style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none' }}>
      <span className="absolute inset-y-0 left-0 bg-terracotta" style={{ width: `${(busy ? 1 : p) * 100}%`, transition: p === 0 ? 'width 0.25s ease' : 'none' }} />
      <span className="relative flex items-center justify-center gap-2 text-[16px]">
        {busy ? <><span className="h-5 w-5 rounded-full border-2 border-white border-t-transparent animate-spin" />Starting…</> : label}
      </span>
    </button>
  );
}

// ───────────────────────────── Progress + outcome ─────────────────────────────

const STEPS = [
  { key: 'sending', title: 'Securing your stablecoins', sub: 'Moving them to the Kobocent vault on-chain' },
  { key: 'payout', title: 'Sending naira', sub: 'Paying out to your bank' },
  { key: 'done', title: 'On its way', sub: 'Your bank credits you, usually within minutes' },
];
function stepIndex(stage: string) {
  if (stage === 'done') return 3;
  if (stage === 'payout') return 1;
  if (stage === 'secured') return 1;
  return 0;
}

function Progress({ jobId, bankName, onFinish }: { jobId: string; bankName: string; onFinish: (again: boolean) => void }) {
  const [job, setJob] = useState<Job | null>(null);
  const [lost, setLost] = useState(false);

  useEffect(() => {
    let live = true; let misses = 0; let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const j = await kc<Job>(`withdraw/jobs/${jobId}`);
        if (!live) return;
        misses = 0; setJob(j);
        if (j.status === 'done') return;
      } catch (e) {
        if (e instanceof KcError && e.status === 404) { if (live) setLost(true); return; }
        misses++;
      }
      if (live) timer = setTimeout(poll, misses ? Math.min(8000, 1500 * misses) : 1200);
    };
    poll();
    return () => { live = false; clearTimeout(timer); };
  }, [jobId]);

  if (lost) {
    return (
      <Outcome tone="info" title="We lost track of this screen" body="The withdrawal itself is unaffected. Check Activity, or your Telegram — we message every withdrawal there."
        actions={<><Link href="/app/activity" className="btn-primary w-full">Open Activity</Link><button onClick={() => onFinish(false)} className="btn-ghost w-full">Close</button></>} />
    );
  }

  const r = job?.result;
  if (job?.status === 'done' && r) {
    if (r.ok) {
      return (
        <Outcome tone="success" title={`${naira(r.payoutNgn)} is on its way`} body={`We’ve sent it to ${bankName}. It usually arrives within minutes — your receipt and cashback land in Telegram.`}
          reference={r.reference} signature={r.signature}
          actions={<>
            <Link href="/app" onClick={() => onFinish(false)} className="btn-primary w-full">Done</Link>
            {r.reference && <div><ReceiptButton reference={r.reference} /></div>}
            <Link href="/app/activity" onClick={() => onFinish(false)} className="block text-center text-[14px] font-semibold text-terracotta min-h-[44px] leading-[44px]">View activity</Link>
          </>} />
      );
    }
    if (r.code === 'OUTCOME_UNKNOWN') {
      return (
        <Outcome tone="warn" title="Being confirmed on the network" body="Please don’t withdraw again. We’re checking the transfer and will complete it or message you on Telegram."
          reference={r.signature} actions={<button onClick={() => onFinish(false)} className="btn-primary w-full">Got it</button>} />
      );
    }
    if (r.code === 'PAYOUT_FAILED' || r.code === 'NEEDS_REVIEW' || r.code === 'SPLIT_USDT_FAILED') {
      return (
        <Outcome tone="warn" title="Your money is safe" body="It’s in the Kobocent vault, and our team has already been alerted to finish your payout. No need to try again."
          reference={r.signature} actions={<><a href={SUPPORT_URL} target="_blank" rel="noopener noreferrer" className="btn-primary w-full">Message support</a><button onClick={() => onFinish(false)} className="btn-ghost w-full">Close</button></>} />
      );
    }
    const msg = r.code === 'INSUFFICIENT' ? 'Your balance changed before we could send it.' : r.code === 'IN_PROGRESS' ? 'Another withdrawal was still being processed.' : (r.error || 'Something went wrong.');
    return (
      <Outcome tone="error" title="Nothing left your wallet" body={msg}
        actions={<><button onClick={() => onFinish(true)} className="btn-primary w-full">Try again</button><a href={BOT_URL} target="_blank" rel="noopener noreferrer" className="btn-ghost w-full">Use Telegram instead</a></>} />
    );
  }

  const idx = stepIndex(job?.stage || 'starting');
  return (
    <section className="surface rounded-3xl p-6 animate-fade-up" aria-live="polite">
      <div className="flex flex-col items-center text-center pt-2 pb-6">
        <div className="relative h-24 w-24">
          <span className="absolute inset-0 rounded-full border-4 border-cream-warm dark:border-night" />
          <span className="absolute inset-0 rounded-full border-4 border-terracotta border-t-transparent animate-spin" style={{ animationDuration: '1.1s' }} />
          <span className="absolute inset-0 grid place-items-center text-terracotta"><IconBank size={34} /></span>
        </div>
        <div className="font-display text-[22px] font-bold text-ink dark:text-cream-warm mt-5">Sending {job ? usd(job.amountUsd) : ''}</div>
        <p className="muted text-[14px] mt-1">You can leave this screen — it keeps going, and Telegram tells you when it’s done.</p>
      </div>
      <ol className="space-y-4">
        {STEPS.map((s, i) => {
          const state = i < idx ? 'done' : i === idx ? 'now' : 'next';
          return (
            <li key={s.key} className="flex items-start gap-3.5">
              <span className={`grid place-items-center h-8 w-8 shrink-0 rounded-full text-[13px] font-semibold transition-colors ${state === 'done' ? 'bg-[#58834C] text-white' : state === 'now' ? 'bg-terracotta text-white' : 'bg-cream-warm dark:bg-night muted'}`}>
                {state === 'done' ? <IconCheck size={15} /> : state === 'now' ? <span className="h-2.5 w-2.5 rounded-full bg-white animate-pulse" /> : i + 1}
              </span>
              <div className={state === 'next' ? 'opacity-50' : ''}>
                <div className="font-semibold text-ink dark:text-cream-warm text-[15px]">{s.title}</div>
                <div className="muted text-[13.5px]">{s.sub}</div>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function Outcome({ tone, title, body, reference, signature, actions }: {
  tone: 'success' | 'warn' | 'error' | 'info'; title: string; body: string; reference?: string | null; signature?: string | null; actions: React.ReactNode;
}) {
  const color = tone === 'success' ? '#58834C' : tone === 'warn' ? '#B68B2A' : tone === 'error' ? '#B84A40' : '#C1502E';
  return (
    <section className="surface rounded-3xl p-6 text-center animate-fade-up" aria-live="polite">
      <div className="mx-auto grid place-items-center h-20 w-20 rounded-full" style={{ background: `${color}1A`, color }}>
        {tone === 'success' ? (
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="m5 12 5 5 9-10" style={{ strokeDasharray: 24, strokeDashoffset: 24, animation: 'kcDraw 0.6s 0.15s ease forwards' }} />
          </svg>
        ) : tone === 'error' ? <span className="text-[34px] font-bold">!</span> : <IconShield size={36} />}
      </div>
      <h2 className="font-display text-[26px] font-bold text-ink dark:text-cream-warm mt-5 leading-tight">{title}</h2>
      <p className="muted text-[15px] leading-relaxed mt-2 max-w-sm mx-auto">{body}</p>
      {(reference || signature) && (
        <div className="mt-5 rounded-2xl bg-cream-warm dark:bg-night p-4 text-left space-y-2">
          {reference && <div className="flex items-center justify-between gap-3"><div className="min-w-0"><div className="text-[12px] muted">Reference</div><div className="font-mono text-[13px] truncate">{reference}</div></div><CopyButton value={reference} /></div>}
          {signature && signature !== reference && <a href={`https://solscan.io/tx/${signature}`} target="_blank" rel="noopener noreferrer" className="block text-[13px] text-terracotta font-semibold">View the on-chain transfer</a>}
        </div>
      )}
      <div className="mt-6 space-y-3">{actions}</div>
      <style>{`@keyframes kcDraw { to { stroke-dashoffset: 0; } }`}</style>
    </section>
  );
}
