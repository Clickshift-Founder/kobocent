'use client';
import { ErrorNote } from '@/components/app/ErrorNote';
import { AskPalButton } from '@/components/app/Pal';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { kc, KcError, usd, naira, amount, BOT_URL } from '@/lib/kc';
import { PageHeader } from '@/components/app/PageHeader';
import { Sheet, Skeleton, CopyButton, ReceiptButton } from '@/components/app/ui';
import { TelegramLogin, type TelegramUser } from '@/components/app/TelegramLogin';
import { IconBank, IconCheck, IconShield, IconChevron, IconPlus } from '@/components/app/Icons';
import { useLiveRefresh } from '@/lib/useLiveRefresh';
import { newKey, store, read, initials, useCountUp, HoldToConfirm, Outcome } from '@/components/app/money';

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
// Spend from any chain (2026-10-07): a withdrawal can be paid from SOL, or USDT/USDC/native coins on EVM chains.
interface Source { id: string; chain: string; chainLabel: string; symbol: string; kind: 'solana_stable' | 'sol' | 'evm_stable' | 'evm_native'; balance: number | null; priceUsd: number | null; valueUsd: number | null }
interface NetworkFee { payer: 'user' | 'kobocent' | 'recovered'; native: string; amount: number; usd: number | null }
interface Funding { sourceId: string; label: string; chain: string; chainLabel: string; collect: { amount: number; symbol: string } | null; priceUsd: number; networkFee: NetworkFee | null; eta?: string }
interface Quote { amountUsd: number; feeRate: number; fee: number; net: number; displayRate: number; midMarket: number; payoutNgn: number; enough: boolean | null; funding?: Funding }
interface JobFunding { label: string; amount: number; asset: string; explorerUrl: string | null }
interface Job {
  id: string; status: 'running' | 'done'; stage: string; amountUsd: number;
  result: null | { ok: boolean; code: string | null; reference: string | null; payoutNgn: number | null; signature: string | null; error: string | null; funding?: JobFunding | null; explorerUrl?: string | null };
}
interface PayFrom { id: string; title: string; sub: string; symbol: string; kind: Source['kind']; chain: string; balance: number | null; valueUsd: number | null }
const SOLANA_STABLES = 'solana';
// Which balance to use when the user hasn't chosen: Solana stablecoins, then stablecoins on cheap chains,
// then SOL and native coins, then Ethereum stablecoins (its network fee is the highest).
function rank(o: PayFrom) {
  if (o.id === SOLANA_STABLES) return 0;
  if (o.kind === 'evm_stable') return o.chain === 'ETH' ? 4 : 1;
  if (o.kind === 'sol') return 2;
  return 3;
}
function coinAmount(n: number) { return amount(n, n < 1 ? 6 : 4); }
type Screen = 'loading' | 'bank' | 'amount' | 'progress';

const JOB_KEY = 'kc-withdraw-job';
const SUPPORT_URL = 'https://t.me/ClickShiftAlerts';

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
        <div className="surface rounded-2xl p-5 text-[15px]">{error} <button onClick={() => { setError(''); load(); }} className="underline font-semibold text-terracotta">Retry</button><div><AskPalButton about={error} className="-ml-1" /></div></div>
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
          <ErrorNote msg={err} className="text-[14px] text-[#B84A40] mt-1" />
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
  const [raw, setRaw] = useState('');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [qErr, setQErr] = useState('');
  const [serverMax, setServerMax] = useState<number | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [review, setReview] = useState(false);
  const [starting, setStarting] = useState(false);
  const [startErr, setStartErr] = useState('');
  const keyRef = useRef<string>(newKey());

  // Pay from: Solana USDC/USDT (one option, as before) + every other balance worth spending.
  const [sources, setSources] = useState<Source[] | null>(null);
  const [from, setFrom] = useState(SOLANA_STABLES);
  const [manual, setManual] = useState(false);
  const [picking, setPicking] = useState(false);
  useEffect(() => { kc<{ sources: Source[] }>('withdraw/sources').then(r => setSources(r.sources)).catch(() => setSources([])); }, []);
  const options = useMemo<PayFrom[]>(() => {
    const sol: PayFrom = { id: SOLANA_STABLES, title: 'USDC & USDT', sub: 'Solana', symbol: 'USD', kind: 'solana_stable', chain: 'SOLANA', balance: ov.balances?.total ?? null, valueUsd: ov.balances?.total ?? null };
    const rest = (sources || []).filter(s => s.kind !== 'solana_stable' && (s.valueUsd ?? 0) >= 0.5)
      .map(s => ({ id: s.id, title: s.symbol, sub: s.chainLabel, symbol: s.symbol, kind: s.kind, chain: s.chain, balance: s.balance, valueUsd: s.valueUsd }))
      .sort((a, b) => (b.valueUsd ?? 0) - (a.valueUsd ?? 0));
    return [sol, ...rest];
  }, [sources, ov.balances?.total]);
  const sel = options.find(o => o.id === from) || options[0];
  const totalAll = options.reduce((s, o) => s + (o.valueUsd ?? 0), 0);
  const isSolana = sel.id === SOLANA_STABLES;

  const value = Number(raw) || 0;
  // Until the user picks, choose the balance that covers the amount at the lowest cost.
  useEffect(() => {
    if (manual) return;
    const covers = options.filter(o => (o.valueUsd ?? 0) >= value);
    const best = (covers.length ? covers : [...options].sort((a, b) => (b.valueUsd ?? 0) - (a.valueUsd ?? 0))).sort((a, b) => (covers.length ? rank(a) - rank(b) : 0))[0];
    if (best && best.id !== from) setFrom(best.id);
  }, [value, options, manual, from]);

  const selValue = sel.valueUsd;
  const maxUsd = serverMax ?? (selValue === null ? null : Math.min(Math.floor(selValue * 100) / 100, ov.limits.maxUsd));
  const shownNgn = useCountUp(quote && value > 0 ? quote.payoutNgn : null);

  // Debounced live quote.
  useEffect(() => {
    setQErr('');
    if (!value) { setQuote(null); return; }
    if (value < ov.limits.minUsd) { setQuote(null); setQErr(`The minimum is ${usd(ov.limits.minUsd)}`); return; }
    if (value > ov.limits.maxUsd) { setQuote(null); setQErr(`Above ${usd(ov.limits.maxUsd)} we process withdrawals by hand — message support and we’ll do it for you.`); return; }
    let live = true;
    setQuoting(true);
    setServerMax(null);
    const t = setTimeout(() => {
      kc<Quote>('withdraw/quote', { method: 'POST', body: { amountUsd: value, ...(isSolana ? {} : { from }) } })
        .then(q => { if (live) setQuote(q); })
        .catch(e => {
          if (!live) return;
          setQuote(null);
          setQErr(e instanceof Error ? e.message : 'Could not get a rate');
          const m = e instanceof KcError ? Number(e.data?.maxUsd) : NaN;
          if (Number.isFinite(m) && m > 0) setServerMax(Math.min(m, ov.limits.maxUsd));
        })
        .finally(() => { if (live) setQuoting(false); });
    }, 350);
    return () => { live = false; clearTimeout(t); };
  }, [value, from, isSolana, ov.limits.minUsd, ov.limits.maxUsd]);

  // Solana stablecoins are exact; other balances are checked by the quote (it knows gas and live prices).
  const short = isSolana && selValue !== null && value > selValue;
  const canReview = !!quote && !short && !quoting && value >= ov.limits.minUsd;
  const nf = quote?.funding?.networkFee || null;
  const feeLine = !quote?.funding ? null
    : !nf || nf.payer === 'kobocent' ? 'Covered by Kobocent'
    : nf.payer === 'user' ? `${coinAmount(nf.amount)} ${nf.native} from your balance${nf.usd ? ` (≈${usd(nf.usd)})` : ''}`
    : `${usd(nf.usd)} ${quote.funding.chainLabel} network fee`;
  const paidFrom = quote?.funding?.collect ? `${coinAmount(quote.funding.collect.amount)} ${quote.funding.collect.symbol} on ${quote.funding.chainLabel}` : 'USDC first, then USDT';

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
      const job = await kc<Job>('withdraw', { method: 'POST', body: { amountUsd: value, idempotencyKey: keyRef.current, ...(isSolana ? {} : { from }) } });
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
          {isSolana
            ? (ov.balances ? <>Available <strong className="text-ink dark:text-cream-warm">{usd(ov.balances.total)}</strong> · USDC {usd(ov.balances.usdc)} · USDT {usd(ov.balances.usdt)}</> : 'Balance unavailable right now')
            : <>From {sel.title} on {sel.sub}: about <strong className="text-ink dark:text-cream-warm">{usd(selValue)}</strong></>}
          {options.length > 1 && totalAll > (selValue ?? 0) + 0.5 && <div className="mt-1">You can spend {usd(totalAll)} across all your balances</div>}
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

      {/* Pay from — any chain; picked automatically until the user chooses */}
      {options.length > 1 && (
        <button onClick={() => setPicking(true)} className="w-full surface rounded-2xl px-4 py-3 flex items-center gap-3 text-left hover:border-terracotta transition-colors min-h-[60px]">
          <ChainBadge o={sel} />
          <div className="flex-1 min-w-0">
            <div className="text-[12.5px] muted">Pay from{!manual && ' · picked for the lowest cost'}</div>
            <div className="font-semibold text-ink dark:text-cream-warm truncate">{sel.title} <span className="muted font-normal">on {sel.sub}</span></div>
          </div>
          <span className="text-[13px] font-semibold text-terracotta">Change</span>
        </button>
      )}

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
                <dt className="text-cream/70">Fee</dt><dd className="text-right font-mono">{usd(quote.fee)}</dd>
                <dt className="text-cream/70">Rate</dt><dd className="text-right font-mono">₦{quote.displayRate.toLocaleString('en-NG')} / $1</dd>
                {quote.displayRate > quote.midMarket && (<><dt className="text-cream/70">Above mid-market</dt><dd className="text-right font-mono text-terracotta-light">+₦{(quote.displayRate - quote.midMarket).toLocaleString('en-NG')} / $1</dd></>)}
                {quote.funding && (<>
                  <dt className="text-cream/70">Paid from</dt><dd className="text-right font-mono">{paidFrom}</dd>
                  <dt className="text-cream/70">Network fee</dt><dd className="text-right">{feeLine}</dd>
                </>)}
                <dt className="text-cream/70">Arrives</dt><dd className="text-right">{quote.funding?.eta && quote.funding.eta !== 'seconds' ? `Confirms on ${quote.funding.chainLabel} in ${quote.funding.eta}, then minutes` : 'Usually within minutes'}</dd>
              </dl>
            )}
          </div>
        )}
      </section>

      <button disabled={!canReview} onClick={() => { setStartErr(''); setReview(true); }} className="btn-primary w-full min-h-[56px] text-[16px] disabled:opacity-40 disabled:pointer-events-none">
        {quoting && value ? 'Getting your rate…' : 'Review withdrawal'}
      </button>

      {/* Fee tiers are not shown (2026-10-05: business decision) — the quote shows the fee amount. */}
      {(!nf || nf.payer === 'kobocent') && <p className="text-center text-[13.5px] muted">No network fees for you — Kobocent covers them.</p>}

      <Sheet open={picking} onClose={() => setPicking(false)} title="Pay from">
        <p className="muted text-[14px] -mt-1 mb-3">Spend from any balance — we handle the network behind the scenes.</p>
        <ul className="space-y-2">
          {options.map(o => (
            <li key={o.id}>
              <button onClick={() => { setFrom(o.id); setManual(true); setPicking(false); }}
                className={`w-full flex items-center gap-3 rounded-2xl border p-3.5 min-h-[64px] text-left transition-colors ${o.id === sel.id ? 'border-terracotta bg-terracotta-soft' : 'border-cream-border dark:border-night-border hover:border-terracotta'}`}>
                <ChainBadge o={o} />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-ink dark:text-cream-warm">{o.title}</div>
                  <div className="muted text-[13px] truncate">{o.sub}{o.id !== SOLANA_STABLES && o.balance !== null ? ` · ${coinAmount(o.balance)} ${o.symbol}` : ''}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-[14px] text-ink dark:text-cream-warm">{usd(o.valueUsd)}</div>
                  {o.id === sel.id && <IconCheck size={16} className="text-terracotta ml-auto mt-0.5" />}
                </div>
              </button>
            </li>
          ))}
        </ul>
        {sources === null && <p className="muted text-[13px] mt-3">Checking your other balances…</p>}
      </Sheet>

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
              <dt className="muted">Paid from</dt><dd className="text-right">{paidFrom}</dd>
              {feeLine && (<><dt className="muted">Network fee</dt><dd className="text-right">{feeLine}</dd></>)}
            </dl>
            {quote.funding && quote.funding.collect && quote.funding.priceUsd !== 1 && (
              <p className="mt-2 text-[12.5px] muted text-center">Priced at {usd(quote.funding.priceUsd)} per {quote.funding.collect.symbol}, live — the exact amount is set the moment you confirm.</p>
            )}
            <ErrorNote msg={startErr} className="mt-4 text-[14px] text-[#B84A40]" />
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

const CHAIN_COLOR: Record<string, string> = { SOLANA: '#7A5AF8', ETH: '#627EEA', BNB: '#D9A400', POLYGON: '#8247E5', ARBITRUM: '#2D74DA', ROBINHOOD: '#1F9D55' };
function ChainBadge({ o }: { o: PayFrom }) {
  const text = o.id === SOLANA_STABLES ? '$' : o.symbol.slice(0, 4);
  return (
    <span className="relative grid place-items-center h-11 w-11 shrink-0 rounded-2xl bg-cream-warm dark:bg-night font-semibold text-[12.5px] text-ink dark:text-cream-warm">
      {text}
      <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full ring-2 ring-white dark:ring-night-card" style={{ background: CHAIN_COLOR[o.chain] || '#C1502E' }} aria-hidden />
    </span>
  );
}

// ───────────────────────────── Progress + outcome ─────────────────────────────

const STEPS = [
  { key: 'sending', title: 'Securing your funds', sub: 'Moving them to Kobocent on-chain' },
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
        <Outcome tone="success" title={`${naira(r.payoutNgn)} is on its way`}
          body={`We’ve sent it to ${bankName}${r.funding ? `, paid from ${coinAmount(r.funding.amount)} ${r.funding.label}` : ''}. It usually arrives within minutes — your receipt and cashback land in Telegram.`}
          reference={r.reference} signature={r.funding ? null : r.signature}
          actions={<>
            <Link href="/app" onClick={() => onFinish(false)} className="btn-primary w-full">Done</Link>
            {r.funding?.explorerUrl && <a href={r.funding.explorerUrl} target="_blank" rel="noopener noreferrer" className="block text-center text-[14px] font-semibold text-terracotta min-h-[44px] leading-[44px]">View the on-chain transfer</a>}
            {r.reference && <div><ReceiptButton reference={r.reference} wait /></div>}
            <Link href="/app/activity" onClick={() => onFinish(false)} className="block text-center text-[14px] font-semibold text-terracotta min-h-[44px] leading-[44px]">View activity</Link>
          </>} />
      );
    }
    if (r.code === 'OUTCOME_UNKNOWN') {
      return (
        <Outcome tone="warn" title="Being confirmed on the network" body={r.error || 'Please don’t withdraw again. We’re checking the transfer and will complete it or message you on Telegram.'}
          reference={r.signature} actions={<>
            <button onClick={() => onFinish(false)} className="btn-primary w-full">Got it</button>
            {r.explorerUrl && <a href={r.explorerUrl} target="_blank" rel="noopener noreferrer" className="block text-center text-[14px] font-semibold text-terracotta min-h-[44px] leading-[44px]">View the on-chain transfer</a>}
          </>} />
      );
    }
    if (r.code === 'PAYOUT_FAILED' || r.code === 'NEEDS_REVIEW' || r.code === 'SPLIT_USDT_FAILED') {
      return (
        <Outcome tone="warn" title="Your money is safe" body="It’s in the Kobocent vault, and our team has already been alerted to finish your payout. No need to try again."
          reference={r.signature} actions={<><a href={SUPPORT_URL} target="_blank" rel="noopener noreferrer" className="btn-primary w-full">Message support</a><button onClick={() => onFinish(false)} className="btn-ghost w-full">Close</button></>} />
      );
    }
    const msg = r.code === 'INSUFFICIENT' ? (r.error || 'Your balance changed before we could send it.') : r.code === 'IN_PROGRESS' ? 'Another withdrawal was still being processed.' : (r.error || 'Something went wrong.');
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

