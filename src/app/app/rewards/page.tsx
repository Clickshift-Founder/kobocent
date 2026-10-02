'use client';
import { useEffect, useState } from 'react';
import { kc, loadProfile, referralLink, BOT_URL, amount, usd } from '@/lib/kc';
import { PageHeader } from '@/components/app/PageHeader';
import { Skeleton, EmptyState, CopyButton } from '@/components/app/ui';
import { IconTrophy, IconBolt, IconBank, IconChart, IconGift, IconTelegram } from '@/components/app/Icons';

interface Climb { payments5Usd: number; withdrawals20Usd: number; trades0_1Sol: number }
interface Standing {
  tgeTarget: string;
  participants: number;
  updatesEveryHours: number;
  leaderboard: Array<{ rank: number; name: string; points: number; tier: string; isMe: boolean }>;
  earn: { multiplier: number; perPayment5Usd: number; perWithdrawal20Usd: number; perTrade0_1Sol: number; perActiveTradingDay: number; perReferral: number };
  me: null | {
    points: number;
    rank: number;
    rankRange: { from: number; to: number | null } | null;
    topPercent: number | null;
    tier: string;
    earlyAdopter: boolean;
    breakdown: { tradingVolumeSol: number; referrals: number; payments: number; paymentsUsd: number };
    nextRank: { pointsGap: number; toClimb: Climb | null } | null;
    nextTier: { tier: string; rankNeeded: number; pointsGap: number; toClimb: Climb | null } | null;
  };
}

const TIER: Record<string, { icon: string; label: string }> = {
  diamond: { icon: '💎', label: 'Diamond' }, platinum: { icon: '🏆', label: 'Platinum' },
  gold: { icon: '🥇', label: 'Gold' }, silver: { icon: '🥈', label: 'Silver' }, bronze: { icon: '🥉', label: 'Bronze' },
};
const MEDAL = ['🥇', '🥈', '🥉'];
const n = (x: number) => x.toLocaleString('en-US');

function climbText(c: Climb | null): string {
  if (!c) return '';
  const parts = [
    `${n(c.payments5Usd)} bill payment${c.payments5Usd === 1 ? '' : 's'} of $5`,
    `${n(c.withdrawals20Usd)} withdrawal${c.withdrawals20Usd === 1 ? '' : 's'} of $20`,
    `${n(c.trades0_1Sol)} trade${c.trades0_1Sol === 1 ? '' : 's'} of 0.1 SOL`,
  ];
  return `about ${parts[0]}, or ${parts[1]}, or ${parts[2]}`;
}

export default function RewardsPage() {
  const [data, setData] = useState<Standing | null>(null);
  const [error, setError] = useState('');
  const [ref, setRef] = useState<string | null>(null);

  useEffect(() => {
    setRef(referralLink(loadProfile()?.telegramId));
    kc<Standing>('shift').then(setData).catch(e => setError(e instanceof Error ? e.message : 'Could not load rewards'));
  }, []);

  const me = data?.me;
  const tier = TIER[me?.tier || 'bronze'] || TIER.bronze;
  const tierProgress = me?.nextTier ? Math.max(4, Math.min(96, Math.round((me.points / (me.points + me.nextTier.pointsGap)) * 100))) : 100;

  return (
    <div className="space-y-6">
      <PageHeader title="Rewards" subtitle="Every payment, withdrawal and trade earns $SHIFT points." />

      {error ? <EmptyState title="Could not load rewards" body={error} /> : !data ? (
        <div className="space-y-3"><Skeleton className="h-44" /><Skeleton className="h-28" /><Skeleton className="h-64" /></div>
      ) : (
        <>
          {/* Standing */}
          <section className="relative overflow-hidden rounded-3xl bg-ink dark:bg-night-card text-cream p-6 sm:p-8 shadow-card">
            <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-terracotta/30 blur-2xl" aria-hidden="true" />
            <div className="relative">
              <div className="flex items-center gap-2 text-cream/70 text-[13.5px] font-medium"><IconTrophy size={16} />Your $SHIFT points</div>
              <div className="font-display font-bold text-[44px] leading-tight mt-1">{me ? n(me.points) : '0'}</div>
              {me ? (
                <div className="mt-3 flex flex-wrap gap-2 text-[13px]">
                  <span className="rounded-full bg-white/10 px-3 py-1.5">{tier.icon} {tier.label}</span>
                  <span className="rounded-full bg-white/10 px-3 py-1.5">
                    {me.rankRange ? `Ranked #${n(me.rankRange.from)}–${me.rankRange.to ? n(me.rankRange.to) : '…'}` : `#${n(me.rank)} of ${n(data.participants)}`}
                  </span>
                  {me.topPercent !== null && <span className="rounded-full bg-white/10 px-3 py-1.5">Top {me.topPercent}%</span>}
                  {me.earlyAdopter && <span className="rounded-full bg-terracotta px-3 py-1.5 font-semibold">3× early adopter</span>}
                </div>
              ) : (
                <p className="mt-2 text-cream/80 text-[14.5px]">No points yet this quarter — your first payment or trade puts you on the board.</p>
              )}
            </div>
          </section>

          {/* Climb */}
          {me && (me.nextRank || me.nextTier) && (
            <section className="surface rounded-3xl p-5 sm:p-6 space-y-5">
              {me.nextRank && me.nextRank.pointsGap > 0 && (
                <div>
                  <div className="font-semibold text-ink dark:text-cream-warm">Climb one place</div>
                  <p className="muted text-[14px] leading-relaxed">You need <strong className="text-ink dark:text-cream-warm">{n(me.nextRank.pointsGap)} points</strong> — {climbText(me.nextRank.toClimb)}.</p>
                </div>
              )}
              {me.nextTier && (
                <div>
                  <div className="flex items-center justify-between text-[14px] mb-2">
                    <span className="font-semibold text-ink dark:text-cream-warm">Next tier: {TIER[me.nextTier.tier]?.icon} {TIER[me.nextTier.tier]?.label}</span>
                    <span className="muted">{n(me.nextTier.pointsGap)} pts to go</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-cream-warm dark:bg-night overflow-hidden" role="progressbar" aria-valuenow={tierProgress} aria-valuemin={0} aria-valuemax={100}>
                    <div className="h-full rounded-full bg-terracotta" style={{ width: `${tierProgress}%` }} />
                  </div>
                  <p className="muted text-[13px] mt-2 leading-relaxed">That is {climbText(me.nextTier.toClimb)}.</p>
                </div>
              )}
            </section>
          )}

          {/* How you earn */}
          <section>
            <div className="eyebrow mb-2">How you earn {data.earn.multiplier > 1 ? `(${data.earn.multiplier}× included)` : ''}</div>
            <ul className="grid grid-cols-2 gap-3">
              {[
                { Icon: IconBolt, t: 'Pay a $5 bill', v: data.earn.perPayment5Usd },
                { Icon: IconBank, t: 'Withdraw $20', v: data.earn.perWithdrawal20Usd },
                { Icon: IconChart, t: 'Trade 0.1 SOL', v: data.earn.perTrade0_1Sol },
                { Icon: IconGift, t: 'Invite a friend', v: data.earn.perReferral },
              ].map(e => (
                <li key={e.t} className="surface rounded-2xl p-4">
                  <e.Icon size={20} className="text-terracotta" />
                  <div className="mt-2 text-[14px] text-ink dark:text-cream-warm font-medium">{e.t}</div>
                  <div className="font-mono text-[15px] text-terracotta font-semibold">+{n(e.v)} pts</div>
                </li>
              ))}
            </ul>
            {me && (
              <p className="muted text-[13px] mt-3">
                This quarter: {n(me.breakdown.payments)} payment{me.breakdown.payments === 1 ? '' : 's'} ({usd(me.breakdown.paymentsUsd)}) · {amount(me.breakdown.tradingVolumeSol, 3)} SOL traded · {n(me.breakdown.referrals)} referral{me.breakdown.referrals === 1 ? '' : 's'}
              </p>
            )}
          </section>

          {/* Leaderboard */}
          <section>
            <div className="eyebrow mb-2">Leaderboard · this quarter</div>
            {data.leaderboard.length === 0 ? (
              <EmptyState title="The board is empty" body="Be the first — make a payment or a trade." />
            ) : (
              <ol className="surface rounded-2xl divide-y divide-cream-border dark:divide-night-border px-4">
                {data.leaderboard.map(r => (
                  <li key={r.rank} className={`flex items-center gap-3 py-3 ${r.isMe ? 'text-terracotta' : ''}`}>
                    <span className="w-8 text-center font-mono text-[14px] muted">{MEDAL[r.rank - 1] || `#${r.rank}`}</span>
                    <span className={`flex-1 truncate text-[15px] ${r.isMe ? 'font-semibold' : 'text-ink dark:text-cream-warm'}`}>{r.isMe ? 'You' : r.name}</span>
                    <span className="text-[13px] muted">{TIER[r.tier]?.icon}</span>
                    <span className="font-mono text-[14px] w-20 text-right">{n(r.points)}</span>
                  </li>
                ))}
                {me && !data.leaderboard.some(r => r.isMe) && (
                  <li className="flex items-center gap-3 py-3 text-terracotta">
                    <span className="w-8 text-center font-mono text-[13px]">{me.rankRange ? '…' : `#${me.rank}`}</span>
                    <span className="flex-1 font-semibold text-[15px]">You {me.rankRange ? `· #${n(me.rankRange.from)}–${me.rankRange.to ? n(me.rankRange.to) : '…'}` : ''}</span>
                    <span className="font-mono text-[14px] w-20 text-right">{n(me.points)}</span>
                  </li>
                )}
              </ol>
            )}
          </section>

          <section className="flex flex-col sm:flex-row gap-3">
            <a href={BOT_URL} target="_blank" rel="noopener noreferrer" className="btn-primary flex-1"><IconTelegram />Earn now on Telegram</a>
            {ref && <CopyButton value={ref} label="Copy invite link" />}
          </section>

          <p className="text-[12.5px] muted leading-relaxed">
            Points refresh every {data.updatesEveryHours} hours. $SHIFT is a usage-reward point, not a security, and carries no guarantee of future value. Token launch target: {data.tgeTarget} — a target, not a promise.
          </p>
        </>
      )}
    </div>
  );
}
