'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { kc, KcError } from '@/lib/kc';
import { IconPlus, IconShield, IconWallet } from '@/components/app/Icons';
import { PageHeader } from '@/components/app/PageHeader';

/**
 * First-time wallet setup. Kobocent creates both wallets — Solana and one 0x address for Ethereum,
 * BNB Chain, Polygon and Arbitrum — with the same derivation as the bot, so it is identical on
 * Telegram and here. Wallet import was removed (founder, 2026-10-05): everyone gets both wallets, and
 * an already-compromised wallet can't be brought in. Crypto held elsewhere is sent in afterwards.
 */
export default function SetupPage() {
  const router = useRouter();
  const [created, setCreated] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [address, setAddress] = useState('');
  // Wallets are made automatically on first visit (founder, 2026-10-06) — the button is only a retry.
  const started = useRef(false);
  useEffect(() => { if (!started.current) { started.current = true; doCreate(); } }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function doCreate() {
    setError('');
    setBusy(true);
    try {
      const r = await kc<{ walletAddress: string }>('wallet/create', { method: 'POST' });
      setAddress(r.walletAddress);
      setCreated(true);
    } catch (err) {
      if (err instanceof KcError && err.status === 409) return router.replace('/app');
      setError(err instanceof Error ? err.message : 'Could not create your wallet');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      <PageHeader fallback="/app/settings" title="Set up your wallet" subtitle="One wallet on Telegram and here — an address for Solana and a 0x address for Ethereum, BNB Chain, Polygon and Arbitrum." />

      {error && <p role="alert" className="mb-5 rounded-xl bg-terracotta-soft text-terracotta-dark dark:text-terracotta-light px-4 py-3 text-[14px]">{error}</p>}

      {!created ? (
        <div className="space-y-4">
          <button onClick={doCreate} disabled={busy || !error} aria-live="polite" className="w-full surface rounded-2xl p-5 flex items-center gap-4 text-left hover:border-terracotta transition-colors min-h-[88px] disabled:cursor-default">
            <span className={`grid place-items-center h-12 w-12 rounded-2xl bg-terracotta-soft text-terracotta shrink-0 ${busy ? 'animate-pulse' : ''}`}><IconPlus /></span>
            <span>
              <span className="block font-semibold text-ink dark:text-cream-warm text-[16px]">{error ? 'Try again' : 'Creating your wallets…'}</span>
              <span className="block muted text-[14px]">{error ? 'Tap to create your wallets' : 'Ready in seconds — with a little SOL to start, so fees are covered'}</span>
            </span>
          </button>
          <div className="flex gap-3 rounded-2xl bg-cream-warm dark:bg-night p-4 text-[13.5px] muted leading-relaxed">
            <IconWallet size={20} className="shrink-0 text-terracotta" />
            <span>Have crypto in another wallet or on an exchange? Create yours first, then send it to your new addresses — <strong>Add money → Crypto</strong>. It lands as spendable balance.</span>
          </div>
        </div>
      ) : (
        <div className="surface rounded-3xl p-6 space-y-4">
          <div className="font-display text-[22px] font-bold text-ink dark:text-cream-warm">Your wallets are ready 🎉</div>
          <p className="muted text-[14.5px] break-all">Solana address: <span className="font-mono text-ink dark:text-cream-warm">{address}</span></p>
          <div className="flex gap-3 rounded-xl bg-cream-warm dark:bg-night p-4 text-[13.5px] muted leading-relaxed">
            <IconShield size={20} className="shrink-0 text-terracotta" />
            <span>Save your recovery phrase: <strong>Settings → Show recovery phrase</strong>. Write it down offline — anyone with it controls your wallet.</span>
          </div>
          <div className="flex gap-3">
            <Link href="/app/settings" className="btn-ghost flex-1">Save phrase now</Link>
            <Link href="/app" className="btn-primary flex-1">Go to my wallet</Link>
          </div>
        </div>
      )}
    </div>
  );
}
