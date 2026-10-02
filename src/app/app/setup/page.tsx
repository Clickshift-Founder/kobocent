'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { kc, KcError } from '@/lib/kc';
import { IconReceive, IconPlus, IconShield } from '@/components/app/Icons';

/**
 * First-time wallet setup: Import an existing wallet first, Create a new one second.
 * Same derivation as the bot, so the wallet is identical on Telegram and here.
 */
export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState<'choose' | 'import' | 'created'>('choose');
  const [secret, setSecret] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [address, setAddress] = useState('');

  async function doImport(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!secret.trim()) return setError('Paste your 12 or 24-word recovery phrase, or your private key.');
    setBusy(true);
    try {
      await kc('wallet/import', { method: 'POST', body: { secret: secret.trim() } });
      setSecret('');
      router.replace('/app');
    } catch (err) {
      if (err instanceof KcError && err.status === 409) return router.replace('/app');
      setError(err instanceof Error ? err.message : 'Could not import that wallet');
    } finally {
      setBusy(false);
    }
  }

  async function doCreate() {
    setError('');
    setBusy(true);
    try {
      const r = await kc<{ walletAddress: string }>('wallet/create', { method: 'POST' });
      setAddress(r.walletAddress);
      setStep('created');
    } catch (err) {
      if (err instanceof KcError && err.status === 409) return router.replace('/app');
      setError(err instanceof Error ? err.message : 'Could not create your wallet');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="eyebrow mb-2">Set up your wallet</div>
      <h1 className="h-display text-[28px] sm:text-[34px] mb-3">One wallet, everywhere</h1>
      <p className="muted text-[15px] leading-relaxed mb-8">
        Your wallet works on Telegram and here, with one address for Solana and one for Ethereum, BNB Chain, Polygon and more.
      </p>

      {error && <p role="alert" className="mb-5 rounded-xl bg-terracotta-soft text-terracotta-dark dark:text-terracotta-light px-4 py-3 text-[14px]">{error}</p>}

      {step === 'choose' && (
        <div className="space-y-3">
          <button onClick={() => setStep('import')} className="w-full surface rounded-2xl p-5 flex items-center gap-4 text-left hover:border-terracotta transition-colors min-h-[88px]">
            <span className="grid place-items-center h-12 w-12 rounded-2xl bg-terracotta-soft text-terracotta shrink-0"><IconReceive /></span>
            <span>
              <span className="block font-semibold text-ink dark:text-cream-warm text-[16px]">I already have a wallet</span>
              <span className="block muted text-[14px]">Import it with your recovery phrase or private key</span>
            </span>
          </button>
          <button onClick={doCreate} disabled={busy} className="w-full surface rounded-2xl p-5 flex items-center gap-4 text-left hover:border-terracotta transition-colors min-h-[88px] disabled:opacity-60">
            <span className="grid place-items-center h-12 w-12 rounded-2xl bg-cream-warm dark:bg-night text-terracotta shrink-0"><IconPlus /></span>
            <span>
              <span className="block font-semibold text-ink dark:text-cream-warm text-[16px]">{busy ? 'Creating your wallet…' : 'Create a new wallet'}</span>
              <span className="block muted text-[14px]">Ready in seconds — gasless from day one</span>
            </span>
          </button>
        </div>
      )}

      {step === 'import' && (
        <form onSubmit={doImport} className="surface rounded-3xl p-6 space-y-4">
          <label htmlFor="secret" className="block font-semibold text-ink dark:text-cream-warm">Recovery phrase or private key</label>
          <textarea id="secret" value={secret} onChange={e => setSecret(e.target.value)} rows={4} autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false}
            placeholder="word1 word2 word3 …"
            className="w-full rounded-xl border border-cream-border dark:border-night-border bg-transparent px-4 py-3 text-[15px] font-mono outline-none focus:border-terracotta" />
          <div className="flex gap-3 rounded-xl bg-cream-warm dark:bg-night p-4 text-[13.5px] muted leading-relaxed">
            <IconShield size={20} className="shrink-0 text-terracotta" />
            <span>A recovery phrase also restores your Ethereum/BNB address; a private key restores Solana only. It is sent once over an encrypted connection and stored encrypted. Kobocent will never ask you for it in a message.</span>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => { setStep('choose'); setSecret(''); }} className="btn-ghost flex-1">Back</button>
            <button type="submit" disabled={busy} className="btn-primary flex-1 disabled:opacity-60">{busy ? 'Importing…' : 'Import wallet'}</button>
          </div>
        </form>
      )}

      {step === 'created' && (
        <div className="surface rounded-3xl p-6 space-y-4">
          <div className="font-display text-[22px] font-bold text-ink dark:text-cream-warm">Your wallet is ready 🎉</div>
          <p className="muted text-[14.5px] break-all">Address: <span className="font-mono text-ink dark:text-cream-warm">{address}</span></p>
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
