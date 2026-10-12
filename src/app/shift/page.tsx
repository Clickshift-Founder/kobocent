import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalShell } from '@/components/LegalShell';

export const metadata: Metadata = {
  title: '$SHIFT points — Kobocent',
  description: 'How $SHIFT points work on Kobocent.',
};

/** $SHIFT — usage-reward points (CLAUDE.md language rules: a usage-reward point, never "a token with real value"). 2026-10-12. */
export default function ShiftPage() {
  return (
    <LegalShell>
      <p className="eyebrow">Rewards</p>
      <h1 className="h-display text-[34px] sm:text-[44px] mt-2">$SHIFT points</h1>
      <p className="mt-3">$SHIFT is a usage-reward point. You earn points for using Kobocent — the more you use it, the more you earn.</p>

      <h2>How you earn</h2>
      <ul>
        <li>Payments: bank transfers, bills, airtime and data.</li>
        <li>Withdrawals to your bank.</li>
        <li>Trades and staking in Earn.</li>
        <li>Friends you invite who start transacting.</li>
      </ul>

      <h2>Where to see them</h2>
      <p>Open <Link href="/app/rewards">Rewards</Link> in the app (or /rewards in Telegram) to see your points, your tier and your place on the weekly, monthly and all-time leaderboards.</p>

      <h2>Good to know</h2>
      <ul>
        <li>Points are a reward for using Kobocent. They are not money, not an investment and have no guaranteed value.</li>
        <li>A token generation event is a target for Q2 2027 — a target, not a promise. Any change to how points work will be announced in the app first.</li>
        <li>Points earned through abuse (fake accounts, wash activity) are removed.</li>
      </ul>
    </LegalShell>
  );
}
