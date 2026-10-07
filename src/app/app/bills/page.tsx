'use client';
import { ErrorNote } from '@/components/app/ErrorNote';
import { Fragment, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { kc, KcError, usd, naira, BOT_URL } from '@/lib/kc';
import { PageHeader } from '@/components/app/PageHeader';
import { Sheet, Skeleton, CopyButton, ReceiptButton } from '@/components/app/ui';
import { IconBolt, IconCheck, IconChevron, IconPlus } from '@/components/app/Icons';
import { newKey, store, read, initials, useCountUp, HoldToConfirm, Outcome } from '@/components/app/money';
import { usePayFrom, PayFromPicker, fundingLines, coinAmount, type Funding, type JobFunding, type PayFromState } from '@/components/app/PayFrom';

/**
 * Pay bills — backend /api/v1/bills (the same service as Telegram utility payments).
 * Pay from any balance (2026-10-07): Solana USDC/USDT, SOL, or USDT/USDC/ETH/BNB/POL on EVM chains.
 * Airtime (network detected from the number) and electricity (meter verified with the disco);
 * data and cable TV come next. Live stablecoin cost → hold-to-confirm → server job (polled,
 * resumable, idempotency key) → outcome with token, receipt and cashback.
 */

interface Service { id: string; name: string; minNgn: number }
interface Catalog { airtime: Service[]; electricity: { prepaid: Service[]; postpaid: Service[] }; data?: Service[]; cable?: Service[] }
interface RecentItem { serviceId: string; serviceName: string; customerId: string; customerName: string | null; phone: string | null; lastAt: number | null }
interface Recents { airtime: RecentItem[]; electricity: RecentItem[]; data: RecentItem[]; cable: RecentItem[] }
interface Plan { code: string; name: string; amountNgn: number }
interface Quote { amountNgn: number; amountUsd: number; feeUsd: number; totalUsd: number; rate: number; stable: string; isSplit: boolean; usdcAmount: number; usdtAmount: number; balanceUsd: number; canPay: boolean; funding?: Funding | null; fundingError?: string | null }
interface Job {
  id: string; status: 'running' | 'done'; stage: string; category: string; amountNgn: number;
  result: null | { ok: boolean; code: string | null; reference: string | null; serviceName: string; planName?: string | null; customerId: string; customerName: string | null; token: string | null; units: string | null; cashback: { amount: number; asset: string } | null; error: string | null; funding?: JobFunding | null };
}
type Tab = 'airtime' | 'electricity' | 'data' | 'cable';
const TABS: Array<{ key: Tab; label: string }> = [
  { key: 'airtime', label: 'Airtime' }, { key: 'data', label: 'Data' },
  { key: 'electricity', label: 'Electricity' }, { key: 'cable', label: 'Cable TV' },
];
const DATA_NETWORK: Record<string, string> = { mtn: 'mtn-data', glo: 'glo-data', airtel: 'airtel-data', etisalat: 'etisalat-data' };

/** One-tap row of numbers paid before (meters, phones, smartcards). */
function RecentRow({ items, onPick, label }: { items: RecentItem[]; onPick: (r: RecentItem) => void; label: (r: RecentItem) => string }) {
  if (!items.length) return null;
  return (
    <div>
      <div className="eyebrow mb-2">Recent</div>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 snap-x">
        {items.map(r => (
          <button key={`${r.serviceId}-${r.customerId}`} onClick={() => onPick(r)}
            className="snap-start shrink-0 text-left rounded-2xl surface px-3.5 py-2.5 min-h-[56px] max-w-[220px] hover:border-terracotta active:scale-[0.98] transition">
            <div className="text-[13.5px] font-semibold text-ink dark:text-cream-warm truncate">{label(r)}</div>
            <div className="text-[12px] muted truncate font-mono">{r.customerId}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

// One "Pay from" for the whole page; the forms read it (quote, pay) and report what they cost (automatic pick).
const PayFromCtx = createContext<{ pf: PayFromState; setNeedUsd: (n: number) => void } | null>(null);

const JOB_KEY = 'kc-bills-job';
const SUPPORT_URL = 'https://t.me/ClickShiftAlerts';
// Telco colours only identify the network at a glance.
const NETWORK: Record<string, { label: string; bg: string; fg: string }> = {
  mtn: { label: 'MTN', bg: '#FFCB05', fg: '#1A1A1A' },
  glo: { label: 'Glo', bg: '#3BB54A', fg: '#FFFFFF' },
  airtel: { label: 'Airtel', bg: '#E40000', fg: '#FFFFFF' },
  etisalat: { label: '9mobile', bg: '#006B53', fg: '#FFFFFF' },
};

export default function BillsPage() {
  const [tab, setTab] = useState<Tab>('airtime');
  const [cat, setCat] = useState<Catalog | null>(null);
  const [error, setError] = useState('');
  const [needsLink, setNeedsLink] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [recent, setRecent] = useState<Recents | null>(null);
  const [needUsd, setNeedUsd] = useState(0);
  const pf = usePayFrom(needUsd);

  useEffect(() => {
    const saved = read(JOB_KEY);
    if (saved) setJobId(saved);
    kc<Catalog>('bills').then(setCat).catch(e => {
      if (e instanceof KcError && e.status === 409) setNeedsLink(true);
      else setError(e instanceof Error ? e.message : 'Could not load bills');
    });
    kc<Recents>('bills/recent').then(setRecent).catch(() => setRecent(null));
  }, []);

  const started = (id: string) => { store(JOB_KEY, id); setJobId(id); };
  const finished = () => { store(JOB_KEY, null); setJobId(null); };

  if (needsLink) {
    return (
      <div className="space-y-6">
        <PageHeader title="Pay bills" />
        <div className="surface rounded-3xl p-6 text-center">
          <p className="muted text-[15px] leading-relaxed mb-4">Link your Telegram account to pay bills from the web app.</p>
          <Link href="/app/settings" className="btn-primary">Open Settings</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Pay bills" subtitle="Airtime, data, electricity and cable TV from any balance — USDC, USDT, SOL, ETH, BNB or POL on any chain — with a receipt and 0.2% cashback." />
      {jobId ? (
        <Progress jobId={jobId} onFinish={finished} />
      ) : error ? (
        <div className="surface rounded-2xl p-5 text-[15px]">{error}</div>
      ) : !cat ? (
        <div className="space-y-3"><Skeleton className="h-12" /><Skeleton className="h-40" /><Skeleton className="h-28" /></div>
      ) : (
        <PayFromCtx.Provider value={{ pf, setNeedUsd }}>
          <PayFromPicker pf={pf} />
          <div role="tablist" aria-label="Bill type" className="grid grid-cols-4 gap-1 rounded-2xl bg-cream-warm dark:bg-night p-1">
            {TABS.map(t => (
              <button key={t.key} role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)}
                className={`rounded-xl min-h-[48px] text-[13.5px] sm:text-[15px] font-semibold transition-colors ${tab === t.key ? 'bg-white dark:bg-night-card text-terracotta shadow-soft' : 'muted'}`}>
                {t.label}
              </button>
            ))}
          </div>
          {tab === 'airtime' && <Airtime services={cat.airtime} recent={recent?.airtime || []} onStarted={started} />}
          {tab === 'electricity' && <Electricity cat={cat.electricity} recent={recent?.electricity || []} onStarted={started} />}
          {tab === 'data' && <Data services={cat.data || []} recent={recent?.data || []} onStarted={started} />}
          {tab === 'cable' && <Cable services={cat.cable || []} recent={recent?.cable || []} onStarted={started} />}
          {cat.electricity.postpaid.length === 0 && tab === 'electricity' && (
            <p className="text-center text-[13px] muted">
              Postpaid meters: <a href={BOT_URL} target="_blank" rel="noopener noreferrer" className="text-terracotta font-semibold">pay on Telegram</a> for now.
            </p>
          )}
        </PayFromCtx.Provider>
      )}
    </div>
  );
}

// ───────────────────────────── Shared: live quote + review ─────────────────────────────

function useQuote(serviceId: string | null, amountNgn: number, minNgn: number) {
  const ctx = useContext(PayFromCtx);
  const fromBody = ctx?.pf.fromBody || {};
  const fromKey = ctx?.pf.from || '';
  const [quote, setQuote] = useState<Quote | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setErr('');
    if (!serviceId || !amountNgn) { setQuote(null); return; }
    if (amountNgn < minNgn) { setQuote(null); setErr(`The minimum is ${naira(minNgn)}`); return; }
    let live = true; setBusy(true);
    const t = setTimeout(() => {
      kc<Quote>('bills/quote', { method: 'POST', body: { serviceId, amountNgn, ...fromBody } })
        .then(q => { if (live) { setQuote(q); ctx?.setNeedUsd(q.totalUsd || 0); } })
        .catch(e => { if (live) { setQuote(null); setErr(e instanceof Error ? e.message : 'Could not price this'); } })
        .finally(() => { if (live) setBusy(false); });
    }, 350);
    return () => { live = false; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceId, amountNgn, minNgn, fromKey]);
  return { quote, err, busy };
}

function AmountField({ value, onChange, chips, min }: { value: string; onChange: (v: string) => void; chips: number[]; min: number }) {
  return (
    <div>
      <div className="flex items-baseline gap-1 rounded-2xl border border-cream-border dark:border-night-border bg-cream dark:bg-night px-4 focus-within:border-terracotta">
        <span className="font-display text-[26px] text-warmgray">₦</span>
        <input value={value} onChange={e => onChange(e.target.value.replace(/\D/g, '').slice(0, 7))} inputMode="numeric" placeholder={String(min)} aria-label="Amount in naira"
          className="flex-1 bg-transparent outline-none font-display font-bold text-[34px] min-h-[64px] text-ink dark:text-cream-warm placeholder:text-cream-border dark:placeholder:text-night-border" />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {chips.map(c => (
          <button key={c} onClick={() => onChange(String(c))}
            className={`rounded-full px-4 min-h-[40px] text-[14px] font-semibold border transition-colors ${Number(value) === c ? 'bg-terracotta text-white border-terracotta' : 'border-cream-border dark:border-night-border hover:border-terracotta'}`}>
            {naira(c)}
          </button>
        ))}
      </div>
    </div>
  );
}

function CostCard({ quote, err, busy, amountNgn }: { quote: Quote | null; err: string; busy: boolean; amountNgn: number }) {
  const shown = useCountUp(quote ? quote.totalUsd : null);
  const ctx = useContext(PayFromCtx);
  const lines = fundingLines(quote?.funding);
  if (err) return <ErrorNote msg={err} className="surface rounded-3xl p-5 text-[14.5px] text-[#B84A40]" />;
  if (!amountNgn) return null;
  if (quote && !quote.canPay) {
    return (
      <div className="surface rounded-3xl p-5">
        <div className="font-semibold text-ink dark:text-cream-warm">{!ctx || ctx.pf.isSolana ? 'Not enough USDC/USDT' : `Can’t pay this from ${ctx.pf.sel.title} on ${ctx.pf.sel.sub}`}</div>
        <p className="muted text-[14px] mt-1">{!ctx || ctx.pf.isSolana ? <>This needs {usd(quote.totalUsd)} and you have {usd(quote.balanceUsd)}.</> : (quote.fundingError || `This needs ${usd(quote.totalUsd)}.`)}{ctx && !ctx.pf.isSolana && <> <button onClick={() => ctx.pf.setPicking(true)} className="text-terracotta font-semibold">Pay from another balance</button></>}</p>
        <Link href="/app" className="inline-flex items-center gap-1.5 mt-3 text-terracotta font-semibold text-[14px]"><IconPlus size={16} />Add money</Link>
      </div>
    );
  }
  return (
    <div className="rounded-3xl p-5 bg-ink dark:bg-night-card text-cream shadow-card">
      <div className="text-[13.5px] text-cream/70">You pay</div>
      <div className="font-display font-bold text-[34px] leading-tight tabular-nums">
        {shown === null || busy ? <span className="inline-block h-9 w-32 rounded-xl bg-white/10 animate-pulse align-middle" /> : `$${shown.toFixed(2)}`}
        {quote && !busy && !quote.funding && <span className="text-[15px] font-sans font-medium text-cream/70 ml-2">{quote.isSplit ? 'USDC + USDT' : quote.stable}</span>}
      </div>
      {quote && (
        <dl className="mt-3 grid grid-cols-2 gap-y-1.5 text-[13.5px]">
          <dt className="text-cream/70">Includes fee</dt><dd className="text-right font-mono">{usd(quote.feeUsd)}</dd>
          <dt className="text-cream/70">Rate</dt><dd className="text-right font-mono">₦{Math.round(quote.rate).toLocaleString('en-NG')} / $1</dd>
          <dt className="text-cream/70">Cashback</dt><dd className="text-right text-terracotta-light">0.2% back</dd>
          {lines.paidFrom && (<><dt className="text-cream/70">Paid from</dt><dd className="text-right font-mono">{lines.paidFrom}</dd><dt className="text-cream/70">Network fee</dt><dd className="text-right">{lines.feeLine}</dd></>)}
        </dl>
      )}
    </div>
  );
}

function ReviewSheet({ open, onClose, title, lines, quote, onConfirm, busy, error, holdLabel }: {
  open: boolean; onClose: () => void; title: string; lines: Array<[string, string]>; quote: Quote | null;
  onConfirm: () => void; busy: boolean; error: string; holdLabel: string;
}) {
  const lines2 = fundingLines(quote?.funding);
  return (
    <Sheet open={open} onClose={() => !busy && onClose()} title={title}>
      {quote && (
        <>
          <dl className="rounded-2xl bg-cream-warm dark:bg-night p-4 grid grid-cols-[auto,1fr] gap-x-4 gap-y-2 text-[14px]">
            {lines.map(([k, v]) => (<Fragment key={k}><dt className="muted">{k}</dt><dd className="text-right font-medium break-all">{v}</dd></Fragment>))}
            <dt className="muted">You pay</dt><dd className="text-right font-mono">{lines2.paidFrom ? `${usd(quote.totalUsd)} · ${lines2.paidFrom}` : `${usd(quote.totalUsd)} ${quote.isSplit ? 'USDC + USDT' : quote.stable}`}</dd>
            {lines2.feeLine && (<><dt className="muted">Network fee</dt><dd className="text-right">{lines2.feeLine}</dd></>)}
          </dl>
          {lines2.priceNote && <p className="mt-2 text-[12.5px] muted text-center">{lines2.priceNote}</p>}
          <ErrorNote msg={error} className="mt-4 text-[14px] text-[#B84A40]" />
          <div className="mt-5"><HoldToConfirm label={holdLabel} busy={busy} onConfirm={onConfirm} /></div>
          <p className="mt-3 text-center text-[12.5px] muted">Press and hold so nothing is paid by accident.</p>
        </>
      )}
    </Sheet>
  );
}

function usePay(onStarted: (id: string) => void) {
  const ctx = useContext(PayFromCtx);
  const fromBody = ctx?.pf.fromBody;
  const keyRef = useRef(newKey());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pay = useCallback(async (body: Record<string, unknown>) => {
    setBusy(true); setError('');
    try {
      const job = await kc<Job>('bills/pay', { method: 'POST', body: { ...body, ...(fromBody || {}), idempotencyKey: keyRef.current } });
      onStarted(job.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start the payment');
      keyRef.current = newKey();
    } finally {
      setBusy(false);
    }
  }, [onStarted, fromBody]);
  return { pay, busy, error, setError };
}

// ───────────────────────────── Airtime ─────────────────────────────

function Airtime({ services, recent, onStarted }: { services: Service[]; recent: RecentItem[]; onStarted: (id: string) => void }) {
  const [phone, setPhone] = useState('');
  const [network, setNetwork] = useState<string | null>(null);
  const [detected, setDetected] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [review, setReview] = useState(false);
  const digits = phone.replace(/\D/g, '');
  const service = services.find(s => s.id === network) || null;
  const amountNgn = Number(amount) || 0;
  const { quote, err, busy } = useQuote(service?.id || null, amountNgn, service?.minNgn || 50);
  const { pay, busy: paying, error: payErr } = usePay(onStarted);

  // Detect the network once the number is complete.
  useEffect(() => {
    setDetected(null);
    if (digits.length !== 11 && !(digits.startsWith('234') && digits.length === 13)) return;
    let live = true;
    kc<{ phone: string; network: string | null }>('bills/network', { method: 'POST', body: { phone: digits } })
      .then(r => { if (!live) return; setDetected(r.network); if (r.network) setNetwork(r.network); })
      .catch(() => {});
    return () => { live = false; };
  }, [digits]);

  const validPhone = /^0[789][01]\d{8}$/.test(digits) || /^234[789][01]\d{8}$/.test(digits);
  const ready = validPhone && !!service && !!quote?.canPay && !busy;
  // Chosen network ≠ the number's network: warn (numbers can be ported, so we don't block).
  const mismatch = !!detected && !!network && detected !== network;

  return (
    <div className="space-y-5 animate-fade-up">
      <RecentRow items={recent} label={r => NETWORK[r.serviceId]?.label || r.serviceName}
        onPick={r => { setPhone(r.customerId); setNetwork(r.serviceId); }} />
      <section className="surface rounded-3xl p-5">
        <label htmlFor="ph" className="eyebrow">Phone number</label>
        <input id="ph" value={phone} onChange={e => setPhone(e.target.value.replace(/[^\d+ ]/g, '').slice(0, 16))} inputMode="tel" autoComplete="tel" placeholder="0803 123 4567"
          className="mt-2 w-full rounded-xl border border-cream-border dark:border-night-border bg-cream dark:bg-night px-4 min-h-[56px] font-mono text-[20px] tracking-[0.06em] outline-none focus:border-terracotta" />
        <div className="mt-4 grid grid-cols-4 gap-2">
          {services.map(s => {
            const n = NETWORK[s.id] || { label: s.name, bg: '#C1502E', fg: '#fff' };
            const on = network === s.id;
            return (
              <button key={s.id} onClick={() => setNetwork(s.id)} aria-pressed={on}
                className={`relative flex flex-col items-center gap-1.5 rounded-2xl border p-2.5 min-h-[76px] transition-all ${on ? 'border-terracotta bg-terracotta-soft' : 'border-cream-border dark:border-night-border'}`}>
                <span className="grid place-items-center h-9 w-9 rounded-full text-[11px] font-bold" style={{ background: n.bg, color: n.fg }}>{n.label.slice(0, 3)}</span>
                <span className="text-[12.5px] font-medium">{n.label}</span>
                {detected === s.id && <span className="absolute -top-2 rounded-full bg-[#58834C] text-white text-[10px] px-1.5 py-0.5">detected</span>}
              </button>
            );
          })}
        </div>
        {mismatch && (
          <div role="alert" className="mt-3 rounded-2xl bg-[#B68B2A]/12 border border-[#B68B2A]/40 px-4 py-3 text-[14px] animate-fade-up">
            <div className="font-semibold text-ink dark:text-cream-warm">This looks like {NETWORK[detected!]?.label} number</div>
            <p className="muted mt-0.5">{NETWORK[network!]?.label} airtime won’t reach it unless the line was ported to {NETWORK[network!]?.label}.</p>
            <button onClick={() => setNetwork(detected)} className="mt-2 inline-flex items-center min-h-[40px] rounded-xl bg-ink dark:bg-cream-warm text-cream dark:text-ink px-4 font-semibold text-[14px]">
              Switch to {NETWORK[detected!]?.label}
            </button>
          </div>
        )}
      </section>

      <section className="surface rounded-3xl p-5">
        <div className="eyebrow mb-2">Amount</div>
        <AmountField value={amount} onChange={setAmount} chips={[100, 200, 500, 1000, 2000]} min={service?.minNgn || 50} />
      </section>

      <CostCard quote={quote} err={err} busy={busy} amountNgn={service ? amountNgn : 0} />

      <button disabled={!ready} onClick={() => setReview(true)} className="btn-primary w-full min-h-[56px] text-[16px] disabled:opacity-40 disabled:pointer-events-none">
        {!validPhone ? 'Enter a phone number' : !service ? 'Choose the network' : !amountNgn ? 'Choose an amount' : `Review ${naira(amountNgn)} airtime`}
      </button>

      <ReviewSheet open={review} onClose={() => setReview(false)} title="Review airtime" quote={quote} busy={paying} error={payErr}
        lines={[['Network', `${NETWORK[network || '']?.label || service?.name || ''}${mismatch ? ` (number looks ${NETWORK[detected!]?.label})` : ''}`], ['Number', digits], ['Airtime', naira(amountNgn)]]}
        holdLabel={`Hold to buy ${naira(amountNgn)} airtime`}
        onConfirm={() => pay({ serviceId: service!.id, amountNgn, customerId: digits })} />
    </div>
  );
}

// ───────────────────────────── Electricity ─────────────────────────────

function Electricity({ cat, recent, onStarted }: { cat: Catalog['electricity']; recent: RecentItem[]; onStarted: (id: string) => void }) {
  const [type, setType] = useState<'prepaid' | 'postpaid'>('prepaid');
  const [service, setService] = useState<Service | null>(null);
  const [q, setQ] = useState('');
  const [meter, setMeter] = useState('');
  const [verified, setVerified] = useState<{ customerName: string; address: string | null } | null>(null);
  const [checking, setChecking] = useState(false);
  const [vErr, setVErr] = useState('');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [review, setReview] = useState(false);
  const amountNgn = Number(amount) || 0;
  const { quote, err, busy } = useQuote(verified ? service?.id || null : null, amountNgn, service?.minNgn || 500);
  const { pay, busy: paying, error: payErr } = usePay(onStarted);

  const list = useMemo(() => {
    const all = cat[type];
    const s = q.trim().toLowerCase();
    return s ? all.filter(x => x.name.toLowerCase().includes(s)) : all;
  }, [cat, type, q]);

  useEffect(() => { setVerified(null); setVErr(''); }, [service, meter]);
  // A recent meter was tapped: check it straight away (one tap from "Recent" to the amount).
  const autoCheck = useRef(false);
  useEffect(() => {
    if (autoCheck.current && service && meter.length >= 10) { autoCheck.current = false; check(service, meter); }
  }, [service, meter]); // eslint-disable-line react-hooks/exhaustive-deps

  async function check(svc: Service | null = service, m: string = meter) {
    if (!svc) return;
    setChecking(true); setVErr('');
    try {
      const r = await kc<{ customerName: string; address: string | null }>('bills/verify', { method: 'POST', body: { serviceId: svc.id, customerId: m } });
      setVerified(r);
    } catch (e) {
      setVErr(e instanceof Error ? e.message : 'Could not verify this meter');
    } finally {
      setChecking(false);
    }
  }

  const phoneDigits = phone.replace(/\D/g, '');
  const ready = !!verified && !!quote?.canPay && !busy;

  return (
    <div className="space-y-5 animate-fade-up">
      <RecentRow items={recent} label={r => r.customerName || r.serviceName}
        onPick={r => {
          const svc = cat.prepaid.find(x => x.id === r.serviceId);
          if (!svc) return;
          setType('prepaid'); autoCheck.current = true; setService(svc); setMeter(r.customerId);
          if (r.phone && r.phone !== r.customerId) setPhone(r.phone);
        }} />
      <section className="surface rounded-3xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="eyebrow">Electricity company</div>
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-cream-warm dark:bg-night p-1 text-[12.5px] font-semibold">
            {(['prepaid', 'postpaid'] as const).map(t => (
              <button key={t} onClick={() => { setType(t); setService(null); }} className={`rounded-lg px-3 min-h-[36px] capitalize ${type === t ? 'bg-white dark:bg-night-card text-terracotta' : 'muted'}`}>{t}</button>
            ))}
          </div>
        </div>
        {service ? (
          <button onClick={() => setService(null)} className="w-full flex items-center gap-3 rounded-2xl border border-terracotta bg-terracotta-soft p-3 text-left min-h-[56px]">
            <span className="grid place-items-center h-11 w-11 rounded-xl bg-terracotta text-white"><IconBolt size={20} /></span>
            <span className="flex-1 font-medium text-ink dark:text-cream-warm">{service.name}</span>
            <span className="text-[13px] text-terracotta font-semibold">Change</span>
          </button>
        ) : (
          <>
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search — e.g. Ikeja, Abuja, Eko" autoComplete="off"
              className="w-full rounded-xl border border-cream-border dark:border-night-border bg-cream dark:bg-night px-4 min-h-[48px] text-[16px] outline-none focus:border-terracotta" />
            <ul className="mt-2 max-h-72 overflow-y-auto divide-y divide-cream-border dark:divide-night-border">
              {list.map(s => (
                <li key={s.id}>
                  <button onClick={() => setService(s)} className="w-full flex items-center gap-3 py-2.5 min-h-[52px] text-left hover:text-terracotta">
                    <span className="grid place-items-center h-9 w-9 rounded-lg bg-cream-warm dark:bg-night text-[11px] font-semibold text-terracotta">{initials(s.name)}</span>
                    <span className="flex-1 text-[15px]">{s.name}</span>
                    <IconChevron size={16} className="muted" />
                  </button>
                </li>
              ))}
              {list.length === 0 && <li className="py-6 text-center muted text-[14px]">No company matches “{q}”</li>}
            </ul>
          </>
        )}
      </section>

      <section className={`surface rounded-3xl p-5 transition-opacity ${service ? '' : 'opacity-50 pointer-events-none'}`}>
        <label htmlFor="mtr" className="eyebrow">Meter number</label>
        <div className="mt-2 flex gap-2">
          <input id="mtr" value={meter} onChange={e => setMeter(e.target.value.replace(/\D/g, '').slice(0, 13))} inputMode="numeric" autoComplete="off" placeholder="10–13 digits"
            className="flex-1 min-w-0 rounded-xl border border-cream-border dark:border-night-border bg-cream dark:bg-night px-4 min-h-[56px] font-mono text-[19px] tracking-[0.08em] outline-none focus:border-terracotta" />
          <button onClick={() => check()} disabled={meter.length < 10 || checking || !!verified} className="btn-secondary !px-4 min-h-[56px] disabled:opacity-40">
            {checking ? <span className="h-5 w-5 rounded-full border-2 border-current border-t-transparent animate-spin" /> : verified ? <IconCheck /> : 'Check'}
          </button>
        </div>
        {verified && (
          <div className="mt-3 flex items-start gap-3 rounded-2xl bg-[#58834C]/10 px-4 py-3 animate-fade-up">
            <span className="grid place-items-center h-8 w-8 shrink-0 rounded-full bg-[#58834C] text-white"><IconCheck size={16} /></span>
            <div className="min-w-0"><div className="font-semibold text-ink dark:text-cream-warm">{verified.customerName}</div>{verified.address && <div className="text-[13px] muted truncate">{verified.address}</div>}</div>
          </div>
        )}
        <ErrorNote msg={vErr} className="mt-2 text-[14px] text-[#B84A40]" />
      </section>

      {verified && (
        <>
          <section className="surface rounded-3xl p-5 animate-fade-up">
            <div className="eyebrow mb-2">Amount</div>
            <AmountField value={amount} onChange={setAmount} chips={[2000, 5000, 10000, 20000]} min={service?.minNgn || 500} />
            <label htmlFor="eph" className="block mt-4 text-[13px] muted">Phone for the token SMS (optional)</label>
            <input id="eph" value={phone} onChange={e => setPhone(e.target.value.replace(/[^\d+ ]/g, '').slice(0, 16))} inputMode="tel" autoComplete="tel" placeholder="0803 123 4567"
              className="mt-1 w-full rounded-xl border border-cream-border dark:border-night-border bg-cream dark:bg-night px-4 min-h-[48px] font-mono text-[16px] outline-none focus:border-terracotta" />
          </section>
          <CostCard quote={quote} err={err} busy={busy} amountNgn={amountNgn} />
        </>
      )}

      <button disabled={!ready} onClick={() => setReview(true)} className="btn-primary w-full min-h-[56px] text-[16px] disabled:opacity-40 disabled:pointer-events-none">
        {!service ? 'Choose your electricity company' : !verified ? 'Check your meter' : !amountNgn ? 'Choose an amount' : `Review ${naira(amountNgn)} electricity`}
      </button>

      <ReviewSheet open={review} onClose={() => setReview(false)} title="Review electricity" quote={quote} busy={paying} error={payErr}
        lines={[['Company', service?.name || ''], ['Meter', meter], ['Name', verified?.customerName || ''], ['Units for', naira(amountNgn)]]}
        holdLabel={`Hold to pay ${naira(amountNgn)}`}
        onConfirm={() => pay({ serviceId: service!.id, amountNgn, customerId: meter, ...(phoneDigits ? { phone: phoneDigits } : {}) })} />
    </div>
  );
}

// ───────────────────────────── Data + Cable: plan pickers ─────────────────────────────

function usePlans(serviceId: string | null) {
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    setPlans(null); setErr('');
    if (!serviceId) return;
    let live = true;
    kc<{ plans: Plan[] }>(`bills/plans?serviceId=${encodeURIComponent(serviceId)}`)
      .then(r => { if (live) setPlans(r.plans); })
      .catch(e => { if (live) { setPlans([]); setErr(e instanceof Error ? e.message : 'Could not load plans'); } });
    return () => { live = false; };
  }, [serviceId]);
  return { plans, err };
}

function PlanList({ plans, err, value, onPick }: { plans: Plan[] | null; err: string; value: Plan | null; onPick: (p: Plan) => void }) {
  const [q, setQ] = useState('');
  const [span, setSpan] = useState<'all' | 'day' | 'week' | 'month'>('all');
  // Plans have fixed prices, so the box takes a budget ("500" → plans up to ₦500) or words ("1GB").
  const spanOf = (name: string): 'day' | 'week' | 'month' | null =>
    /\b(1|one)\s*day|daily|24\s*h|\b[123]\s*days?\b/i.test(name) ? 'day'
      : /week|7\s*days?|14\s*days?/i.test(name) ? 'week'
      : /month|30\s*days?|31\s*days?/i.test(name) ? 'month' : null;
  const spans = useMemo(() => new Set((plans || []).map(p => spanOf(p.name)).filter(Boolean)), [plans]);
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase().replace(/[₦,\s]/g, '');
    const budget = /^\d+$/.test(s) ? Number(s) : null;
    return (plans || []).filter(p =>
      (span === 'all' || spanOf(p.name) === span) &&
      (!s || (budget !== null ? p.amountNgn <= budget : p.name.toLowerCase().replace(/\s/g, '').includes(s))));
  }, [plans, q, span]);
  if (!plans) return <div className="space-y-2"><Skeleton className="h-12" /><Skeleton className="h-12" /><Skeleton className="h-12" /></div>;
  if (err || plans.length === 0) return <p className="muted text-[14px]">{err || 'No plans available right now — try again shortly.'}</p>;
  return (
    <>
      <div className="flex items-baseline gap-1 rounded-xl border border-cream-border dark:border-night-border bg-cream dark:bg-night px-3 mb-2 focus-within:border-terracotta">
        <span className="text-warmgray text-[15px]">₦</span>
        <input value={q} onChange={e => setQ(e.target.value)} autoComplete="off" aria-label="Budget or search"
          placeholder="Your budget (e.g. 500) or search (1GB)"
          className="flex-1 bg-transparent outline-none min-h-[48px] text-[16px]" />
        {q && <button onClick={() => setQ('')} className="text-[13px] font-semibold text-terracotta min-h-[44px] px-1">Clear</button>}
      </div>
      {spans.size > 1 && (
        <div className="flex gap-2 mb-3 overflow-x-auto">
          {(['all', 'day', 'week', 'month'] as const).filter(k => k === 'all' || spans.has(k)).map(k => (
            <button key={k} onClick={() => setSpan(k)}
              className={`shrink-0 rounded-full px-4 min-h-[38px] text-[13.5px] font-semibold border transition-colors ${span === k ? 'bg-terracotta text-white border-terracotta' : 'border-cream-border dark:border-night-border'}`}>
              {k === 'all' ? 'All' : k === 'day' ? 'Daily' : k === 'week' ? 'Weekly' : 'Monthly'}
            </button>
          ))}
        </div>
      )}
      {shown.length === 0 && <p className="muted text-[14px] py-3 text-center">No plan matches — try a higher budget or clear the filter.</p>}
      <ul className="max-h-80 overflow-y-auto space-y-2 pr-0.5">
        {shown.map(p => {
          const on = value?.code === p.code;
          return (
            <li key={p.code}>
              <button onClick={() => onPick(p)} aria-pressed={on}
                className={`w-full flex items-center gap-3 rounded-2xl border px-4 py-3 min-h-[56px] text-left transition-colors ${on ? 'border-terracotta bg-terracotta-soft' : 'border-cream-border dark:border-night-border hover:border-terracotta'}`}>
                <span className="flex-1 text-[14.5px] text-ink dark:text-cream-warm">{p.name}</span>
                <span className="font-mono text-[14px] font-semibold">{naira(p.amountNgn)}</span>
                {on && <IconCheck size={16} className="text-terracotta" />}
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function Data({ services, recent, onStarted }: { services: Service[]; recent: RecentItem[]; onStarted: (id: string) => void }) {
  const [phone, setPhone] = useState('');
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [detected, setDetected] = useState<string | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [review, setReview] = useState(false);
  const digits = phone.replace(/\D/g, '');
  const { plans, err: pErr } = usePlans(serviceId);
  const { quote, err, busy } = useQuote(plan ? serviceId : null, plan?.amountNgn || 0, 0);
  const { pay, busy: paying, error: payErr } = usePay(onStarted);
  useEffect(() => { setPlan(null); }, [serviceId]);

  useEffect(() => {
    setDetected(null);
    if (digits.length !== 11 && !(digits.startsWith('234') && digits.length === 13)) return;
    let live = true;
    kc<{ network: string | null }>('bills/network', { method: 'POST', body: { phone: digits } })
      .then(r => { if (!live || !r.network) return; const id = DATA_NETWORK[r.network]; setDetected(id); setServiceId(prev => prev || id); })
      .catch(() => {});
    return () => { live = false; };
  }, [digits]);

  const validPhone = /^0[789][01]\d{8}$/.test(digits) || /^234[789][01]\d{8}$/.test(digits);
  const ready = validPhone && !!plan && !!quote?.canPay && !busy;
  const netKey = (id: string | null) => Object.keys(DATA_NETWORK).find(k => DATA_NETWORK[k] === id) || '';

  return (
    <div className="space-y-5 animate-fade-up">
      <RecentRow items={recent} label={r => NETWORK[netKey(r.serviceId)]?.label ? `${NETWORK[netKey(r.serviceId)].label} data` : r.serviceName}
        onPick={r => { setPhone(r.customerId); setServiceId(r.serviceId); }} />
      <section className="surface rounded-3xl p-5">
        <label htmlFor="dph" className="eyebrow">Phone number</label>
        <input id="dph" value={phone} onChange={e => setPhone(e.target.value.replace(/[^\d+ ]/g, '').slice(0, 16))} inputMode="tel" autoComplete="tel" placeholder="0803 123 4567"
          className="mt-2 w-full rounded-xl border border-cream-border dark:border-night-border bg-cream dark:bg-night px-4 min-h-[56px] font-mono text-[20px] tracking-[0.06em] outline-none focus:border-terracotta" />
        <div className="mt-4 grid grid-cols-4 gap-2">
          {services.map(s => {
            const n = NETWORK[netKey(s.id)] || { label: s.name, bg: '#C1502E', fg: '#fff' };
            const on = serviceId === s.id;
            return (
              <button key={s.id} onClick={() => setServiceId(s.id)} aria-pressed={on}
                className={`relative flex flex-col items-center gap-1.5 rounded-2xl border p-2.5 min-h-[76px] transition-all ${on ? 'border-terracotta bg-terracotta-soft' : 'border-cream-border dark:border-night-border'}`}>
                <span className="grid place-items-center h-9 w-9 rounded-full text-[11px] font-bold" style={{ background: n.bg, color: n.fg }}>{n.label.slice(0, 3)}</span>
                <span className="text-[12.5px] font-medium">{n.label}</span>
                {detected === s.id && <span className="absolute -top-2 rounded-full bg-[#58834C] text-white text-[10px] px-1.5 py-0.5">detected</span>}
              </button>
            );
          })}
        </div>
      </section>

      {serviceId && (
        <section className="surface rounded-3xl p-5 animate-fade-up">
          <div className="eyebrow mb-3">Choose a plan</div>
          <PlanList plans={plans} err={pErr} value={plan} onPick={setPlan} />
        </section>
      )}

      {plan && <CostCard quote={quote} err={err} busy={busy} amountNgn={plan.amountNgn} />}

      <button disabled={!ready} onClick={() => setReview(true)} className="btn-primary w-full min-h-[56px] text-[16px] disabled:opacity-40 disabled:pointer-events-none">
        {!validPhone ? 'Enter a phone number' : !serviceId ? 'Choose the network' : !plan ? 'Choose a plan' : `Review ${plan.name}`}
      </button>

      <ReviewSheet open={review} onClose={() => setReview(false)} title="Review data" quote={quote} busy={paying} error={payErr}
        lines={[['Network', NETWORK[netKey(serviceId)]?.label || ''], ['Number', digits], ['Plan', plan?.name || ''], ['Price', naira(plan?.amountNgn || 0)]]}
        holdLabel={`Hold to buy ${plan?.name || 'data'}`}
        onConfirm={() => pay({ serviceId: serviceId!, variationCode: plan!.code, amountNgn: plan!.amountNgn, customerId: digits })} />
    </div>
  );
}

function Cable({ services, recent, onStarted }: { services: Service[]; recent: RecentItem[]; onStarted: (id: string) => void }) {
  const [service, setService] = useState<Service | null>(null);
  const [card, setCard] = useState('');
  const [verified, setVerified] = useState<{ customerName: string } | null>(null);
  const [checking, setChecking] = useState(false);
  const [vErr, setVErr] = useState('');
  const [plan, setPlan] = useState<Plan | null>(null);
  const [review, setReview] = useState(false);
  const { plans, err: pErr } = usePlans(verified ? service?.id || null : null);
  const { quote, err, busy } = useQuote(plan ? service?.id || null : null, plan?.amountNgn || 0, 0);
  const { pay, busy: paying, error: payErr } = usePay(onStarted);
  const autoCheck = useRef(false);

  useEffect(() => { setVerified(null); setVErr(''); setPlan(null); }, [service, card]);
  useEffect(() => {
    if (autoCheck.current && service && card.length >= 8) { autoCheck.current = false; check(service, card); }
  }, [service, card]); // eslint-disable-line react-hooks/exhaustive-deps

  async function check(svc: Service | null = service, c: string = card) {
    if (!svc) return;
    setChecking(true); setVErr('');
    try {
      setVerified(await kc<{ customerName: string }>('bills/verify', { method: 'POST', body: { serviceId: svc.id, customerId: c } }));
    } catch (e) {
      setVErr(e instanceof Error ? e.message : 'Could not verify this smartcard');
    } finally {
      setChecking(false);
    }
  }
  const ready = !!verified && !!plan && !!quote?.canPay && !busy;

  return (
    <div className="space-y-5 animate-fade-up">
      <RecentRow items={recent} label={r => r.customerName || r.serviceName}
        onPick={r => { const svc = services.find(x => x.id === r.serviceId); if (!svc) return; autoCheck.current = true; setService(svc); setCard(r.customerId); }} />
      <section className="surface rounded-3xl p-5">
        <div className="eyebrow mb-3">TV provider</div>
        <div className="grid grid-cols-3 gap-2">
          {services.map(s => (
            <button key={s.id} onClick={() => setService(s)} aria-pressed={service?.id === s.id}
              className={`rounded-2xl border min-h-[56px] font-semibold text-[15px] transition-colors ${service?.id === s.id ? 'border-terracotta bg-terracotta-soft text-terracotta' : 'border-cream-border dark:border-night-border'}`}>
              {s.name}
            </button>
          ))}
        </div>
      </section>

      <section className={`surface rounded-3xl p-5 transition-opacity ${service ? '' : 'opacity-50 pointer-events-none'}`}>
        <label htmlFor="iuc" className="eyebrow">Smartcard / IUC number</label>
        <div className="mt-2 flex gap-2">
          <input id="iuc" value={card} onChange={e => setCard(e.target.value.replace(/\D/g, '').slice(0, 12))} inputMode="numeric" autoComplete="off" placeholder="8–12 digits"
            className="flex-1 min-w-0 rounded-xl border border-cream-border dark:border-night-border bg-cream dark:bg-night px-4 min-h-[56px] font-mono text-[19px] tracking-[0.08em] outline-none focus:border-terracotta" />
          <button onClick={() => check()} disabled={card.length < 8 || checking || !!verified} className="btn-secondary !px-4 min-h-[56px] disabled:opacity-40">
            {checking ? <span className="h-5 w-5 rounded-full border-2 border-current border-t-transparent animate-spin" /> : verified ? <IconCheck /> : 'Check'}
          </button>
        </div>
        {verified && (
          <div className="mt-3 flex items-center gap-3 rounded-2xl bg-[#58834C]/10 px-4 py-3 animate-fade-up">
            <span className="grid place-items-center h-8 w-8 shrink-0 rounded-full bg-[#58834C] text-white"><IconCheck size={16} /></span>
            <div className="font-semibold text-ink dark:text-cream-warm">{verified.customerName}</div>
          </div>
        )}
        <ErrorNote msg={vErr} className="mt-2 text-[14px] text-[#B84A40]" />
      </section>

      {verified && (
        <section className="surface rounded-3xl p-5 animate-fade-up">
          <div className="eyebrow mb-3">Choose a package</div>
          <PlanList plans={plans} err={pErr} value={plan} onPick={setPlan} />
        </section>
      )}

      {plan && <CostCard quote={quote} err={err} busy={busy} amountNgn={plan.amountNgn} />}

      <button disabled={!ready} onClick={() => setReview(true)} className="btn-primary w-full min-h-[56px] text-[16px] disabled:opacity-40 disabled:pointer-events-none">
        {!service ? 'Choose your TV provider' : !verified ? 'Check your smartcard' : !plan ? 'Choose a package' : `Review ${plan.name}`}
      </button>

      <ReviewSheet open={review} onClose={() => setReview(false)} title="Review subscription" quote={quote} busy={paying} error={payErr}
        lines={[['Provider', service?.name || ''], ['Smartcard', card], ['Name', verified?.customerName || ''], ['Package', plan?.name || ''], ['Price', naira(plan?.amountNgn || 0)]]}
        holdLabel={`Hold to pay ${naira(plan?.amountNgn || 0)}`}
        onConfirm={() => pay({ serviceId: service!.id, variationCode: plan!.code, amountNgn: plan!.amountNgn, customerId: card })} />
    </div>
  );
}

// ───────────────────────────── Progress + outcome ─────────────────────────────

function Progress({ jobId, onFinish }: { jobId: string; onFinish: () => void }) {
  const [job, setJob] = useState<Job | null>(null);
  const [lost, setLost] = useState(false);

  useEffect(() => {
    let live = true; let misses = 0; let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const j = await kc<Job>(`bills/jobs/${jobId}`);
        if (!live) return;
        misses = 0; setJob(j);
        if (j.status === 'done') return;
      } catch (e) {
        if (e instanceof KcError && e.status === 404) { if (live) setLost(true); return; }
        misses++;
      }
      if (live) timer = setTimeout(poll, misses ? Math.min(8000, 1500 * misses) : 1000);
    };
    poll();
    return () => { live = false; clearTimeout(timer); };
  }, [jobId]);

  if (lost) {
    return <Outcome tone="info" title="We lost track of this screen" body="The payment itself is unaffected — check Activity for its status."
      actions={<><Link href="/app/activity" onClick={onFinish} className="btn-primary w-full">Open Activity</Link><button onClick={onFinish} className="btn-ghost w-full">Close</button></>} />;
  }
  const r = job?.result;
  if (job?.status === 'done' && r) {
    if (r.ok) {
      const isElec = job.category === 'electricity';
      return (
        <section className="flex flex-col gap-4">
          <Outcome tone="success"
            title={isElec ? `${naira(job.amountNgn)} electricity paid`
              : job.category === 'data' ? `${r.planName || 'Data'} sent`
              : job.category === 'cable' ? `${r.planName || 'Subscription'} paid`
              : `${naira(job.amountNgn)} airtime sent`}
            body={(isElec ? `${r.serviceName} · meter ${r.customerId}${r.customerName ? ` · ${r.customerName}` : ''}`
              : job.category === 'cable' ? `${r.serviceName} · smartcard ${r.customerId}${r.customerName ? ` · ${r.customerName}` : ''}. It usually activates within minutes.`
              : `To ${r.customerId}. It usually lands in seconds.`) + (r.funding ? ` Paid from ${r.funding.label}.` : '')}
            reference={r.reference}
            actions={<>
              <Link href="/app" onClick={onFinish} className="btn-primary w-full">Done</Link>
              {r.reference && <ReceiptButton reference={r.reference} kind="utility" />}
              <button onClick={onFinish} className="block w-full text-center text-[14px] font-semibold text-terracotta min-h-[44px]">Pay another bill</button>
            </>} />
          {r.token && (
            <div className="surface rounded-3xl p-5 text-center animate-fade-up order-first">
              <div className="eyebrow">Your token</div>
              <div className="mt-2 font-mono text-[24px] sm:text-[28px] font-bold tracking-[0.08em] text-ink dark:text-cream-warm break-all">{r.token}</div>
              {r.units && <div className="mt-1 muted text-[14px]">{r.units} kWh</div>}
              <div className="mt-3 flex justify-center"><CopyButton value={r.token} label="Copy token" /></div>
              <p className="mt-2 text-[12.5px] muted">Enter it on your meter. It’s also on your receipt and in Telegram.</p>
            </div>
          )}
          {r.cashback && <p className="text-center text-[13.5px] text-[#58834C]">+{r.cashback.amount.toFixed(4)} {r.cashback.asset} cashback on its way</p>}
        </section>
      );
    }
    if (r.code === 'OUTCOME_UNKNOWN') {
      return <Outcome tone="warn" title="Being confirmed" body="Please don’t pay again. We’re confirming the payment and will complete it or refund you — you’ll hear from us on Telegram."
        reference={r.reference} actions={<button onClick={onFinish} className="btn-primary w-full">Got it</button>} />;
    }
    if (r.code === 'IN_PROGRESS') {
      return <Outcome tone="info" title="Another payment is still running" body="Wait for it to finish, then try again."
        actions={<button onClick={onFinish} className="btn-primary w-full">OK</button>} />;
    }
    return <Outcome tone="error" title="The payment didn’t go through" body={`${r.error ? `${r.error}. ` : ''}If any money left your wallet, our team has already been alerted and will refund it.`}
      reference={r.reference} actions={<><button onClick={onFinish} className="btn-primary w-full">Try again</button><a href={SUPPORT_URL} target="_blank" rel="noopener noreferrer" className="btn-ghost w-full">Message support</a></>} />;
  }

  return (
    <section className="surface rounded-3xl p-8 text-center animate-fade-up" aria-live="polite">
      <div className="relative mx-auto h-24 w-24">
        <span className="absolute inset-0 rounded-full border-4 border-cream-warm dark:border-night" />
        <span className="absolute inset-0 rounded-full border-4 border-terracotta border-t-transparent animate-spin" style={{ animationDuration: '1.1s' }} />
        <span className="absolute inset-0 grid place-items-center text-terracotta"><IconBolt size={34} /></span>
      </div>
      <div className="font-display text-[22px] font-bold text-ink dark:text-cream-warm mt-5">
        {job?.stage === 'paying' ? 'Paying…' : 'Checking…'} {job ? naira(job.amountNgn) : ''}
      </div>
      <p className="muted text-[14px] mt-1">This usually takes a few seconds. You can leave this screen — it keeps going.</p>
    </section>
  );
}
