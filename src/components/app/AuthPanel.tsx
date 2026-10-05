'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { LogoLockup } from '@/components/ui/Logo';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { TelegramLogin, type TelegramUser } from './TelegramLogin';
import { GoogleButton, googleEnabled } from './GoogleButton';
import { IconShield, IconBolt, IconGift, IconCheck } from './Icons';
import { saveProfile, BOT_URL, type Account } from '@/lib/kc';

/**
 * Sign in / create account. One tap with Telegram: existing users land on their own wallet
 * and history (same account as the bot); new users get an account and Kobocent creates their wallets (import removed 2026-10-05).
 * Google sign-in (2026-10-05): the same account if Google was added, or a new account whose wallets work
 * at once (internal user number); connect Telegram later for referrals and $SHIFT. No phone number.
 */
export function AuthPanel({ mode }: { mode: 'signin' | 'signup' }) {
  const router = useRouter();
  const params = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function onAuth(user: TelegramUser) {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/auth/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user),
      });
      const data = (await res.json().catch(() => ({}))) as { account?: Account; error?: string };
      if (!res.ok || !data.account) throw new Error(data.error || 'Sign-in failed — please try again');
      saveProfile({ firstName: user.first_name || null, username: user.username || null, photoUrl: user.photo_url || null, telegramId: user.id });
      const next = params.get('next');
      router.replace(data.account.hasWallet === false ? '/app/setup' : next && next.startsWith('/app') ? next : '/app');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign-in failed — please try again');
      setBusy(false);
    }
  }

  async function onGoogle(credential: string) {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/auth/google', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ credential }) });
      const data = (await res.json().catch(() => ({}))) as { account?: Account; profile?: { firstName: string | null; photoUrl: string | null }; error?: string };
      if (!res.ok || !data.account) throw new Error(data.error || 'Sign-in failed — please try again');
      saveProfile({ firstName: data.profile?.firstName || data.account.displayName || null, username: null, photoUrl: data.profile?.photoUrl || null, telegramId: null });
      const next = params.get('next');
      router.replace(data.account.hasWallet === false ? '/app/setup' : next && next.startsWith('/app') ? next : '/app');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign-in failed — please try again');
      setBusy(false);
    }
  }

  const heading = mode === 'signup' ? <>Your money, <span className="text-terracotta italic">both worlds</span></> : <>Welcome <span className="text-terracotta italic">back</span></>;

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
          <div className="eyebrow mb-3">{mode === 'signup' ? 'Create your account' : 'Sign in'}</div>
          <h1 className="h-display text-[30px] sm:text-[36px] mb-3">{heading}</h1>
          <p className="muted text-[15px] leading-[1.7] mb-7">
            {mode === 'signup'
              ? 'One tap with Telegram or Google. Already use Kobocent in Telegram? You will see the same wallet, balance and history here.'
              : 'Continue with Telegram or Google — the same account, wallet and history everywhere.'}
          </p>

          <div className={busy ? 'opacity-50 pointer-events-none' : ''}>
            <TelegramLogin onAuth={onAuth} />
            {googleEnabled() && (
              <>
                <div className="flex items-center gap-3 my-4 text-[12px] muted"><span className="h-px flex-1 bg-cream-border dark:bg-night-border" />or<span className="h-px flex-1 bg-cream-border dark:bg-night-border" /></div>
                <GoogleButton onCredential={onGoogle} text={mode === 'signup' ? 'signup_with' : 'continue_with'} />
              </>
            )}
          </div>
          {busy && <p className="text-center text-[14px] muted mt-4">Signing you in…</p>}
          {error && <p role="alert" className="mt-4 rounded-xl bg-terracotta-soft text-terracotta-dark dark:text-terracotta-light px-4 py-3 text-[14px]">{error}</p>}

          <div className="mt-7 pt-6 border-t border-cream-border dark:border-night-border space-y-3">
            <p className="text-[13.5px] muted">
              {googleEnabled() ? <>No Telegram? Continue with Google — you can connect Telegram later for referral bonuses and $SHIFT points.</> : <>No Telegram yet? <a href="https://telegram.org/apps" target="_blank" rel="noopener noreferrer" className="text-terracotta font-medium">Get it free</a> — it takes a minute.</>}
            </p>
            <p className="text-[13.5px] muted">
              Prefer the bot? <a href={BOT_URL} target="_blank" rel="noopener noreferrer" className="text-terracotta font-medium">Open @kobocentbot</a>
            </p>
          </div>
          <p className="mt-6 text-[12px] muted">
            By continuing you agree to our <a href="https://api.clickshift.io/legal" target="_blank" rel="noopener noreferrer" className="underline">terms and privacy policy</a>.
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
