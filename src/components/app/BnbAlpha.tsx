'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { kc } from '@/lib/kc';
import { Skeleton } from './ui';
import { pct, signedUsd, pnlColor } from './trade';

/**
 * BNB Chain Alpha wallets (2026-10-12) — /trade/bnb/alpha (src/trading/bnbIntelligence.js): ranked every 6 hours from their
 * real trades in trending BNB pools over 7 days. Addresses and one-tap copy with Copy Pro / Kobocent Pro (fee 1 % a trade).
 */
interface Wallet { address: string | null; shortAddress: string; alias: string; tier: string | null; rank: number; followers: number;
  stats: { return7d?: number; pnl7dUsd?: number; winRate?: number; totalTrades7d?: number; riskLevel?: string; avgHoldTime?: string | null; biggestWin?: string | null } }
interface Alpha { ok: true; pro: boolean; wallets: Wallet[]; note: string; updatedAt: number | null }

export function BnbAlpha({ onCopy }: { onCopy: (wallet: string, alias: string) => void }) {
  const [a, setA] = useState<Alpha | null>(null);
  useEffect(() => { kc<Alpha>('trade/bnb/alpha').then(setA).catch(() => setA({ ok: true, pro: false, wallets: [], note: '', updatedAt: null })); }, []);
  if (!a) return <Skeleton className="h-28" />;
  return (
    <section className="space-y-2">
      <div className="flex items-end justify-between gap-3">
        <div><h3 className="font-semibold text-[15px] text-ink dark:text-cream-warm">Alpha wallets on BNB Chain</h3><p className="text-[12.5px] muted">Ranked from their real trades, last 7 days.</p></div>
        {!a.pro && <Link href="/app/trade/premium" className="text-[13px] font-semibold text-terracotta min-h-[44px] leading-[44px]">Unlock</Link>}
      </div>
      {a.wallets.length === 0 ? <div className="surface rounded-2xl p-4 text-[14px] muted">The scanner is ranking BNB Chain wallets — check back in a few hours.</div> : (
        <ul className="space-y-2">
          {a.wallets.map(w => (
            <li key={w.rank} className="surface rounded-2xl p-3.5">
              <div className="flex items-center gap-3">
                <span className="grid place-items-center h-9 w-9 shrink-0 rounded-xl bg-cream-warm dark:bg-night font-bold text-[13px]">{w.rank}</span>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-[15px] text-ink dark:text-cream-warm truncate">{w.alias}</div>
                  <div className="text-[12.5px] muted font-mono truncate">{w.address ? w.shortAddress : 'Address with Pro'} · {w.stats.winRate ?? '—'}% wins · {w.stats.totalTrades7d ?? '—'} trades{w.followers ? ` · ${w.followers} copying` : ''}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-display font-bold text-[18px]" style={{ color: pnlColor(w.stats.return7d ?? null) }}>{w.stats.return7d == null ? '—' : pct(w.stats.return7d, 0)}</div>
                  <div className="text-[11px] muted">{w.stats.pnl7dUsd != null ? signedUsd(w.stats.pnl7dUsd) : ''}</div>
                </div>
              </div>
              <button disabled={!w.address} onClick={() => w.address && onCopy(w.address, w.alias)}
                className={`mt-2.5 w-full min-h-[44px] rounded-xl font-semibold text-[14px] ${w.address ? 'btn-primary' : 'bg-cream-warm dark:bg-night muted'}`}>{w.address ? 'Copy this wallet' : 'Copy Pro or Kobocent Pro'}</button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-[12px] muted">{a.note}</p>
    </section>
  );
}
