'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { kc, KcError, clearProfile, type Account } from '@/lib/kc';
import { setPinHandler, type PinCode } from '@/lib/pin';
import { Sheet } from './ui';
import { PinPad } from './PinPad';
import { GoogleButton, googleEnabled } from './GoogleButton';
import { IconShield, IconTelegram } from './Icons';

/**
 * App PIN + account-safety prompts (sign-in v2, founder 2026-10-05).
 *  - Lock screen when the app opens and after the idle timeout (default 15 min; user can lengthen or
 *    turn off in Settings).
 *  - PIN before payments: kc() gets 423 from the backend and asks here for a short-lived PIN token.
 *  - First time: create a PIN (payments ask for one anyway).
 *  - Soft prompts once per session: connect Telegram (never lose your wallet; referral + $SHIFT), or add
 *    Google as a backup if only Telegram is linked.
 * If the backend has no PIN support yet (404), everything here stays out of the way.
 */
interface Security { hasPin: boolean; enabled: boolean; timeoutMin: number; requireForPayments: boolean; lockedUntil: number | null; canResetPin?: boolean; methods?: { telegram: boolean; google: boolean } }

const LAST_ACTIVE = 'kc-last-active';
const UNLOCKED = 'kc-unlocked';
const NUDGED = 'kc-nudged';
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
  const resolver = useRef<((t: string | null) => void) | null>(null);
  const lastToken = useRef<{ token: string; at: number } | null>(null);

  const load = useCallback(async () => {
    try { setSec(await kc<Security>('security')); } catch (e) { if (e instanceof KcError && e.status === 404) setSec(null); }
    try { setAccount((await kc<{ account: Account }>('me')).account); } catch { /* ignore */ }
  }, []);
  useEffect(() => {
    load();
    const onChange = () => load();
    window.addEventListener('kc-security-changed', onChange);
    return () => window.removeEventListener('kc-security-changed', onChange);
  }, [load]);

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
    lastToken.current = { token, at: Date.now() };
    setLocked(false);
  };

  // ── PIN before payments (called by kc() on 423) ──
  useEffect(() => {
    setPinHandler((code: PinCode) => new Promise<string | null>((resolve) => {
      // Just unlocked or just confirmed? Reuse the token for 90 s instead of asking again.
      if (code === 'PIN_REQUIRED' && lastToken.current && Date.now() - lastToken.current.at < 90_000) return resolve(lastToken.current.token);
      resolver.current = resolve;
      setAsk({ mode: code === 'PIN_SETUP' ? 'setup' : 'verify', reason: 'payment' });
    }));
    return () => setPinHandler(null);
  }, []);
  const finishAsk = (token: string | null) => {
    if (token) lastToken.current = { token, at: Date.now() };
    resolver.current?.(token); resolver.current = null; setAsk(null);
  };

  // ── First time: create a PIN; then (once per session) the account-safety nudge ──
  useEffect(() => {
    if (!sec || !account || locked || ask) return;
    if (!sec.hasPin && get(sessionStorage, 'kc-pin-later') !== '1') { setAsk({ mode: 'setup', reason: 'first' }); return; }
    if (get(sessionStorage, NUDGED) === '1') return;
    if (!account.telegramLinked) setNudge('telegram');
    else if (!account.googleLinked && googleEnabled()) setNudge('google');
  }, [sec, account, locked, ask]);
  const closeNudge = () => { set(sessionStorage, NUDGED, '1'); setNudge(null); };

  return (
    <>
      {children}
      {locked && lockOn && <LockScreen canReset={!!sec?.canResetPin} onUnlock={unlock} onForgot={() => setAsk({ mode: 'setup', reason: 'reset' })} onSignOut={() => signOut(router)} />}
      <Sheet open={!!ask} onClose={() => { if (ask?.reason === 'first') set(sessionStorage, 'kc-pin-later', '1'); if (ask?.reason === 'payment') finishAsk(null); else setAsk(null); }}
        title={ask?.mode === 'setup' ? (ask.reason === 'reset' ? 'Set a new PIN' : 'Create your app PIN') : 'Enter your PIN'}>
        {ask?.mode === 'setup'
          ? <CreatePin reason={ask.reason} onDone={(token) => { set(sessionStorage, UNLOCKED, '1'); set(localStorage, LAST_ACTIVE, String(Date.now())); setLocked(false); window.dispatchEvent(new Event('kc-security-changed')); if (ask.reason === 'payment') finishAsk(token); else { lastToken.current = { token, at: Date.now() }; setAsk(null); } }}
              onLater={ask.reason === 'first' ? () => { set(sessionStorage, 'kc-pin-later', '1'); setAsk(null); } : undefined} />
          : <VerifyPin onDone={finishAsk} />}
      </Sheet>
      <Sheet open={!!nudge} onClose={closeNudge} title={nudge === 'telegram' ? 'Connect Telegram' : 'Add a backup sign-in'}>
        {nudge === 'telegram' ? (
          <div className="space-y-4">
            <div className="flex gap-3 rounded-2xl bg-cream-warm dark:bg-night p-4 text-[14px] leading-relaxed">
              <IconTelegram />
              <span>Connect your Telegram so you <b>never lose access to your wallet</b> — and unlock <b>referral bonuses</b> and <b>$SHIFT points</b>, plus the Kobocent bot on the go.</span>
            </div>
            <Link href="/app/settings#telegram" onClick={closeNudge} className="btn-primary w-full">Connect Telegram</Link>
            <button onClick={closeNudge} className="block w-full text-center text-[14px] muted min-h-[44px]">Not now</button>
          </div>
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

function LockScreen({ canReset, onUnlock, onForgot, onSignOut }: { canReset: boolean; onUnlock: (token: string) => void; onForgot: () => void; onSignOut: () => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [reset, setReset] = useState(0);
  async function verify(pin: string) {
    setBusy(true); setErr('');
    try { const r = await kc<{ pinToken: string }>('security/pin/verify', { method: 'POST', body: { pin } }); onUnlock(r.pinToken); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Wrong PIN'); setReset(x => x + 1); }
    finally { setBusy(false); }
  }
  return (
    <div className="fixed inset-0 z-[60] bg-cream dark:bg-night flex flex-col items-center justify-center px-6" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }} role="dialog" aria-modal="true" aria-label="Unlock Kobocent">
      <div className="grid place-items-center h-16 w-16 rounded-2xl bg-terracotta-soft text-terracotta"><IconShield size={30} /></div>
      <h2 className="font-display text-[24px] font-bold mt-4 text-ink dark:text-cream-warm">Enter your PIN</h2>
      <p className="muted text-[14px] mt-1">Kobocent is locked to keep your money safe.</p>
      <div className="w-full max-w-sm"><PinPad onComplete={verify} busy={busy} error={err} resetKey={reset} /></div>
      <div className="mt-4 flex flex-col items-center gap-1">
        {canReset ? <button onClick={onForgot} className="text-[14px] font-semibold text-terracotta min-h-[44px]">Forgot PIN? Set a new one</button>
          : <button onClick={onSignOut} className="text-[14px] font-semibold text-terracotta min-h-[44px]">Forgot PIN? Sign in again to reset it</button>}
      </div>
    </div>
  );
}

function VerifyPin({ onDone }: { onDone: (token: string | null) => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [reset, setReset] = useState(0);
  async function verify(pin: string) {
    setBusy(true); setErr('');
    try { const r = await kc<{ pinToken: string }>('security/pin/verify', { method: 'POST', body: { pin } }); onDone(r.pinToken); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Wrong PIN'); setReset(x => x + 1); }
    finally { setBusy(false); }
  }
  return (<><p className="muted text-[14px] text-center">Confirm it’s you before this payment.</p><PinPad onComplete={verify} busy={busy} error={err} resetKey={reset} /></>);
}

function CreatePin({ reason, onDone, onLater }: { reason: 'payment' | 'first' | 'reset'; onDone: (token: string) => void; onLater?: () => void }) {
  const [first, setFirst] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [reset, setReset] = useState(0);
  async function step(pin: string) {
    setErr('');
    if (!first) { setFirst(pin); setReset(x => x + 1); return; }
    if (pin !== first) { setErr('Those didn’t match — start again'); setFirst(null); setReset(x => x + 1); return; }
    setBusy(true);
    try { const r = await kc<{ pinToken: string }>('security/pin', { method: 'POST', body: { pin } }); onDone(r.pinToken); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Could not save your PIN'); setFirst(null); setReset(x => x + 1); }
    finally { setBusy(false); }
  }
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
