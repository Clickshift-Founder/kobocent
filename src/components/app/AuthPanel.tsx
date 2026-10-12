'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { LogoLockup } from '@/components/ui/Logo';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { TelegramLogin, type TelegramUser } from './TelegramLogin';
import { GoogleButton, googleEnabled } from './GoogleButton';
import { AppleButton, appleEnabled } from './AppleButton';
import { IconShield, IconBolt, IconGift, IconCheck } from './Icons';
import { saveProfile, type Account } from '@/lib/kc';
import { nativeSignInAvailable, nativeAppleAvailable, nativeSignIn } from '@/lib/native';

/**
 * Sign in / Create account (founder, 2026-10-12): Google or Apple only.
 *  - Create account (/signup): Google or Apple makes the account and its wallets.
 *  - Sign in (/signin): Google or Apple finds the account. No account → nothing is created; the person is sent to
 *    /signup?from=signin with a note, so a typo'd Google account never quietly makes a second, empty wallet.
 * After either, the app asks the person to connect Telegram to complete registration (ConnectTelegram in
 * SecurityProvider) — that is also how someone who used the bot before gets their old wallet: connecting the same
 * Telegram folds the new, empty account into it (identityV2.adoptIntoTelegram).
 * Telegram sign-in stays only as a fallback when neither Google nor Apple is configured.
 */
type AuthResult = { account?: Account; profile?: { firstName: string | null; photoUrl?: string | null }; error?: string; code?: string };

export function AuthPanel({ mode }: { mode: 'signin' | 'signup' }) {
  const router = useRouter();
  const params = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // Inside the iOS / Android app, sign-in is native (src/lib/native.ts); the web buttons are for browsers.
  const [native, setNative] = useState(false);
  useEffect(() => { setNative(nativeSignInAvailable()); }, []);
  const google = googleEnabled(), apple = appleEnabled();
  const fromSignin = mode === 'signup' && params.get('from') === 'signin';
  const nextPath = () => { const n = params.get('next'); return n && n.startsWith('/app') ? n : '/app'; };

  async function finish(url: string, body: Record<string, unknown>, photo: boolean) {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, mode }) });
      const data = (await res.json().catch(() => ({}))) as AuthResult;
      if (res.status === 404 && data.code === 'NO_ACCOUNT') {
        const n = params.get('next');
        router.replace(`/signup?from=signin${n ? `&next=${encodeURIComponent(n)}` : ''}`);
        return;
      }
      if (!res.ok || !data.account) throw new Error(data.error || 'Sign-in failed — please try again');
      saveProfile({ firstName: data.profile?.firstName || data.account.displayName || null, username: null, photoUrl: photo ? data.profile?.photoUrl || null : null, telegramId: null });
      router.replace(data.account.hasWallet === false ? '/app/setup' : nextPath());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign-in failed — please try again');
      setBusy(false);
    }
  }
  const onGoogle = (credential: string) => finish('/api/auth/google', { credential }, true);
  const onApple = (idToken: string, name: string | null) => finish('/api/auth/apple', { idToken, name }, false);
  async function onNative(provider: 'google' | 'apple') {
    setError('');
    try {
      const { idToken, name } = await nativeSignIn(provider);
      if (provider === 'google') await finish('/api/auth/google', { credential: idToken }, true);
      else await onApple(idToken, name);
    } catch (e) {
      const m = e instanceof Error ? e.message : '';
      if (!/cancel/i.test(m)) setError(m || 'Sign-in failed — please try again');
    }
  }

  // Fallback only: no Google or Apple configured on this deployment.
  async function onTelegram(user: TelegramUser) {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/auth/telegram', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(user) });
      const data = (await res.json().catch(() => ({}))) as AuthResult;
      if (!res.ok || !data.account) throw new Error(data.error || 'Sign-in failed — please try again');
      saveProfile({ firstName: user.first_name || null, username: user.username || null, photoUrl: user.photo_url || null, telegramId: user.id });
      router.replace(data.account.hasWallet === false ? '/app/setup' : nextPath());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign-in failed — please try again');
      setBusy(false);
    }
  }

  const signup = mode === 'signup';
  const heading = signup ? <>Create your <span className="text-terracotta italic">account</span></> : <>Welcome <span className="text-terracotta italic">back</span></>;

  return (
    <div className="min-h-[100dvh] flex flex-col">
      <header className="container-page flex items-center justify-between py-5">
        <Link href="/" aria-label="Kobocent home"><LogoLockup /></Link>
        <div className="flex items-center gap-2">
          <Link href="/" className="inline-flex items-center gap-1.5 px-2 min-h-[44px] text-[14px] muted hover:text-terracotta">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
            Back to site
          </Link>
          <ThemeToggle compact />
        </div>
      </header>

      <main className="flex-1 container-page grid lg:grid-cols-2 gap-10 lg:gap-16 items-center pb-12">
        <section className="surface rounded-3xl p-6 sm:p-9 shadow-card w-full max-w-md mx-auto lg:order-2">
          <div className="eyebrow mb-3">{signup ? 'Create account' : 'Sign in'}</div>
          <h1 className="h-display text-[30px] sm:text-[36px] mb-3">{heading}</h1>

          {fromSignin && (
            <p role="status" className="mb-5 rounded-2xl bg-cream-warm dark:bg-night px-4 py-3 text-[14px] leading-relaxed">
              There’s no Kobocent account for that sign-in yet. Create one below — it takes a few seconds.
            </p>
          )}
          <p className="muted text-[15px] leading-[1.7] mb-7">
            {signup ? 'One tap with Google or Apple. Your wallets are ready the moment you’re in.' : 'Continue with the Google or Apple account you signed up with.'}
          </p>

          <div className={`grid gap-3 ${busy ? 'opacity-50 pointer-events-none' : ''}`}>
            {native ? (
              <>
                {nativeAppleAvailable() && (
                  <button onClick={() => onNative('apple')} className="w-full rounded-full bg-black text-white font-semibold min-h-[48px] flex items-center justify-center gap-2 text-[15px]">
                    <svg width="16" height="18" viewBox="0 0 16 18" fill="currentColor" aria-hidden><path d="M13.2 9.5c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.9-3.5.9-.7 0-1.8-.9-3-.8-1.5 0-3 .9-3.8 2.3-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.4 2.9 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3 .7c1.3 0 2.1-1.1 2.8-2.3.9-1.3 1.3-2.6 1.3-2.6s-2.5-1-2.5-3.8zM10.9 2.7c.6-.8 1.1-1.8 1-2.8-.9 0-2 .6-2.7 1.4-.6.7-1.1 1.7-1 2.7 1 .1 2-.5 2.7-1.3z" /></svg>
                    {signup ? 'Sign up with Apple' : 'Sign in with Apple'}
                  </button>
                )}
                <button onClick={() => onNative('google')} className="w-full rounded-full bg-white text-[#1f1f1f] border border-[#dadce0] font-semibold min-h-[48px] flex items-center justify-center gap-2 text-[15px]">
                  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
                  {signup ? 'Sign up with Google' : 'Sign in with Google'}
                </button>
              </>
            ) : (
              <>
                {google && <GoogleButton onCredential={onGoogle} text={signup ? 'signup_with' : 'signin_with'} />}
                {apple && <AppleButton onToken={onApple} />}
                {!google && !apple && <TelegramLogin onAuth={onTelegram} />}
              </>
            )}
          </div>
          {busy && <p className="text-center text-[14px] muted mt-4">{signup ? 'Creating your account…' : 'Signing you in…'}</p>}
          {error && <p role="alert" className="mt-4 rounded-xl bg-terracotta-soft text-terracotta-dark dark:text-terracotta-light px-4 py-3 text-[14px]">{error}</p>}

          <div className="mt-7 pt-6 border-t border-cream-border dark:border-night-border">
            <p className="text-[14px] muted">
              {signup
                ? <>Already have an account? <Link href="/signin" className="text-terracotta font-semibold">Sign in</Link></>
                : <>New to Kobocent? <Link href="/signup" className="text-terracotta font-semibold">Create an account</Link></>}
            </p>
          </div>
          <p className="mt-6 text-[12px] muted">
            By continuing you agree to our <a href="https://kobocent.com/legal" target="_blank" rel="noopener noreferrer" className="underline">terms and privacy policy</a>.
          </p>
        </section>

        <section className="lg:order-1 max-w-lg mx-auto lg:mx-0">
          <ul className="space-y-5">
            {[
              { icon: <IconShield />, t: 'Your keys are encrypted', d: 'And only you can trigger a transaction.' },
              { icon: <IconBolt />, t: 'Gasless', d: 'Kobocent covers the network fees — no need to buy SOL first.' },
              { icon: <IconGift />, t: 'Rewards on every payment', d: '0.2% cashback, and 20% of the fees your friends pay.' },
              { icon: <IconCheck />, t: 'Telegram and App, one account', d: 'Start in one, finish in the other — always in sync.' },
            ].map((f) => (
              <li key={f.t} className="flex gap-4">
                <span className="shrink-0 grid place-items-center h-11 w-11 rounded-2xl bg-terracotta-soft text-terracotta">{f.icon}</span>
                <div>
                  <div className="font-semibold text-ink dark:text-cream-warm text-[15.5px]">{f.t}</div>
                  <div className="muted text-[14px] leading-relaxed">{f.d}</div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
