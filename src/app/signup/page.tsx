'use client';
import { useState } from 'react';
import Link from 'next/link';
import { LogoLockup } from '@/components/ui/Logo';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { track } from '@/components/Analytics';

const BOT = process.env.NEXT_PUBLIC_TELEGRAM_BOT || 'clicksolbot';

type Mode = 'create' | 'signin' | 'link';

/**
 * Phase 1 behaviour: real capture, honest messaging.
 * We store the signup immediately (so early visitors are never lost) and tell
 * the person plainly that the web app is not live yet, pointing them to
 * Telegram meanwhile. Phase 2 swaps the handoff for OTP + wallet creation.
 */
export default function SignupPage() {
  const [mode, setMode] = useState<Mode>('create');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  async function submitCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (phone.replace(/\D/g, '').length < 8) {
      setError('Please enter a valid phone number, including your country code.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, email, source: 'signup_page' }),
      });
      const j = await res.json();
      if (!j.ok) throw new Error('failed');
      track('signup_submitted', { has_email: Boolean(email) });
      setDone(true);
    } catch {
      setError('Something went wrong saving that. Please try again, or continue on Telegram below.');
    } finally {
      setBusy(false);
    }
  }

  const inputCls =
    'w-full rounded-xl border border-cream-border dark:border-night-border bg-transparent px-4 py-3.5 text-[15px] outline-none transition-colors focus:border-terracotta';

  return (
    <div className="min-h-screen flex flex-col">
      <header className="container-page flex items-center justify-between py-6">
        <Link href="/" aria-label="Kobocent home"><LogoLockup /></Link>
        <div className="flex items-center gap-2.5">
          <Link href="/" className="hidden sm:inline-flex items-center gap-1.5 text-[13.5px] muted hover:text-terracotta transition-colors">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back to site
          </Link>
          <ThemeToggle compact />
        </div>
      </header>

      <main className="flex-1 container-page grid lg:grid-cols-2 gap-12 items-center py-10">
        <div className="max-w-md order-2 lg:order-1">
          <Link href="/" className="sm:hidden inline-flex items-center gap-1.5 text-[13.5px] muted hover:text-terracotta mb-6">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back to site
          </Link>
          <h1 className="h-display text-[clamp(28px,4.2vw,42px)] mb-4">
            One account, <span className="text-terracotta italic">both worlds</span>
          </h1>
          <p className="muted text-[15.5px] leading-[1.75] mb-8">
            Kobocent works on Telegram and on the web — same balance, same history, always in sync.
          </p>
          <ul className="space-y-3">
            {[
              'A non-custodial wallet is created for you automatically',
              'No gas fees — we cover the network cost',
              'Free forever for sending, spending and earning',
              'Leave any time and take your funds with you',
            ].map((t) => (
              <li key={t} className="flex gap-3 text-[14px] muted leading-relaxed">
                <span className="text-terracotta shrink-0 font-semibold">✓</span>{t}
              </li>
            ))}
          </ul>
        </div>

        <div className="surface rounded-3xl p-7 sm:p-9 shadow-card order-1 lg:order-2">
          {done ? (
            <div className="text-center py-5">
              <div className="text-[40px] mb-4">✓</div>
              <h2 className="font-display text-[23px] font-bold text-ink dark:text-cream-warm mb-3">
                You are on the list
              </h2>
              <p className="text-[14px] leading-[1.75] muted mb-7">
                We have saved your details and will email you the moment the web app opens. In the
                meantime everything already works on Telegram — and it is the same account, so
                nothing you do there will be lost.
              </p>
              <a
                href={`https://t.me/${BOT}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => track('telegram_click', { from: 'signup_success' })}
                className="btn-primary w-full mb-3"
              >
                Start on Telegram now
              </a>
              <Link href="/" className="btn-ghost w-full">Back to site</Link>
            </div>
          ) : (
            <>
              {/* mode switch */}
              <div className="flex gap-1 p-1 rounded-xl bg-cream-warm dark:bg-night mb-7">
                {([
                  ['create', 'Create account'],
                  ['signin', 'Sign in'],
                  ['link', 'Link Telegram'],
                ] as [Mode, string][]).map(([m, label]) => (
                  <button
                    key={m}
                    onClick={() => { setMode(m); setError(''); }}
                    className={`flex-1 rounded-lg px-2 py-2.5 text-[12.5px] font-semibold transition-all
                      ${mode === m ? 'bg-white dark:bg-night-card text-terracotta shadow-soft' : 'muted hover:text-ink dark:hover:text-cream-warm'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {mode === 'create' && (
                <form onSubmit={submitCreate}>
                  <label className="block mb-5">
                    <span className="block text-[13px] font-medium text-ink dark:text-cream-warm mb-2">
                      Phone number <span className="text-terracotta">*</span>
                    </span>
                    <input type="tel" inputMode="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+234 803 000 0000" className={inputCls} />
                    <span className="block text-[11.5px] muted mt-1.5">Secures your account and how we reach you about your money.</span>
                  </label>

                  <label className="block mb-6">
                    <span className="block text-[13px] font-medium text-ink dark:text-cream-warm mb-2">
                      Email <span className="muted font-normal">(strongly recommended)</span>
                    </span>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className={inputCls} />
                    <span className="block text-[11.5px] muted mt-1.5">
                      Your recovery route if you ever lose or change your phone. Without it, regaining
                      access is far harder.
                    </span>
                  </label>

                  {error && <p className="text-[13px] text-terracotta mb-4">{error}</p>}
                  <button type="submit" disabled={busy} className="btn-primary w-full mb-3 disabled:opacity-60">
                    {busy ? 'Saving…' : 'Create account'}
                  </button>
                </form>
              )}

              {mode === 'signin' && (
                <div>
                  <p className="text-[13.5px] leading-[1.75] muted mb-6">
                    Web sign-in opens with the next release. If you already use Kobocent on Telegram,
                    your account is live there right now — nothing to re-create.
                  </p>
                  <label className="block mb-6">
                    <span className="block text-[13px] font-medium text-ink dark:text-cream-warm mb-2">Phone number</span>
                    <input type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+234 803 000 0000" className={inputCls} disabled />
                  </label>
                  <button disabled className="btn-ghost w-full mb-3 opacity-60 cursor-not-allowed">Sign in — coming soon</button>
                </div>
              )}

              {mode === 'link' && (
                <div>
                  <p className="text-[13.5px] leading-[1.75] muted mb-6">
                    Already on Telegram? Send <code className="font-mono text-terracotta">/link</code> to
                    the bot, and it gives you a one-time code. Enter it here and both become the same
                    account — one balance, one history.
                  </p>
                  <label className="block mb-6">
                    <span className="block text-[13px] font-medium text-ink dark:text-cream-warm mb-2">Link code</span>
                    <input
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      placeholder="ABCD-1234"
                      maxLength={9}
                      className={`${inputCls} font-mono tracking-widest text-center`}
                      disabled
                    />
                    <span className="block text-[11.5px] muted mt-1.5">Codes expire after 10 minutes.</span>
                  </label>
                  <button disabled className="btn-ghost w-full mb-3 opacity-60 cursor-not-allowed">Link account — coming soon</button>
                </div>
              )}

              <div className="relative my-5 text-center">
                <span className="relative z-10 bg-white dark:bg-night-card px-3 text-[12px] muted">or</span>
                <span className="absolute inset-x-0 top-1/2 h-px bg-cream-border dark:bg-night-border" />
              </div>

              <a
                href={`https://t.me/${BOT}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => track('telegram_click', { from: 'signup_form' })}
                className="btn-ghost w-full"
              >
                Continue with Telegram
              </a>

              <p className="mt-6 text-[11.5px] leading-relaxed muted text-center">
                By continuing you agree to our{' '}
                <a href="https://api.clickshift.io/legal" className="text-terracotta hover:underline">Terms and Privacy Policy</a>.
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
