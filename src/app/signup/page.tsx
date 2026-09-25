'use client';
import { useState } from 'react';
import Link from 'next/link';
import { LogoLockup } from '@/components/ui/Logo';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

const BOT = process.env.NEXT_PUBLIC_TELEGRAM_BOT || 'clicksolbot';

/**
 * PHASE 1: collects identity and hands off.
 * Phase 2 wires this to the backend — see DEPLOYMENT.md, "Telegram sync".
 *
 * Design intent: phone is the primary field because it is the most reliable
 * reactivation channel for this user base. Email is optional but strongly
 * encouraged for recovery. The wallet is created server-side afterwards, so a
 * first-time user never faces a seed phrase before seeing value.
 */
export default function SignupPage() {
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const digits = phone.replace(/[^\d]/g, '');
    if (digits.length < 8) { setError('Please enter a valid phone number, including country code.'); return; }
    // TODO(phase-2): POST to /api/auth/start → send OTP → create wallet → link session
    setSubmitted(true);
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="container-page flex items-center justify-between py-6">
        <Link href="/" aria-label="Kobocent home"><LogoLockup /></Link>
        <ThemeToggle compact />
      </header>

      <main className="flex-1 container-page grid lg:grid-cols-2 gap-12 items-center py-10">
        <div className="max-w-md">
          <h1 className="h-display text-[clamp(30px,4.4vw,44px)] mb-4">
            Create your <span className="text-terracotta italic">Kobocent</span> account
          </h1>
          <p className="muted text-[15.5px] leading-[1.75] mb-8">
            One account for sending, spending, trading and earning — on the web and on Telegram,
            always in sync.
          </p>
          <ul className="space-y-3">
            {[
              'A non-custodial wallet is created for you automatically',
              'No gas fees — we cover the network cost',
              'Link Telegram any time and keep one balance',
              'Free forever for sending, spending and earning',
            ].map((t) => (
              <li key={t} className="flex gap-3 text-[14px] muted leading-relaxed">
                <span className="text-terracotta shrink-0 font-semibold">✓</span>{t}
              </li>
            ))}
          </ul>
        </div>

        <div className="surface rounded-3xl p-7 sm:p-9 shadow-card">
          {submitted ? (
            <div className="text-center py-6">
              <div className="text-[40px] mb-4">📲</div>
              <h2 className="font-display text-[23px] font-bold text-ink dark:text-cream-warm mb-3">
                Almost there
              </h2>
              <p className="text-[14px] leading-[1.75] muted mb-7">
                Account creation goes live with the next release. In the meantime you can start
                immediately on Telegram — the same account will carry over when the web app opens.
              </p>
              <a href={`https://t.me/${BOT}`} target="_blank" rel="noopener noreferrer" className="btn-primary w-full mb-3">
                Continue on Telegram
              </a>
              <Link href="/" className="btn-ghost w-full">Back to home</Link>
            </div>
          ) : (
            <form onSubmit={submit}>
              <h2 className="font-display text-[22px] font-bold text-ink dark:text-cream-warm mb-1.5">Get started</h2>
              <p className="text-[13.5px] muted mb-7">Takes about a minute.</p>

              <label className="block mb-5">
                <span className="block text-[13px] font-medium text-ink dark:text-cream-warm mb-2">
                  Phone number <span className="text-terracotta">*</span>
                </span>
                <input
                  type="tel"
                  inputMode="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+234 803 000 0000"
                  className="w-full rounded-xl border border-cream-border dark:border-night-border bg-transparent px-4 py-3.5 text-[15px]
                             outline-none transition-colors focus:border-terracotta"
                />
                <span className="block text-[11.5px] muted mt-1.5">
                  Used to secure your account and reach you about your money. Include your country code.
                </span>
              </label>

              <label className="block mb-6">
                <span className="block text-[13px] font-medium text-ink dark:text-cream-warm mb-2">
                  Email <span className="muted font-normal">(optional, recommended)</span>
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-cream-border dark:border-night-border bg-transparent px-4 py-3.5 text-[15px]
                             outline-none transition-colors focus:border-terracotta"
                />
                <span className="block text-[11.5px] muted mt-1.5">
                  Lets you recover your account if you ever change phone number.
                </span>
              </label>

              {error && <p className="text-[13px] text-terracotta mb-4">{error}</p>}

              <button type="submit" className="btn-primary w-full mb-3">Create account</button>

              <div className="relative my-5 text-center">
                <span className="relative z-10 bg-white dark:bg-night-card px-3 text-[12px] muted">or</span>
                <span className="absolute inset-x-0 top-1/2 h-px bg-cream-border dark:bg-night-border" />
              </div>

              <a href={`https://t.me/${BOT}`} target="_blank" rel="noopener noreferrer" className="btn-ghost w-full">
                Continue with Telegram
              </a>

              <p className="mt-6 text-[11.5px] leading-relaxed muted text-center">
                By continuing you agree to our{' '}
                <a href="https://api.clickshift.io/legal" className="text-terracotta hover:underline">Terms and Privacy Policy</a>.
              </p>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
