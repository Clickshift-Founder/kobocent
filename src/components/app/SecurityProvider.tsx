'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { kc, KcError, clearProfile, type Account } from '@/lib/kc';
import { setPinHandler, type PinCode } from '@/lib/pin';
import { Sheet } from './ui';
import { PinPad } from './PinPad';
import { GoogleButton, googleEnabled } from './GoogleButton';
import { IconCheck, IconFace, IconShield } from './Icons';
import { ConnectTelegram } from './ConnectTelegram';
import { biometricOn, biometricPin, biometricKind, biometricLabel, biometricUpdatePin, biometricDisable } from '@/lib/native';
import { syncNativePush } from '@/lib/push';
import { guideKnown, markPopupsReady, newsPending, takePopup, tourPending } from '@/lib/popups';
import { PinAnswers, ProtectionBanner, ProtectionSheets, protect, type Protection } from './AccountProtection';

/**
 * App PIN + account-safety prompts (sign-in v2, founder 2026-10-05).
 *  - Lock screen when the app opens and after the idle timeout (default 15 min; user can lengthen or
 *    turn off in Settings).
 *  - PIN before payments: kc() gets 423 from the backend and asks here for a short-lived PIN token.
 *  - Setup prompt on every visit until both the PIN and the security questions are set (founder, 2026-11-03).
 *  - Soft prompts: connect Telegram (never lose your wallet; referral + $SHIFT), or add Google as a backup if only
 *    Telegram is linked. One popup per visit (src/lib/popups.ts), so the setup prompt goes first.
 *  - 5 wrong PINs with questions set → the answers, on the lock screen or in the payment sheet. Freezing is always
 *    reachable, even from the lock screen.
 * If the backend has no PIN support yet (404), everything here stays out of the way.
 * Inside the iOS / Android apps (2026-10-13): Face ID / fingerprint stands in for typing the PIN when turned on in
 * Settings (src/lib/native.ts keeps the PIN in the phone's secure storage; the backend still checks it).
 */
interface Security { hasPin: boolean; enabled: boolean; timeoutMin: number; requireForPayments: boolean; lockedUntil: number | null; canResetPin?: boolean; resetNeedsAnswers?: boolean; needsAnswers?: boolean; protection?: Protection | null; methods?: { telegram: boolean; google: boolean } }

const LAST_ACTIVE = 'kc-last-active';
const UNLOCKED = 'kc-unlocked';
const NUDGED = 'kc-nudged';
const SETUP_LATER = 'kc-setup-later';   // "Later" lasts this visit only: the prompt is back on the next one
const get = (s: Storage, k: string) => { try { return s.getItem(k); } catch { return null; } };
const set = (s: Storage, k: string, v: string) => { try { s.setItem(k, v); } catch { /* private mode */ } };

async function signOut(router: ReturnType<typeof useRouter>) {
  await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
  clearProfile();
  router.replace('/signin');
}

export function SecurityProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [sec, setSec] = useState<Security | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [locked, setLocked] = useState(false);
  const [ask, setAsk] = useState<null | { mode: 'verify' | 'setup'; reason: 'payment' | 'first' | 'reset' }>(null);
  const [nudge, setNudge] = useState<null | 'telegram' | 'google'>(null);
  const [setup, setSetup] = useState(false);
  const [protectOpen, setProtectOpen] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);   // the answers were right: a new PIN may be set
  const resolver = useRef<((t: string | null) => void) | null>(null);
  const savedToken = useRef<string | null>(null);   // PIN just created during a payment

  const load = useCallback(async () => {
    try { setSec(await kc<Security>('security')); } catch (e) { if (e instanceof KcError && e.status === 404) setSec(null); }
    try { setAccount((await kc<{ account: Account }>('me')).account); } catch { /* ignore */ }
    markPopupsReady();
  }, []);
  useEffect(() => {
    load();
    const onChange = () => load();
    window.addEventListener('kc-security-changed', onChange);
    // Settings → "Create PIN" (someone who tapped "Later" or closed the first prompt).
    const onCreate = () => setAsk({ mode: 'setup', reason: 'first' });
    window.addEventListener('kc-pin-create', onCreate);
    return () => { window.removeEventListener('kc-security-changed', onChange); window.removeEventListener('kc-pin-create', onCreate); };
  }, [load]);
  // Apps: re-send this install's notification token once signed in (src/lib/push.ts).
  useEffect(() => { if (account) void syncNativePush(); }, [account]);

  // ── Lock screen: on app open, then after the idle timeout ──
  const lockOn = !!sec?.hasPin && sec.enabled && sec.timeoutMin > 0;
  useEffect(() => {
    if (!lockOn) { setLocked(false); return; }
    const timeoutMs = (sec!.timeoutMin || 15) * 60_000;
    const check = () => {
      const unlocked = get(sessionStorage, UNLOCKED) === '1';
      const last = Number(get(localStorage, LAST_ACTIVE) || 0);
      if (!unlocked || Date.now() - last > timeoutMs) setLocked(true);
    };
    check();
    let lastWrite = 0;
    const active = () => { if (Date.now() - lastWrite > 15_000) { lastWrite = Date.now(); set(localStorage, LAST_ACTIVE, String(Date.now())); } };
    const vis = () => { if (document.visibilityState === 'visible') check(); };
    ['pointerdown', 'keydown', 'scroll'].forEach(ev => window.addEventListener(ev, active, { passive: true }));
    document.addEventListener('visibilitychange', vis);
    const t = setInterval(check, 20_000);
    return () => { ['pointerdown', 'keydown', 'scroll'].forEach(ev => window.removeEventListener(ev, active)); document.removeEventListener('visibilitychange', vis); clearInterval(t); };
  }, [lockOn, sec]);

  const unlock = (token: string) => {
    set(sessionStorage, UNLOCKED, '1');
    set(localStorage, LAST_ACTIVE, String(Date.now()));
    void token;   // unlocking never authorises a payment — each payment asks for the PIN (2026-10-05)
    setLocked(false);
  };

  // ── PIN before payments (called by kc() on 423) ──
  useEffect(() => {
    setPinHandler((code: PinCode) => new Promise<string | null>((resolve) => {
      // Every payment asks (founder, 2026-10-05) — no reuse of an earlier token.
      resolver.current = resolve;
      setAsk({ mode: code === 'PIN_SETUP' ? 'setup' : 'verify', reason: 'payment' });
    }));
    return () => setPinHandler(null);
  }, []);
  const finishAsk = (token: string | null) => {
    resolver.current?.(token); resolver.current = null; savedToken.current = null; setAsk(null);
  };
  // PIN saved: record it at once (closing the sheet must not re-open "Create your PIN" before the reload lands).
  const onPinSaved = (token: string) => {
    setSec(s => (s ? { ...s, hasPin: true } : s));
    set(sessionStorage, UNLOCKED, '1'); set(localStorage, LAST_ACTIVE, String(Date.now())); setLocked(false);
    savedToken.current = token;
    window.dispatchEvent(new Event('kc-security-changed'));
  };

  // ── Every visit until set: the PIN and the questions, after the first tour. New features follow on their own. ──
  const needsQuestions = !!sec?.protection && !sec.protection.hasQuestions;
  const [guideTick, setGuideTick] = useState(0);
  useEffect(() => {
    const on = () => setGuideTick(n => n + 1);
    window.addEventListener('kc-guide-state', on);
    return () => window.removeEventListener('kc-guide-state', on);
  }, []);
  useEffect(() => {
    if (!sec || !account || locked || ask || protectOpen || sec.protection?.frozen) return;
    if (!guideKnown() || tourPending()) { setSetup(false); return; }
    if ((!sec.hasPin || needsQuestions) && get(sessionStorage, SETUP_LATER) !== '1') { setSetup(true); return; }
    setSetup(false);
    if (newsPending() || get(sessionStorage, NUDGED) === '1') return;
    const want = !account.telegramLinked ? 'telegram'
      : !account.googleLinked && googleEnabled() && !(window as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.() ? 'google'   // web Google button can't run inside the apps
      : null;
    if (want && takePopup('nudge')) setNudge(want);
  }, [sec, account, locked, ask, protectOpen, needsQuestions, guideTick]);
  const closeNudge = () => { set(sessionStorage, NUDGED, '1'); setNudge(null); };
  const setupLater = () => { set(sessionStorage, SETUP_LATER, '1'); setSetup(false); };

  return (
    <>
      <ProtectionBanner p={sec?.protection} />
      {children}
      {locked && lockOn && <LockScreen accountId={account?.id} canReset={!!sec?.canResetPin} needsAnswersFirst={!!sec?.needsAnswers} forgotNeedsAnswers={!!sec?.resetNeedsAnswers} onUnlock={unlock}
        onForgot={(token) => { setResetToken(token || null); setAsk({ mode: 'setup', reason: 'reset' }); }} onSignOut={() => signOut(router)} onAnswered={load} />}
      <Sheet top open={!!ask} onClose={() => { if (ask?.reason === 'first' && !savedToken.current) set(sessionStorage, SETUP_LATER, '1'); if (ask?.reason === 'payment') finishAsk(savedToken.current); else { savedToken.current = null; setResetToken(null); setAsk(null); } }}
        title={ask?.mode === 'setup' ? (ask.reason === 'reset' ? 'Set a new PIN' : 'Create your app PIN') : 'Enter your PIN'}>
        {ask?.mode === 'setup'
          ? <CreatePin accountId={account?.id} reason={ask.reason} resetToken={resetToken} onSaved={onPinSaved} onDone={() => { if (ask.reason === 'payment') finishAsk(savedToken.current); else { savedToken.current = null; setResetToken(null); setAsk(null); } }}
              onLater={ask.reason === 'first' ? () => { set(sessionStorage, SETUP_LATER, '1'); setAsk(null); } : undefined} />
          : <VerifyPin accountId={account?.id} onDone={finishAsk} />}
      </Sheet>
      <Sheet open={setup && !ask && !protectOpen} onClose={setupLater} title="Protect your account">
        <div className="space-y-4">
          <p className="text-[14.5px] text-ink dark:text-cream-warm">Two quick steps keep your money safe if your phone is ever lost or someone gets into your account.</p>
          <ul className="space-y-2">
            {[{ label: 'App PIN', sub: 'Asked when the app opens and before payments', done: !!sec?.hasPin }, { label: 'Three security questions', sub: 'Unfreeze your account and reset your PIN', done: !needsQuestions }].map(s => (
              <li key={s.label} className="flex items-center gap-3 rounded-2xl bg-cream-warm dark:bg-night p-3.5">
                <span className={`grid place-items-center h-8 w-8 rounded-full shrink-0 ${s.done ? 'bg-[#58834C]/15 text-[#58834C]' : 'bg-terracotta-soft text-terracotta'}`}>{s.done ? <IconCheck size={16} /> : <IconShield size={16} />}</span>
                <span className="min-w-0"><span className="block font-medium text-[14.5px] text-ink dark:text-cream-warm">{s.label}</span><span className="block text-[12.5px] muted">{s.done ? 'Done' : s.sub}</span></span>
              </li>
            ))}
          </ul>
          <button onClick={() => { if (!sec?.hasPin) setAsk({ mode: 'setup', reason: 'first' }); else protect('questions'); }} className="btn-primary w-full">{!sec?.hasPin ? 'Create my PIN' : 'Set my questions'}</button>
          <button onClick={setupLater} className="block w-full text-center text-[14px] muted min-h-[44px]">Later</button>
        </div>
      </Sheet>
      <ProtectionSheets onOpenChange={setProtectOpen} onSignInAgain={async () => { await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {}); clearProfile(); router.replace('/signin?next=/app/settings'); }} />
      <Sheet open={!!nudge} onClose={closeNudge} title={nudge === 'telegram' ? 'Complete your registration' : 'Add a backup sign-in'}>
        {nudge === 'telegram' ? (
          <ConnectTelegram onLinked={() => { closeNudge(); load(); window.dispatchEvent(new Event('kc-security-changed')); }} onLater={closeNudge} />
        ) : (
          <div className="space-y-4">
            <div className="flex gap-3 rounded-2xl bg-cream-warm dark:bg-night p-4 text-[14px] leading-relaxed">
              <IconShield size={20} className="shrink-0 text-terracotta" />
              <span>Add Google as a second way in. If you ever lose your Telegram account, you still get into your wallet and money.</span>
            </div>
            <GoogleButton onCredential={async (credential) => {
              try { await kc('auth/google/link', { method: 'POST', body: { credential } }); closeNudge(); load(); } catch { /* error shown in Settings if retried */ }
            }} />
            <button onClick={closeNudge} className="block w-full text-center text-[14px] muted min-h-[44px]">Not now</button>
          </div>
        )}
      </Sheet>
    </>
  );
}

/**
 * Face ID / fingerprint in place of the PIN pad (apps only, when turned on in Settings): tries once by itself when the
 * pad opens, and offers a button to try again. A stored PIN that no longer matches (changed on another device) turns
 * the feature off on this phone, so it never burns PIN attempts again.
 */
function useBiometric(accountId: string | undefined, reason: string, onPin: (pin: string) => void) {
  const [label, setLabel] = useState<string | null>(null);
  const cb = useRef(onPin); cb.current = onPin;
  const run = useCallback(async () => { const pin = await biometricPin(accountId, reason); if (pin) cb.current(pin); }, [accountId, reason]);
  useEffect(() => {
    if (!biometricOn(accountId)) return;
    let live = true;
    biometricKind().then(k => { if (!live || !k) return; setLabel(biometricLabel(k)); void run(); });
    return () => { live = false; };
  }, [accountId, run]);
  return label ? { label, run } : null;
}
const STALE_BIO = 'Your PIN has changed. Enter it below, then turn Face ID / fingerprint on again in Settings.';

function BioButton({ bio }: { bio: { label: string; run: () => void } | null }) {
  if (!bio) return null;
  return <button type="button" onClick={bio.run} className="mx-auto mt-3 flex items-center gap-2 text-[14px] font-semibold text-terracotta min-h-[44px] px-3"><IconFace size={20} />Use {bio.label}</button>;
}

async function checkPin(pin: string, fromBio: boolean): Promise<{ token?: string; error?: string; answers?: boolean }> {
  try { return { token: (await kc<{ pinToken: string }>('security/pin/verify', { method: 'POST', body: { pin } })).pinToken }; }
  catch (e) {
    // 401 = wrong PIN (423 = locked, 429 = too many tries — those say nothing about the stored PIN).
    if (fromBio && e instanceof KcError && e.status === 401) { await biometricDisable(); return { error: STALE_BIO }; }
    if (e instanceof KcError && e.data.code === 'ANSWERS_REQUIRED') return { answers: true, error: e.message };
    return { error: e instanceof Error ? e.message : 'Wrong PIN' };
  }
}

function LockScreen({ accountId, canReset, needsAnswersFirst, forgotNeedsAnswers, onUnlock, onForgot, onSignOut, onAnswered }: { accountId?: string; canReset: boolean; needsAnswersFirst: boolean; forgotNeedsAnswers: boolean; onUnlock: (token: string) => void; onForgot: (resetToken?: string) => void; onSignOut: () => void; onAnswered: () => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [reset, setReset] = useState(0);
  const [answers, setAnswers] = useState<null | 'locked' | 'forgot'>(null);
  const [opened, setOpened] = useState<string | null>(null);   // answers right: the PIN works again, or set a new one
  useEffect(() => { if (needsAnswersFirst && !opened) setAnswers('locked'); }, [needsAnswersFirst, opened]);
  async function verify(pin: string, fromBio = false) {
    setBusy(true); setErr('');
    const r = await checkPin(pin, fromBio);
    if (r.token) onUnlock(r.token);
    else if (r.answers) setAnswers('locked');
    else { setErr(r.error || 'Wrong PIN'); setReset(x => x + 1); }
    setBusy(false);
  }
  const bio = useBiometric(accountId, 'Unlock Kobocent', (pin) => verify(pin, true));
  if (answers) return (
    <div className="fixed inset-0 z-[60] bg-cream dark:bg-night flex flex-col items-center justify-center px-6 overflow-y-auto" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }} role="dialog" aria-modal="true" aria-label="Security questions">
      <div className="w-full max-w-sm py-6">
        <h2 className="font-display text-[22px] font-bold mb-3 text-center text-ink dark:text-cream-warm">Security questions</h2>
        <PinAnswers intro={answers === 'locked' ? 'Too many wrong PINs. Answer your security questions to continue.' : 'Answer your security questions to set a new PIN.'}
          onCancel={answers === 'forgot' ? () => setAnswers(null) : undefined}
          onUnlocked={(token) => { const forgot = answers === 'forgot'; setAnswers(null); setOpened(token); setErr(''); onAnswered(); if (forgot) onForgot(token); }} />
        <button onClick={() => protect('freeze')} className="block w-full text-center text-[14px] font-semibold text-[#B84A40] min-h-[44px] mt-2">Not you? Freeze this account</button>
      </div>
    </div>
  );
  return (
    <div className="fixed inset-0 z-[60] bg-cream dark:bg-night flex flex-col items-center justify-center px-6" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }} role="dialog" aria-modal="true" aria-label="Unlock Kobocent">
      <div className="grid place-items-center h-16 w-16 rounded-2xl bg-terracotta-soft text-terracotta"><IconShield size={30} /></div>
      <h2 className="font-display text-[24px] font-bold mt-4 text-ink dark:text-cream-warm">Enter your PIN</h2>
      <p className="muted text-[14px] mt-1">Kobocent is locked to keep your money safe.</p>
      <div className="w-full max-w-sm"><PinPad onComplete={(p) => verify(p)} busy={busy} error={err} resetKey={reset} /><BioButton bio={bio} /></div>
      <div className="mt-4 flex flex-col items-center gap-1">
        {opened ? <button onClick={() => onForgot(opened)} className="text-[14px] font-semibold text-terracotta min-h-[44px]">Set a new PIN</button>
          : forgotNeedsAnswers ? <button onClick={() => setAnswers('forgot')} className="text-[14px] font-semibold text-terracotta min-h-[44px]">Forgot PIN? Answer your questions</button>
          : canReset ? <button onClick={() => onForgot()} className="text-[14px] font-semibold text-terracotta min-h-[44px]">Forgot PIN? Set a new one</button>
          : <button onClick={onSignOut} className="text-[14px] font-semibold text-terracotta min-h-[44px]">Forgot PIN? Sign in again to reset it</button>}
        <button onClick={() => protect('freeze')} className="text-[14px] font-semibold text-[#B84A40] min-h-[44px]">Lost this phone? Freeze your account</button>
      </div>
    </div>
  );
}

function VerifyPin({ accountId, onDone }: { accountId?: string; onDone: (token: string | null) => void }) {
  const [answers, setAnswers] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [reset, setReset] = useState(0);
  async function verify(pin: string, fromBio = false) {
    setBusy(true); setErr('');
    const r = await checkPin(pin, fromBio);
    if (r.token) onDone(r.token);
    else if (r.answers) setAnswers(true);
    else { setErr(r.error || 'Wrong PIN'); setReset(x => x + 1); }
    setBusy(false);
  }
  const bio = useBiometric(accountId, 'Confirm this payment', (pin) => verify(pin, true));
  if (answers) return <PinAnswers intro="Too many wrong PINs. Answer your security questions, then enter your PIN." onUnlocked={() => { setAnswers(false); setErr(''); setReset(x => x + 1); }} />;
  return (<><p className="muted text-[14px] text-center">Confirm it’s you before this payment.</p><PinPad onComplete={(p) => verify(p)} busy={busy} error={err} resetKey={reset} /><BioButton bio={bio} /></>);
}

function CreatePin({ accountId, reason, resetToken, onSaved, onDone, onLater }: { accountId?: string; reason: 'payment' | 'first' | 'reset'; resetToken?: string | null; onSaved: (token: string) => void; onDone: () => void; onLater?: () => void }) {
  const [first, setFirst] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  // During a payment, carry on by itself after a moment; otherwise wait for "Done".
  useEffect(() => { if (saved && reason === 'payment') { const t = setTimeout(onDone, 1200); return () => clearTimeout(t); } }, [saved, reason, onDone]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [reset, setReset] = useState(0);
  async function step(pin: string) {
    setErr('');
    if (!first) { setFirst(pin); setReset(x => x + 1); return; }
    if (pin !== first) { setErr('Those didn’t match — start again'); setFirst(null); setReset(x => x + 1); return; }
    setBusy(true);
    try { const r = await kc<{ pinToken: string }>('security/pin', { method: 'POST', body: { pin, ...(resetToken ? { resetToken } : {}) } }); void biometricUpdatePin(pin, accountId); onSaved(r.pinToken); setSaved(true); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Could not save your PIN'); setFirst(null); setReset(x => x + 1); }
    finally { setBusy(false); }
  }
  if (saved) return (
    <div className="flex flex-col items-center text-center py-4" role="status">
      <div className="grid place-items-center h-16 w-16 rounded-full bg-[#58834C]/15 text-[#58834C]">
        <IconCheck size={30} />
      </div>
      <h3 className="font-display text-[20px] font-bold mt-3 text-ink dark:text-cream-warm">{reason === 'reset' ? 'New PIN set' : 'PIN created'}</h3>
      <p className="muted text-[14px] mt-1 max-w-xs">{reason === 'payment' ? 'Continuing with your payment…' : 'We’ll ask for it when the app opens and before every payment. You can change this in Settings.'}</p>
      {reason !== 'payment' && <button onClick={onDone} className="btn-primary w-full mt-5">Done</button>}
    </div>
  );
  return (
    <>
      <p className="muted text-[14px] text-center">
        {first ? 'Enter it once more to confirm.' : reason === 'payment' ? 'Payments need a 6-digit PIN. Create one now — it only takes a moment.' : 'Pick 6 digits you’ll remember. We ask for it when the app opens and before payments.'}
      </p>
      <PinPad onComplete={step} busy={busy} error={err} resetKey={reset} />
      {onLater && !first && <button onClick={onLater} className="block w-full text-center text-[14px] muted min-h-[44px] mt-2">Later</button>}
    </>
  );
}
