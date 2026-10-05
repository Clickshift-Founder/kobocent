'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { kc, KcError, naira, amount, loadProfile, dayLabel } from '@/lib/kc';
import { PageHeader } from '@/components/app/PageHeader';
import { Sheet, Skeleton, CopyButton } from '@/components/app/ui';
import { TelegramLogin, type TelegramUser } from '@/components/app/TelegramLogin';
import { IconShield, IconCheck, IconBank, IconChevron } from '@/components/app/Icons';
import { useCountUp } from '@/components/app/money';
import { ReceiveCrypto } from '@/components/app/ReceiveCrypto';

/**
 * Add money — naira → USDC through the user's own permanent account number (Flutterwave).
 * Backend /api/v1/onramp. No money moves from this screen: the user transfers from their bank app
 * and the Flutterwave webhook credits USDC (as on Telegram). The screen explains, calculates,
 * and watches for the deposit so the moment it lands feels like magic.
 */

interface Kyc { type: 'bvn' | 'nin' | null; masked: string | null; verified: boolean }
interface Account { bankName: string; accountNumber: string }
interface Deposit { reference: string | null; amountNgn: number | null; usdc: number | null; status: string | null; at: number | null }
interface Quote { amountNgn: number; rate: number; displayRate: number; feeRate: number; feeNgn: number; netNgn: number; usdc: number }
interface Overview { kyc: Kyc; account: Account | null; deposits: Deposit[]; example: Quote | null; tiers: Array<{ upToUsd: number | null; pct: number }>; minNgn: number }

export default function AddMoneyPage() {
  const [ov, setOv] = useState<Overview | null>(null);
  const [error, setError] = useState('');
  const [needsLink, setNeedsLink] = useState(false);

  const load = useCallback(async (silent = false) => {
    try { setOv(await kc<Overview>('onramp')); }
    catch (e) {
      if (e instanceof KcError && e.status === 409) setNeedsLink(true);
      else if (!silent) setError(e instanceof Error ? e.message : 'Could not load Add money');
    }
  }, []);
  // Two ways money comes in (2026-10-05): naira by bank transfer, or crypto to your addresses.
  // ?tab=crypto opens the second (old /app/receive links land there).
  const [tab, setTab] = useState<'bank' | 'crypto'>('bank');
  useEffect(() => {
    try { if (new URLSearchParams(window.location.search).get('tab') === 'crypto') setTab('crypto'); } catch { /* ignore */ }
  }, []);
  const pick = (t: 'bank' | 'crypto') => {
    setTab(t);
    try { window.history.replaceState(null, '', t === 'crypto' ? '/app/add-money?tab=crypto' : '/app/add-money'); } catch { /* ignore */ }
  };
  useEffect(() => { load(); }, [load]);

  const tabs = (
    <div role="tablist" aria-label="How to add money" className="grid grid-cols-2 gap-1 rounded-2xl bg-cream-warm dark:bg-night p-1">
      {([['bank', 'Bank transfer (₦)'], ['crypto', 'Crypto']] as const).map(([k, label]) => (
        <button key={k} role="tab" aria-selected={tab === k} onClick={() => pick(k)}
          className={`min-h-[44px] rounded-xl text-[14.5px] font-semibold transition ${tab === k ? 'bg-white dark:bg-night-card text-terracotta shadow-sm' : 'muted'}`}>{label}</button>
      ))}
    </div>
  );

  if (tab === 'crypto') {
    return (
      <div className="space-y-6">
        <PageHeader title="Add money" subtitle="Receive USDC, USDT, SOL or ETH from any wallet or exchange." />
        {tabs}
        <ReceiveCrypto />
      </div>
    );
  }

  if (needsLink) {
    return (
      <div className="space-y-6">
        <PageHeader title="Add money" />
        {tabs}
        <div className="surface rounded-3xl p-6 text-center">
          <p className="muted text-[15px] leading-relaxed mb-4">Link your Telegram account to add money by bank transfer from the web app.</p>
          <Link href="/app/settings" className="btn-primary">Open Settings</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Add money" subtitle="Send naira from any Nigerian bank app — it arrives in your wallet as USDC." />
      {tabs}
      {error ? (
        <div className="surface rounded-2xl p-5 text-[15px]">{error} <button onClick={() => { setError(''); load(); }} className="underline font-semibold text-terracotta">Retry</button></div>
      ) : !ov ? (
        <div className="space-y-3"><Skeleton className="h-48" /><Skeleton className="h-32" /><Skeleton className="h-24" /></div>
      ) : ov.account ? (
        <Funded ov={ov} reload={load} />
      ) : (
        <GetAccount kyc={ov.kyc} example={ov.example} onReady={() => load()} />
      )}
    </div>
  );
}

// ───────────────────────────── First time: BVN/NIN → account ─────────────────────────────

function GetAccount({ kyc, example, onReady }: { kyc: Kyc; example: Quote | null; onReady: () => void }) {
  const [type, setType] = useState<'bvn' | 'nin'>('bvn');
  const [num, setNum] = useState('');
  const [show, setShow] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const digits = num.replace(/\D/g, '');

  const createAccount = useCallback(async () => {
    setBusy(true); setErr('');
    try { await kc('onramp/account', { method: 'POST', body: {} }); onReady(); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Could not create your account'); }
    finally { setBusy(false); }
  }, [onReady]);

  async function onAuth(user: TelegramUser) {
    setBusy(true); setErr('');
    try {
      const { reauthToken } = await kc<{ reauthToken: string }>('auth/reauth', { method: 'POST', body: user });
      await kc('onramp/kyc', { method: 'POST', body: { type, number: digits }, headers: { 'X-Reauth-Token': reauthToken } });
      setConfirm(false);
      await createAccount(); // straight on to the account number — one flow, no extra tap
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not save it');
      setConfirm(false);
      setBusy(false);
    }
  }

  // Already has BVN/NIN on file (e.g. from Telegram): one tap to the account number.
  if (kyc.type) {
    return (
      <section className="surface rounded-3xl p-6 text-center animate-fade-up">
        <span className="mx-auto grid place-items-center h-16 w-16 rounded-2xl bg-terracotta-soft text-terracotta"><IconBank size={30} /></span>
        <h2 className="font-display text-[24px] font-bold text-ink dark:text-cream-warm mt-4">Get your account number</h2>
        <p className="muted text-[15px] mt-2 leading-relaxed">Your {kyc.type.toUpperCase()} ({kyc.masked}) is on file. We’ll open a permanent Nigerian account number that’s yours alone.</p>
        {err && <p className="mt-3 text-[14px] text-[#B84A40]">{err}</p>}
        <button onClick={createAccount} disabled={busy} className="btn-primary w-full mt-5 min-h-[56px]">
          {busy ? <><span className="h-5 w-5 rounded-full border-2 border-white border-t-transparent animate-spin" />Opening your account…</> : 'Create my account number'}
        </button>
      </section>
    );
  }

  return (
    <div className="space-y-5 animate-fade-up">
      {/* What you get */}
      <section className="relative overflow-hidden rounded-3xl bg-ink dark:bg-night-card text-cream p-6 shadow-card">
        <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-terracotta/30 blur-2xl" aria-hidden="true" />
        <div className="relative">
          <div className="eyebrow !text-cream/60">Your own account number</div>
          <h2 className="font-display text-[26px] font-bold leading-tight mt-1">Naira in, USDC out — in minutes</h2>
          <ol className="mt-4 space-y-2.5 text-[14.5px]">
            {['Get a permanent Nigerian account number', 'Transfer any amount from your bank app', 'USDC lands in your wallet, usually in 1–5 minutes'].map((t, i) => (
              <li key={t} className="flex items-center gap-3"><span className="grid place-items-center h-7 w-7 shrink-0 rounded-full bg-white/10 text-[13px] font-semibold">{i + 1}</span>{t}</li>
            ))}
          </ol>
          {example && <p className="mt-4 text-[13px] text-cream/70">Today: {naira(example.amountNgn)} ≈ <strong className="text-cream">{amount(example.usdc, 2)} USDC</strong></p>}
        </div>
      </section>

      {/* BVN or NIN */}
      <section className="surface rounded-3xl p-5">
        <div className="font-semibold text-ink dark:text-cream-warm">Verify once with BVN or NIN</div>
        <p className="muted text-[13.5px] mt-1 leading-relaxed">Nigerian rules require it to open an account in your name. Either one works.</p>
        <div role="tablist" className="mt-4 grid grid-cols-2 gap-1 rounded-2xl bg-cream-warm dark:bg-night p-1">
          {(['bvn', 'nin'] as const).map(t => (
            <button key={t} role="tab" aria-selected={type === t} onClick={() => setType(t)}
              className={`rounded-xl min-h-[46px] text-[15px] font-semibold transition-colors ${type === t ? 'bg-white dark:bg-night-card text-terracotta shadow-soft' : 'muted'}`}>
              {t === 'bvn' ? 'BVN' : 'NIN'}
            </button>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-cream-border dark:border-night-border bg-cream dark:bg-night px-4 focus-within:border-terracotta">
          <input value={num} onChange={e => setNum(e.target.value.replace(/\D/g, '').slice(0, 11))} inputMode="numeric" autoComplete="off"
            type={show ? 'text' : 'password'} placeholder={`11-digit ${type.toUpperCase()}`} aria-label={`Your ${type.toUpperCase()}`}
            className="flex-1 bg-transparent outline-none min-h-[56px] font-mono text-[20px] tracking-[0.12em]" />
          <button onClick={() => setShow(s => !s)} className="text-[13px] font-semibold text-terracotta min-h-[44px] px-1">{show ? 'Hide' : 'Show'}</button>
        </div>
        <div className="mt-2 flex justify-between text-[12.5px] muted">
          <span>{type === 'bvn' ? 'Find it: your bank app, or dial *565*0#' : 'Find it: NIN slip or card, or dial *346#'}</span>
          <span className="font-mono">{digits.length}/11</span>
        </div>
        <ul className="mt-4 space-y-1.5 text-[13px] muted">
          <li className="flex gap-2"><IconShield size={16} className="text-terracotta shrink-0 mt-0.5" />Encrypted the moment it’s saved — never shown in full again.</li>
          <li className="flex gap-2"><IconCheck size={16} className="text-terracotta shrink-0 mt-0.5" />Used only to open your account. We can’t move money with it.</li>
        </ul>
        {err && <p className="mt-3 text-[14px] text-[#B84A40]">{err}</p>}
        <button disabled={digits.length !== 11 || busy} onClick={() => setConfirm(true)} className="btn-primary w-full mt-5 min-h-[56px] disabled:opacity-40 disabled:pointer-events-none">
          {busy ? <><span className="h-5 w-5 rounded-full border-2 border-white border-t-transparent animate-spin" />Opening your account…</> : 'Continue'}
        </button>
      </section>

      <Sheet open={confirm} onClose={() => !busy && setConfirm(false)} title="Confirm it’s you">
        <div className="flex items-start gap-3 mb-5 rounded-2xl bg-terracotta-soft p-4">
          <IconShield size={22} className="text-terracotta shrink-0 mt-0.5" />
          <div className="text-[14.5px] leading-relaxed">
            <div className="font-semibold text-ink dark:text-cream-warm">This step is for your security</div>
            <p className="muted mt-1">It confirms that you — the owner of this Kobocent account — are the one adding your {type.toUpperCase()}. We’ll also tell you on Telegram.</p>
          </div>
        </div>
        <div className={busy ? 'opacity-50 pointer-events-none' : ''}><TelegramLogin onAuth={onAuth} /></div>
        {busy && <p className="text-center muted text-[14px] mt-3">Saving and opening your account…</p>}
      </Sheet>
    </div>
  );
}

// ───────────────────────────── Has an account: details, calculator, watch for deposit ─────────────────────────────

function Funded({ ov, reload }: { ov: Overview; reload: (silent?: boolean) => Promise<void> }) {
  const acct = ov.account!;
  const name = loadProfile()?.firstName;
  const [ngn, setNgn] = useState('');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [qBusy, setQBusy] = useState(false);
  const [watching, setWatching] = useState(false);
  const [arrived, setArrived] = useState<Deposit | null>(null);
  const baseline = useRef<string | null>(null);
  const value = Number(ngn) || 0;
  const usdcShown = useCountUp(quote && value ? quote.usdc : null);

  // Live calculator.
  useEffect(() => {
    if (!value || value < ov.minNgn) { setQuote(null); return; }
    let live = true; setQBusy(true);
    const t = setTimeout(() => {
      kc<Quote>('onramp/quote', { method: 'POST', body: { amountNgn: value } })
        .then(q => { if (live) setQuote(q); }).catch(() => { if (live) setQuote(null); })
        .finally(() => { if (live) setQBusy(false); });
    }, 300);
    return () => { live = false; clearTimeout(t); };
  }, [value, ov.minNgn]);

  // The screen watches for deposits on its own — no button needed (founder, 2026-10-04): every
  // 10 s while visible, every 5 s after "I've sent the money". Anything newer than what was on
  // screen when it opened (or that changed status) is announced.
  const keyOf = (d?: Deposit) => (d ? `${d.reference}:${d.status}` : null);
  const [watchSince, setWatchSince] = useState<number | null>(null);
  const [slow, setSlow] = useState(false);
  useEffect(() => { if (baseline.current === null) baseline.current = keyOf(ov.deposits[0]) || ''; }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const id = window.setInterval(() => { if (document.visibilityState === 'visible') reload(true); }, watching ? 5000 : 10000);
    return () => window.clearInterval(id);
  }, [watching, reload]);
  useEffect(() => {
    const top = ov.deposits[0];
    const key = keyOf(top);
    if (top && key && baseline.current !== null && key !== baseline.current) {
      setArrived(top);
      if (top.status === 'credited') { setWatching(false); baseline.current = key; }
    }
  }, [ov.deposits]);
  // After 12 minutes of waiting, stop the spinner and say so honestly (polling continues).
  useEffect(() => {
    if (!watching || !watchSince) return;
    const t = window.setTimeout(() => setSlow(true), 12 * 60_000);
    return () => window.clearTimeout(t);
  }, [watching, watchSince]);

  function startWatching() {
    setArrived(null);
    setSlow(false);
    setWatchSince(Date.now());
    setWatching(true);
  }

  const share = () => {
    const text = `Bank: ${acct.bankName}\nAccount number: ${acct.accountNumber}\nName: Kobocent${name ? ` - ${name}` : ''}`;
    if (navigator.share) navigator.share({ title: 'My Kobocent account', text }).catch(() => {});
    else navigator.clipboard?.writeText(text).catch(() => {});
  };

  return (
    <div className="space-y-5 animate-fade-up">
      {/* The account, like a card */}
      <section className="relative overflow-hidden rounded-3xl p-6 text-white shadow-lift" style={{ background: 'linear-gradient(135deg, #C1502E 0%, #9A3E22 60%, #20211F 140%)' }}>
        <div className="absolute -right-12 -bottom-16 h-56 w-56 rounded-full bg-white/10" aria-hidden="true" />
        <div className="absolute right-6 top-6 h-10 w-10 rounded-full border-[3px] border-white/40" aria-hidden="true" />
        <div className="relative">
          <div className="text-white/75 text-[13px] font-medium">{acct.bankName}</div>
          <button onClick={() => navigator.clipboard?.writeText(acct.accountNumber)} className="block mt-3 text-left" aria-label="Copy account number">
            <div className="font-mono text-[34px] sm:text-[40px] font-bold tracking-[0.08em] leading-none">{acct.accountNumber.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3')}</div>
          </button>
          <div className="mt-3 text-white/85 text-[14px]">Kobocent{name ? ` - ${name}` : ''}</div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="[&_button]:!w-full [&_button]:!bg-white [&_button]:!text-terracotta-dark [&_button]:!border-white [&_button]:min-h-[48px]"><CopyButton value={acct.accountNumber} label="Copy number" /></div>
            <button onClick={share} className="rounded-xl bg-white/15 hover:bg-white/25 font-semibold min-h-[48px]">Share details</button>
          </div>
        </div>
      </section>

      {/* Watching / arrived */}
      {arrived ? (
        <section className={`rounded-3xl p-5 animate-fade-up ${arrived.status === 'credited' ? 'bg-[#58834C]/12 border border-[#58834C]/40' : 'surface'}`} aria-live="polite">
          {arrived.status === 'credited' ? (
            <div className="flex items-center gap-4">
              <span className="grid place-items-center h-12 w-12 shrink-0 rounded-full bg-[#58834C] text-white"><IconCheck size={24} /></span>
              <div>
                <div className="font-display text-[20px] font-bold text-ink dark:text-cream-warm">{naira(arrived.amountNgn)} received</div>
                <p className="muted text-[14px]">{arrived.usdc ? `${amount(arrived.usdc, 2)} USDC is in your wallet.` : 'USDC is in your wallet.'} You’ll also get the details on Telegram.</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <span className="h-10 w-10 shrink-0 rounded-full border-4 border-terracotta border-t-transparent animate-spin" />
              <div><div className="font-semibold text-ink dark:text-cream-warm">{naira(arrived.amountNgn)} arrived — sending your USDC…</div><p className="muted text-[13.5px]">Usually under a minute from here.</p></div>
            </div>
          )}
          {arrived.status === 'credited' && <Link href="/app" className="btn-primary w-full mt-4">See my balance</Link>}
        </section>
      ) : watching ? (
        <section className="surface rounded-3xl p-5 flex items-center gap-4 animate-fade-up" aria-live="polite">
          <span className="relative grid place-items-center h-12 w-12 shrink-0">
            {!slow && <span className="absolute inset-0 rounded-full bg-terracotta/20 animate-ping" />}
            <span className="relative grid place-items-center h-10 w-10 rounded-full bg-terracotta text-white"><IconBank size={20} /></span>
          </span>
          <div className="flex-1">
            <div className="font-semibold text-ink dark:text-cream-warm">{slow ? 'Still waiting for your transfer' : 'Waiting for your transfer…'}</div>
            <p className="muted text-[13.5px]">{slow ? 'Some banks take up to 30 minutes. We keep checking, and Telegram tells you the moment it lands.' : 'Bank transfers usually land in 1–5 minutes. You can leave — we’ll tell you on Telegram.'}</p>
          </div>
          <button onClick={() => setWatching(false)} className="text-[13px] font-semibold muted min-h-[44px] px-1">Stop</button>
        </section>
      ) : null}

      {/* Calculator */}
      <section className="surface rounded-3xl p-5">
        <label htmlFor="ngn" className="eyebrow">If you send</label>
        <div className="mt-2 flex items-baseline gap-1 rounded-2xl border border-cream-border dark:border-night-border bg-cream dark:bg-night px-4 focus-within:border-terracotta">
          <span className="font-display text-[26px] text-warmgray">₦</span>
          <input id="ngn" value={ngn ? Number(ngn).toLocaleString('en-NG') : ''} onChange={e => setNgn(e.target.value.replace(/\D/g, '').slice(0, 9))} inputMode="numeric" placeholder="10,000"
            className="flex-1 bg-transparent outline-none font-display font-bold text-[32px] min-h-[64px] text-ink dark:text-cream-warm placeholder:text-cream-border dark:placeholder:text-night-border" />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {[5000, 10000, 50000, 100000].map(c => (
            <button key={c} onClick={() => setNgn(String(c))} className={`rounded-full px-4 min-h-[40px] text-[14px] font-semibold border transition-colors ${value === c ? 'bg-terracotta text-white border-terracotta' : 'border-cream-border dark:border-night-border hover:border-terracotta'}`}>{naira(c)}</button>
          ))}
        </div>
        <div className="mt-4 rounded-2xl bg-ink dark:bg-night text-cream p-4">
          <div className="text-[13px] text-cream/70">You receive</div>
          <div className="font-display font-bold text-[30px] leading-tight tabular-nums">
            {!value ? <span className="text-cream/40">— USDC</span> : qBusy || usdcShown === null ? <span className="inline-block h-8 w-36 rounded-xl bg-white/10 animate-pulse align-middle" /> : `${usdcShown.toFixed(2)} USDC`}
          </div>
          {quote && (
            <div className="mt-2 grid grid-cols-2 gap-y-1 text-[13px]">
              <span className="text-cream/70">Rate</span><span className="text-right font-mono">₦{quote.rate.toLocaleString('en-NG')} / $1</span>
              <span className="text-cream/70">Fee</span><span className="text-right font-mono">{naira(quote.feeNgn)}</span>
            </div>
          )}
        </div>
        {/* Fee tiers are not shown (2026-10-05: business decision) — the estimate shows the fee amount. */}
        <p className="mt-3 text-center text-[13px] muted">The estimate uses today’s rate; your USDC is priced when the transfer arrives.</p>
      </section>

      {!watching && !arrived && (
        <button onClick={startWatching} className="btn-primary w-full min-h-[56px] text-[16px]">I’ve sent the money</button>
      )}

      {/* Deposits */}
      <section>
        <div className="eyebrow mb-2">Recent deposits</div>
        {ov.deposits.length === 0 ? (
          <div className="surface rounded-2xl p-5 text-center muted text-[14px]">No deposits yet — your first transfer will show here.</div>
        ) : (
          <ul className="surface rounded-2xl divide-y divide-cream-border dark:divide-night-border px-4">
            {ov.deposits.map((d, i) => {
              const done = d.status === 'credited';
              const failed = d.status === 'failed';
              return (
                <li key={`${d.reference || i}-${d.at}`} className="flex items-center gap-3 py-3.5">
                  <span className="grid place-items-center h-10 w-10 rounded-xl bg-cream-warm dark:bg-night text-terracotta"><IconBank size={18} /></span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[15px] font-medium text-ink dark:text-cream-warm">{naira(d.amountNgn)}</div>
                    <div className="text-[12.5px] muted">{dayLabel(d.at)}{d.usdc ? ` · ${amount(d.usdc, 2)} USDC` : ''}</div>
                  </div>
                  <span className={`text-[12px] font-semibold rounded-full px-2.5 py-1 ${done ? 'bg-[#58834C]/12 text-[#58834C]' : failed ? 'bg-[#B84A40]/12 text-[#B84A40]' : 'bg-[#B68B2A]/12 text-[#B68B2A]'}`}>
                    {done ? 'Credited' : failed ? 'Needs attention' : d.status === 'crediting' ? 'Sending USDC' : 'Waiting'}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

