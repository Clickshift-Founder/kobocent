'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { kc, KcError, usd, naira } from '@/lib/kc';
import { PageHeader } from '@/components/app/PageHeader';
import { Sheet, Skeleton, ReceiptButton } from '@/components/app/ui';
import { IconCheck, IconChevron, IconPlus, IconSend } from '@/components/app/Icons';
import { newKey, store, read, initials, useCountUp, HoldToConfirm, Outcome } from '@/components/app/money';

/**
 * Send to bank — pay anyone in Nigeria from USDC/USDT; they receive naira.
 * Backend /api/v1/send (billsPaymentEngine — same engine as Telegram). Banks + name check reuse
 * /withdraw/banks and /withdraw/resolve. The name always comes from the bank. Hold-to-confirm →
 * server job (resumable, idempotency key) → outcome. Receipt + cashback follow when the bank confirms.
 */

interface Recipient { accountNumber: string; bankCode: string; bankName: string; accountName: string; lastAt: number | null }
interface Bank { code: string; name: string }
interface Quote { amountNgn: number; totalUsd: number; feeUsd: number; rate: number; stable: string; isSplit: boolean; balanceUsd: number; canPay: boolean; aboveLimit: boolean; limitUsd: number }
interface Job { id: string; status: 'running' | 'done'; stage: string; meta: { amountNgn: number }; result: null | { ok: boolean; code: string | null; error: string | null; reference: string | null; amountNgn: number; recipientName: string | null; recipientBank: string | null } }

const JOB_KEY = 'kc-send-job';
const SUPPORT_URL = 'https://t.me/ClickShiftAlerts';

export default function SendPage() {
  const [recipients, setRecipients] = useState<Recipient[] | null>(null);
  const [error, setError] = useState('');
  const [needsLink, setNeedsLink] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [to, setTo] = useState<Recipient | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const saved = read(JOB_KEY);
    if (saved) setJobId(saved);
    kc<{ recipients: Recipient[] }>('send').then(r => setRecipients(r.recipients)).catch(e => {
      if (e instanceof KcError && e.status === 409) setNeedsLink(true);
      else setError(e instanceof Error ? e.message : 'Could not load');
    });
  }, []);

  if (needsLink) {
    return (
      <div className="space-y-6"><PageHeader title="Send to bank" />
        <div className="surface rounded-3xl p-6 text-center"><p className="muted text-[15px] mb-4">Link your Telegram account to send money from the web app.</p><Link href="/app/settings" className="btn-primary">Open Settings</Link></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Send to bank" subtitle="Pay anyone in Nigeria from your USDC or USDT — they receive naira, usually in minutes." />
      {jobId ? (
        <Progress jobId={jobId} onFinish={() => { store(JOB_KEY, null); setJobId(null); setTo(null); }} />
      ) : error ? (
        <div className="surface rounded-2xl p-5 text-[15px]">{error}</div>
      ) : !recipients ? (
        <div className="space-y-3"><Skeleton className="h-24" /><Skeleton className="h-40" /></div>
      ) : to ? (
        <Amount to={to} onBack={() => setTo(null)} onStarted={(id) => { store(JOB_KEY, id); setJobId(id); }} />
      ) : adding || recipients.length === 0 ? (
        <NewRecipient onPick={(r) => { setTo(r); setAdding(false); }} onCancel={recipients.length ? () => setAdding(false) : undefined} />
      ) : (
        <section className="space-y-3 animate-fade-up">
          <div className="eyebrow">Send to</div>
          <button onClick={() => setAdding(true)} className="w-full surface rounded-2xl p-4 flex items-center gap-3.5 text-left hover:border-terracotta min-h-[64px]">
            <span className="grid place-items-center h-12 w-12 rounded-2xl bg-terracotta text-white"><IconPlus size={22} /></span>
            <div className="flex-1"><div className="font-semibold text-ink dark:text-cream-warm">New recipient</div><div className="text-[13px] muted">Any Nigerian bank account</div></div>
            <IconChevron size={18} className="muted" />
          </button>
          <ul className="surface rounded-2xl divide-y divide-cream-border dark:divide-night-border px-2">
            {recipients.map(r => (
              <li key={`${r.bankCode}-${r.accountNumber}`}>
                <button onClick={() => setTo(r)} className="w-full flex items-center gap-3.5 px-2 py-3 min-h-[64px] text-left hover:text-terracotta">
                  <span className="grid place-items-center h-11 w-11 rounded-full bg-cream-warm dark:bg-night font-semibold text-terracotta">{initials(r.accountName)}</span>
                  <div className="flex-1 min-w-0"><div className="font-medium text-ink dark:text-cream-warm truncate">{r.accountName}</div><div className="text-[13px] muted truncate">{r.bankName} · ····{r.accountNumber.slice(-4)}</div></div>
                  <IconChevron size={16} className="muted" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function NewRecipient({ onPick, onCancel }: { onPick: (r: Recipient) => void; onCancel?: () => void }) {
  const [banks, setBanks] = useState<Bank[] | null>(null);
  const [q, setQ] = useState('');
  const [bank, setBank] = useState<Bank | null>(null);
  const [acct, setAcct] = useState('');
  const [name, setName] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => { kc<{ banks: Bank[] }>('withdraw/banks').then(r => setBanks(r.banks)).catch(() => setBanks([])); }, []);
  useEffect(() => {
    setName(null); setErr('');
    if (!bank || acct.length !== 10) return;
    let live = true; setChecking(true);
    kc<{ accountName: string }>('withdraw/resolve', { method: 'POST', body: { accountNumber: acct, bankCode: bank.code } })
      .then(r => { if (live) setName(r.accountName); })
      .catch(e => { if (live) setErr(e instanceof Error ? e.message : 'Could not verify this account'); })
      .finally(() => { if (live) setChecking(false); });
    return () => { live = false; };
  }, [bank, acct]);
  const list = useMemo(() => { const s = q.trim().toLowerCase(); return (banks || []).filter(b => !s || b.name.toLowerCase().includes(s)); }, [banks, q]);

  return (
    <div className="space-y-5 animate-fade-up">
      <section className="surface rounded-3xl p-5">
        <div className="eyebrow mb-3">1 · Their bank</div>
        {bank ? (
          <button onClick={() => { setBank(null); setQ(''); }} className="w-full flex items-center gap-3 rounded-2xl border border-terracotta bg-terracotta-soft p-3 text-left min-h-[56px]">
            <span className="grid place-items-center h-11 w-11 rounded-xl bg-terracotta text-white font-semibold text-[14px]">{initials(bank.name)}</span>
            <span className="flex-1 font-medium text-ink dark:text-cream-warm">{bank.name}</span>
            <span className="text-[13px] text-terracotta font-semibold">Change</span>
          </button>
        ) : (
          <>
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search — e.g. GTBank, Opay, Moniepoint" autoComplete="off"
              className="w-full rounded-xl border border-cream-border dark:border-night-border bg-cream dark:bg-night px-4 min-h-[48px] text-[16px] outline-none focus:border-terracotta" />
            <ul className="mt-2 max-h-72 overflow-y-auto divide-y divide-cream-border dark:divide-night-border">
              {!banks ? [0, 1, 2].map(i => <li key={i} className="py-2"><Skeleton className="h-11" /></li>) : list.map(b => (
                <li key={b.code}><button onClick={() => setBank(b)} className="w-full flex items-center gap-3 py-2.5 min-h-[52px] text-left hover:text-terracotta">
                  <span className="grid place-items-center h-9 w-9 rounded-lg bg-cream-warm dark:bg-night text-[12px] font-semibold text-terracotta">{initials(b.name)}</span>
                  <span className="flex-1 text-[15px]">{b.name}</span><IconChevron size={16} className="muted" />
                </button></li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className={`surface rounded-3xl p-5 transition-opacity ${bank ? '' : 'opacity-50 pointer-events-none'}`}>
        <div className="eyebrow mb-3">2 · Account number</div>
        <input value={acct} onChange={e => setAcct(e.target.value.replace(/\D/g, '').slice(0, 10))} inputMode="numeric" autoComplete="off" placeholder="10-digit account number" aria-label="Account number"
          className="w-full rounded-xl border border-cream-border dark:border-night-border bg-cream dark:bg-night px-4 min-h-[56px] font-mono text-[22px] tracking-[0.12em] outline-none focus:border-terracotta" />
        <div className="mt-3 min-h-[52px]">
          {checking ? <div className="flex items-center gap-3 muted text-[14px]"><span className="h-5 w-5 rounded-full border-2 border-terracotta border-t-transparent animate-spin" />Checking with {bank?.name}…</div>
            : name ? <div className="flex items-center gap-3 rounded-2xl bg-[#58834C]/10 px-4 py-3 animate-fade-up"><span className="grid place-items-center h-8 w-8 rounded-full bg-[#58834C] text-white"><IconCheck size={16} /></span><div><div className="text-[12px] muted">Account name</div><div className="font-semibold text-ink dark:text-cream-warm">{name}</div></div></div>
            : acct.length > 0 && acct.length < 10 ? <div className="muted text-[13.5px]">{10 - acct.length} more digit{10 - acct.length === 1 ? '' : 's'}</div> : null}
          {err && <div className="text-[14px] text-[#B84A40] mt-1">{err}</div>}
        </div>
      </section>

      <button disabled={!name} onClick={() => onPick({ accountNumber: acct, bankCode: bank!.code, bankName: bank!.name, accountName: name!, lastAt: null })}
        className="btn-primary w-full min-h-[56px] disabled:opacity-40 disabled:pointer-events-none">{name ? `Continue to ${name.split(' ')[0]}` : 'Continue'}</button>
      {onCancel && <button onClick={onCancel} className="btn-ghost w-full">Back to saved recipients</button>}
    </div>
  );
}

function Amount({ to, onBack, onStarted }: { to: Recipient; onBack: () => void; onStarted: (id: string) => void }) {
  const [ngn, setNgn] = useState('');
  const [note, setNote] = useState('');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [qErr, setQErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [review, setReview] = useState(false);
  const [starting, setStarting] = useState(false);
  const [startErr, setStartErr] = useState('');
  const keyRef = useRef(newKey());
  const value = Number(ngn) || 0;
  const usdShown = useCountUp(quote && value ? quote.totalUsd : null);

  useEffect(() => {
    setQErr('');
    if (!value) { setQuote(null); return; }
    if (value < 100) { setQuote(null); setQErr('The minimum is ₦100'); return; }
    let live = true; setBusy(true);
    const t = setTimeout(() => {
      kc<Quote>('send/quote', { method: 'POST', body: { amountNgn: value } })
        .then(q => { if (live) setQuote(q); }).catch(e => { if (live) { setQuote(null); setQErr(e instanceof Error ? e.message : 'Could not price this'); } })
        .finally(() => { if (live) setBusy(false); });
    }, 350);
    return () => { live = false; clearTimeout(t); };
  }, [value]);

  const start = useCallback(async () => {
    setStarting(true); setStartErr('');
    try {
      const job = await kc<Job>('send/pay', { method: 'POST', body: { bankCode: to.bankCode, accountNumber: to.accountNumber, amountNgn: value, narration: note, idempotencyKey: keyRef.current } });
      setReview(false); onStarted(job.id);
    } catch (e) { setStartErr(e instanceof Error ? e.message : 'Could not start the payment'); keyRef.current = newKey(); }
    finally { setStarting(false); }
  }, [to, value, note, onStarted]);

  const ready = !!quote && quote.canPay && !quote.aboveLimit && !busy;

  return (
    <div className="space-y-5 animate-fade-up">
      <button onClick={onBack} className="w-full surface rounded-2xl p-4 flex items-center gap-3.5 text-left hover:border-terracotta min-h-[64px]">
        <span className="grid place-items-center h-12 w-12 rounded-full bg-terracotta text-white font-semibold">{initials(to.accountName)}</span>
        <div className="flex-1 min-w-0"><div className="font-semibold text-ink dark:text-cream-warm truncate">{to.accountName}</div><div className="text-[13.5px] muted truncate">{to.bankName} · {to.accountNumber}</div></div>
        <span className="text-[13px] font-semibold text-terracotta">Change</span>
      </button>

      <section className="surface rounded-3xl p-6 text-center">
        <label htmlFor="amt" className="eyebrow">They receive</label>
        <div className="mt-2 flex items-baseline justify-center gap-1">
          <span className="font-display text-[34px] text-warmgray">₦</span>
          <input id="amt" value={ngn ? Number(ngn).toLocaleString('en-NG') : ''} onChange={e => setNgn(e.target.value.replace(/\D/g, '').slice(0, 9))} inputMode="numeric" placeholder="0" autoFocus
            style={{ width: `${Math.max(1, (ngn ? Number(ngn).toLocaleString('en-NG') : '0').length) + 0.5}ch` }}
            className="bg-transparent font-display font-bold text-[52px] leading-none text-ink dark:text-cream-warm outline-none text-center placeholder:text-cream-border max-w-full" />
        </div>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {[2000, 5000, 10000, 20000, 50000].map(c => (
            <button key={c} onClick={() => setNgn(String(c))} className={`rounded-full px-4 min-h-[40px] text-[14px] font-semibold border ${value === c ? 'bg-terracotta text-white border-terracotta' : 'border-cream-border dark:border-night-border hover:border-terracotta'}`}>{naira(c)}</button>
          ))}
        </div>
        <input value={note} onChange={e => setNote(e.target.value.slice(0, 60))} placeholder="What’s it for? (optional)" aria-label="Note"
          className="mt-4 w-full rounded-xl border border-cream-border dark:border-night-border bg-cream dark:bg-night px-4 min-h-[48px] text-[15px] text-center outline-none focus:border-terracotta" />
      </section>

      {qErr ? <div className="surface rounded-3xl p-5 text-[14.5px] text-[#B84A40]">{qErr}</div>
        : quote && !quote.canPay ? (
          <div className="surface rounded-3xl p-5"><div className="font-semibold text-ink dark:text-cream-warm">Not enough USDC/USDT</div><p className="muted text-[14px] mt-1">This needs {usd(quote.totalUsd)} and you have {usd(quote.balanceUsd)}.</p><Link href="/app/add-money" className="inline-flex items-center gap-1.5 mt-3 text-terracotta font-semibold text-[14px]"><IconPlus size={16} />Add money</Link></div>
        ) : quote?.aboveLimit ? (
          <div className="surface rounded-3xl p-5 text-[14.5px]">Above {usd(quote.limitUsd)} we send payments by hand. <a href={SUPPORT_URL} target="_blank" rel="noopener noreferrer" className="text-terracotta font-semibold underline">Message support</a></div>
        ) : value ? (
          <div className="rounded-3xl p-5 bg-ink dark:bg-night-card text-cream shadow-card">
            <div className="text-[13.5px] text-cream/70">You pay</div>
            <div className="font-display font-bold text-[34px] leading-tight tabular-nums">{busy || usdShown === null ? <span className="inline-block h-9 w-32 rounded-xl bg-white/10 animate-pulse align-middle" /> : `$${usdShown.toFixed(2)}`}{quote && !busy && <span className="text-[15px] font-sans font-medium text-cream/70 ml-2">{quote.isSplit ? 'USDC + USDT' : quote.stable}</span>}</div>
            {quote && <dl className="mt-3 grid grid-cols-2 gap-y-1.5 text-[13.5px]"><dt className="text-cream/70">Includes fee</dt><dd className="text-right font-mono">{usd(quote.feeUsd)}</dd><dt className="text-cream/70">Rate</dt><dd className="text-right font-mono">₦{Math.round(quote.rate).toLocaleString('en-NG')} / $1</dd><dt className="text-cream/70">Cashback</dt><dd className="text-right text-terracotta-light">0.2% back</dd></dl>}
          </div>
        ) : null}

      <button disabled={!ready} onClick={() => { setStartErr(''); setReview(true); }} className="btn-primary w-full min-h-[56px] text-[16px] disabled:opacity-40 disabled:pointer-events-none">
        {busy && value ? 'Getting the rate…' : value ? `Review ${naira(value)} to ${to.accountName.split(' ')[0]}` : 'Enter an amount'}
      </button>

      <Sheet open={review} onClose={() => !starting && setReview(false)} title="Review payment">
        {quote && (
          <>
            <div className="text-center py-2">
              <div className="muted text-[13.5px]">Sending to {to.accountName}</div>
              <div className="font-display font-bold text-[40px] text-ink dark:text-cream-warm leading-tight">{naira(value)}</div>
              <div className="muted text-[13.5px]">{to.bankName} · {to.accountNumber}</div>
            </div>
            <dl className="mt-4 rounded-2xl bg-cream-warm dark:bg-night p-4 grid grid-cols-2 gap-y-2 text-[14px]">
              <dt className="muted">You pay</dt><dd className="text-right font-mono">{usd(quote.totalUsd)} {quote.isSplit ? 'USDC + USDT' : quote.stable}</dd>
              <dt className="muted">Fee</dt><dd className="text-right font-mono">{usd(quote.feeUsd)}</dd>
              {note && (<><dt className="muted">Note</dt><dd className="text-right truncate">{note}</dd></>)}
            </dl>
            {startErr && <div className="mt-4 text-[14px] text-[#B84A40]">{startErr}</div>}
            <div className="mt-5"><HoldToConfirm label={`Hold to send ${naira(value)}`} busy={starting} onConfirm={start} /></div>
            <p className="mt-3 text-center text-[12.5px] muted">Press and hold so nothing is sent by accident.</p>
          </>
        )}
      </Sheet>
    </div>
  );
}

function Progress({ jobId, onFinish }: { jobId: string; onFinish: () => void }) {
  const [job, setJob] = useState<Job | null>(null);
  const [lost, setLost] = useState(false);
  useEffect(() => {
    let live = true; let misses = 0; let t: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try { const j = await kc<Job>(`send/jobs/${jobId}`); if (!live) return; misses = 0; setJob(j); if (j.status === 'done') return; }
      catch (e) { if (e instanceof KcError && e.status === 404) { if (live) setLost(true); return; } misses++; }
      if (live) t = setTimeout(poll, misses ? Math.min(8000, 1500 * misses) : 1200);
    };
    poll();
    return () => { live = false; clearTimeout(t); };
  }, [jobId]);

  if (lost) return <Outcome tone="info" title="We lost track of this screen" body="The payment itself is unaffected — check Activity for its status." actions={<><Link href="/app/activity" onClick={onFinish} className="btn-primary w-full">Open Activity</Link><button onClick={onFinish} className="btn-ghost w-full">Close</button></>} />;
  const r = job?.result;
  if (job?.status === 'done' && r) {
    if (r.ok) return <Outcome tone="success" title={`${naira(r.amountNgn)} is on its way`} body={`To ${r.recipientName || 'your recipient'}${r.recipientBank ? ` at ${r.recipientBank}` : ''}. Usually arrives within minutes. Get the receipt below to share as proof — it’s ready the moment the bank confirms.`} reference={r.reference} actions={<>{r.reference && <ReceiptButton reference={r.reference} kind="bill" wait className="btn-primary w-full" />}<Link href="/app" onClick={onFinish} className="btn-ghost w-full">Done</Link><button onClick={onFinish} className="block w-full text-center text-[14px] font-semibold text-terracotta min-h-[44px]">Send another</button></>} />;
    if (r.code === 'OUTCOME_UNKNOWN') return <Outcome tone="warn" title="Being confirmed" body="Please don’t send again. We’re confirming the payment and will complete it or refund you — you’ll hear from us on Telegram." reference={r.reference} actions={<button onClick={onFinish} className="btn-primary w-full">Got it</button>} />;
    const nothingMoved = ['INSUFFICIENT', 'BAD_ACCOUNT', 'IN_PROGRESS', 'BELOW_MIN', 'ABOVE_LIMIT'].includes(r.code || '');
    return <Outcome tone="error" title={nothingMoved ? 'Nothing was sent' : 'The payment didn’t go through'} body={`${r.error ? `${r.error}. ` : ''}${nothingMoved ? 'No money left your wallet.' : 'If any money left your wallet, our team has already been alerted and will refund it.'}`} reference={r.reference} actions={<><button onClick={onFinish} className="btn-primary w-full">Try again</button>{!nothingMoved && <a href={SUPPORT_URL} target="_blank" rel="noopener noreferrer" className="btn-ghost w-full">Message support</a>}</>} />;
  }
  return (
    <section className="surface rounded-3xl p-8 text-center animate-fade-up" aria-live="polite">
      <div className="relative mx-auto h-24 w-24"><span className="absolute inset-0 rounded-full border-4 border-cream-warm dark:border-night" /><span className="absolute inset-0 rounded-full border-4 border-terracotta border-t-transparent animate-spin" style={{ animationDuration: '1.1s' }} /><span className="absolute inset-0 grid place-items-center text-terracotta"><IconSend size={34} /></span></div>
      <div className="font-display text-[22px] font-bold text-ink dark:text-cream-warm mt-5">Sending {job ? naira(job.meta.amountNgn) : ''}</div>
      <p className="muted text-[14px] mt-1">This usually takes a few seconds. You can leave this screen — it keeps going.</p>
    </section>
  );
}
