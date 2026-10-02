'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { kc, KcError, BOT_URL } from '@/lib/kc';
import { CopyButton, Skeleton, EmptyState } from '@/components/app/ui';
import { IconShield } from '@/components/app/Icons';

interface Addresses { exists: true; solana: string; evm: string | null }

export default function ReceivePage() {
  const router = useRouter();
  const [a, setA] = useState<Addresses | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    kc<Addresses>('wallet/addresses').then(setA).catch(e => {
      if (e instanceof KcError && e.status === 404) return router.replace('/app/setup');
      setError(e instanceof Error ? e.message : 'Could not load your addresses');
    });
  }, [router]);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="h-display text-[28px] sm:text-[32px] mb-2">Receive</h1>
        <p className="muted text-[15px] leading-relaxed">Share an address to get paid in crypto. Always check the network before anyone sends.</p>
      </div>

      {error ? <EmptyState title="Could not load addresses" body={error} /> : !a ? (
        <div className="space-y-3"><Skeleton className="h-40" /><Skeleton className="h-40" /></div>
      ) : (
        <>
          <AddressCard title="Solana" tag="Best for USDC, USDT & SOL" address={a.solana}
            note="Send USDC or USDT on Solana (SPL), or SOL. Lands as spendable balance right away." />
          {a.evm && (
            <AddressCard title="Ethereum · BNB Chain · Polygon · Arbitrum · Robinhood" tag="One address, five networks" address={a.evm}
              note="Same address on every network listed. Choose the network carefully — Ethereum and Arbitrum both use ETH but are different networks. Bridge it into spendable USDC from Telegram." />
          )}
          <div className="flex gap-3 rounded-2xl bg-cream-warm dark:bg-night-card p-4 text-[13.5px] muted leading-relaxed">
            <IconShield size={20} className="shrink-0 text-terracotta" />
            <span>Paying with naira instead? Buy USDC by bank transfer in <a href={BOT_URL} target="_blank" rel="noopener noreferrer" className="text-terracotta font-medium">Telegram</a> — it arrives in this same wallet.</span>
          </div>
        </>
      )}
    </div>
  );
}

function AddressCard({ title, tag, address, note }: { title: string; tag: string; address: string; note: string }) {
  return (
    <section className="surface rounded-3xl p-5 sm:p-6">
      <div className="eyebrow mb-1">{tag}</div>
      <div className="font-display text-[18px] font-bold text-ink dark:text-cream-warm mb-4">{title}</div>
      <div className="rounded-2xl bg-cream dark:bg-night px-4 py-4 font-mono text-[14px] sm:text-[15px] break-all text-ink dark:text-cream-warm select-all">{address}</div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <CopyButton value={address} label="Copy address" />
        <button onClick={() => { if (navigator.share) navigator.share({ title: 'My Kobocent address', text: address }).catch(() => {}); }}
          className="inline-flex items-center rounded-xl px-4 min-h-[44px] text-[14px] font-medium muted hover:text-terracotta">Share</button>
      </div>
      <p className="mt-4 text-[13px] muted leading-relaxed">{note}</p>
    </section>
  );
}
