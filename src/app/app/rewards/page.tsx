'use client';
import { useCallback, useEffect, useState } from 'react';
import { kc, loadProfile, referralLink, BOT_URL, amount, usd, dayLabel } from '@/lib/kc';
import { PageHeader } from '@/components/app/PageHeader';
import { Skeleton, EmptyState, CopyButton } from '@/components/app/ui';
import { IconTrophy, IconBolt, IconBank, IconChart, IconGift, IconTelegram, IconLeaf } from '@/components/app/Icons';
import { useLiveRefresh } from '@/lib/useLiveRefresh';

interface Climb { bills15Usd: number; withdrawals30Usd: number; trades0_1Sol: number; stakes50Usd: number }
interface Earned {
  cashback: { paidUsd: number; pendingUsd: number; count: number };
  referral: { paidUsd: number; pendingUsd: number; count: number; paidSol: number; paidSolUsd: number | null; friends: number };
  totalPaidUsd: number;
  recent: Array<{ kind: 'cashback' | 'referral'; asset: string; amount: number; usd: number | null; at: number | null; signature: string | null }>;
}
interface Standing {
  tgeTarget: string;
  participants: number;
  updatesEveryHours: number;
  leaderboard: Array<{ rank: number; name: string; points: number; tier: string; isMe: boolean }>;
  earned: Earned | null;
  // Points per friend unlock when that friend makes a first trade.
  referrals?: { invited: number; traded: number; waiting: number; pointsEach: number; pointsUnlocked: number; pointsToUnlock: number; commissionPct: number } | null;
  earn: { multiplier: number; perBill15Usd: number; perWithdrawal30Usd: number; perTrade0_1Sol: number; perThreeTrades0_1Sol: number; perStake50Usd: number; perReferral: number };
  me: null | {
    points: number;
    rank: number;
    rankRange: { from: number; to: number | null } | null;
    topPercent: number | null;
    tier: string;
    earlyAdopter: boolean;
    breakdown: { tradingVolumeSol: number; referrals: number; payments: number; paymentsUsd: number; stakes: number; stakedUsd: number };
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
const plural = (k: number, one: string, many = `${one}s`) => `${n(k)} ${k === 1 ? one : many}`;
const money = (x: number) => (x > 0 && x < 0.01 ? `$${x.toFixed(4)}` : usd(x));

function climbText(c: Climb | null): string {
  if (!c) return '';
  return `about ${plural(c.bills15Usd, 'bill payment')} of $15, or ${plural(c.withdrawals30Usd, 'withdrawal')} of $30, or ${plural(c.trades0_1Sol, 'trade')} of 0.1 SOL, or ${plural(c.stakes50Usd, 'stake')} of $50`;
}

export default function RewardsPage() {
  const [data, setData] = useState<Standing | null>(null);
  const [error, setError] = useState('');
  const [ref, setRef] = useState<string | null>(null);

  const load = useCallback((silent = false) => {
    kc<Standing>('shift').then(setData).catch(e => { if (!silent) setError(e instanceof Error ? e.message : 'Could not load rewards'); });
  }, []);
  useEffect(() => { setRef(referralLink(loadProfile()?.telegramId)); load(); }, [load]);
  useLiveRefresh(() => load(true), 60_000);

  const me = data?.me;
  const earned = data?.earned;
  const tier = TIER[me?.tier || 'bronze'] || TIER.bronze;
  const tierProgress = me?.nextTier ? Math.max(4, Math.min(96, Math.round((me.points / (me.points + me.nextTier.pointsGap)) * 100))) : 100;

  return (
    <div className="space-y-6">
      <PageHeader title="Rewards" subtitle="Everything Kobocent gives back — cashback, referral commission and $SHIFT points." />

      {error ? <EmptyState title="Could not load rewards" body={error} /> : !data ? (
        <div className="space-y-3"><Skeleton className="h-40" /><Skeleton className="h-44" /><Skeleton className="h-28" /><Skeleton className="h-64" /></div>
      ) : (
        <>
          {/* What you've earned */}
          {earned && (
            <section className="space-y-3">
              <div className="rounded-3xl bg-terracotta text-white p-6 shadow-card">
                <div className="text-white/80 text-[13.5px] font-medium">Paid to your wallet so far</div>
                <div className="font-display font-bold text-[40px] leading-tight mt-1">{money(earned.totalPaidUsd)}</div>
                <div className="text-white/85 text-[13.5px] mt-1">Cashback + referral commission{earned.referral.paidSol > 0 ? ` (incl. ${amount(earned.referral.paidSol, 5)} SOL)` : ''}</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="surface rounded-2xl p-4">
                  <div className="flex items-center gap-2 text-terracotta"><IconGift size={18} /><span className="text-[13px] font-semibold uppercase tracking-wide">Cashback</span></div>
                  <div className="font-mono text-[20px] font-semibold text-ink dark:text-cream-warm mt-2">{money(earned.cashback.paidUsd)}</div>
                  <div className="text-[12.5px] muted">0.2% back on payments{earned.cashback.pendingUsd > 0 ? ` · ${money(earned.cashback.pendingUsd)} on its way` : ''}</div>
                </div>
                <div className="surface rounded-2xl p-4">
                  <div className="flex items-center gap-2 text-terracotta"><IconTrophy size={18} /><span className="text-[13px] font-semibold uppercase tracking-wide">Referrals</span></div>
                  <div className="font-mono text-[20px] font-semibold text-ink dark:text-cream-warm mt-2">{money(earned.referral.paidUsd + (earned.referral.paidSolUsd || 0))}</div>
                  <div className="text-[12.5px] muted">20% of {plural(earned.referral.friends, 'friend')}&apos; fees{earned.referral.pendingUsd > 0 ? ` · ${money(earned.referral.pendingUsd)} on its way` : ''}</div>
                </div>
              </div>
              {earned.recent.length > 0 && (
                <ul className="surface rounded-2xl divide-y divide-cream-border dark:divide-night-border px-4">
                  {earned.recent.map((r, i) => (
                    <li key={`${r.signature || i}-${r.at}`} className="flex items-center gap-3 py-3">
                      <span className="grid place-items-center h-10 w-10 rounded-xl bg-cream-warm dark:bg-night text-terracotta">{r.kind === 'cashback' ? <IconGift size={18} /> : <IconTrophy size={18} />}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[14.5px] font-medium text-ink dark:text-cream-warm">{r.kind === 'cashback' ? 'Cashback' : 'Referral commission'}</div>
                        <div className="text-[12.5px] muted">{dayLabel(r.at)}{r.signature ? ' · ' : ''}{r.signature && <a href={`https://solscan.io/tx/${r.signature}`} target="_blank" rel="noopener noreferrer" className="underline">view</a>}</div>
                      </div>
                      <div className="font-mono text-[14px] text-[#58834C]">+{amount(r.amount, r.asset === 'SOL' ? 5 : 4)} {r.asset}</div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {/* Referrals: points unlock when each friend trades */}
          {data.referrals && (
            <section className="surface rounded-3xl p-5 sm:p-6">
              <div className="flex items-center gap-2 text-terracotta"><IconGift size={18} /><span className="text-[13px] font-semibold uppercase tracking-wide">Your referrals</span></div>
              {data.referrals.invited === 0 ? (
                <p className="mt-2 text-[14.5px] muted leading-relaxed">
                  Every friend you invite is worth <strong className="text-ink dark:text-cream-warm">{n(data.referrals.pointsEach)} $SHIFT points</strong> once
                  they make their first trade — plus {data.referrals.commissionPct}% of the fees they pay, forever.
                </p>
              ) : (
                <>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-2xl bg-cream-warm dark:bg-night py-3"><div className="font-display font-bold text-[24px] text-ink dark:text-cream-warm">{n(data.referrals.invited)}</div><div className="text-[12px] muted">invited</div></div>
                    <div className="rounded-2xl bg-cream-warm dark:bg-night py-3"><div className="font-display font-bold text-[24px] text-[#58834C]">{n(data.referrals.traded)}</div><div className="text-[12px] muted">traded</div></div>
                    <div className="rounded-2xl bg-cream-warm dark:bg-night py-3"><div className="font-display font-bold text-[24px] text-terracotta">{n(data.referrals.waiting)}</div><div className="text-[12px] muted">waiting</div></div>
                  </div>
                  {data.referrals.waiting > 0 ? (
                    <p className="mt-3 text-[14.5px] leading-relaxed">
                      🔒 <strong className="text-terracotta">{n(data.referrals.pointsToUnlock)} points</strong> to unlock —{' '}
                      {n(data.referrals.waiting)} × {n(data.referrals.pointsEach)}, plus {data.referrals.commissionPct}% of their fees, as soon as each makes a first trade.
                      <span className="muted"> Nudge them!</span>
                    </p>
                  ) : (
                    <p className="mt-3 text-[14.5px] muted">All your friends have traded — {n(data.referrals.pointsUnlocked)} points unlocked. Invite more to keep earning.</p>
                  )}
                  {data.referrals.traded > 0 && data.referrals.waiting > 0 && (
                    <p className="mt-1 text-[13px] muted">✅ {n(data.referrals.pointsUnlocked)} points already unlocked.</p>
                  )}
                </>
              )}
            </section>
          )}

          {/* $SHIFT standing */}
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
                <p className="mt-2 text-cream/80 text-[14.5px]">No points yet this quarter — your first payment, stake or trade puts you on the board.</p>
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

          {/* How you earn points */}
          <section>
            <div className="eyebrow mb-2">How you earn points {data.earn.multiplier > 1 ? `(${data.earn.multiplier}× included)` : ''}</div>
            <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { Icon: IconBolt, t: 'Pay a $15 bill', v: data.earn.perBill15Usd },
                { Icon: IconBank, t: 'Withdraw $30', v: data.earn.perWithdrawal30Usd },
                { Icon: IconChart, t: '3 trades of 0.1 SOL', v: data.earn.perThreeTrades0_1Sol },
                { Icon: IconLeaf, t: 'Stake $50', v: data.earn.perStake50Usd },
                { Icon: IconGift, t: 'Friend makes a first trade', v: data.earn.perReferral },
              ].map(e => (
                <li key={e.t} className="surface rounded-2xl p-4">
                  <e.Icon size={20} className="text-terracotta" />
                  <div className="mt-2 text-[14px] text-ink dark:text-cream-warm font-medium">{e.t}</div>
                  <div className="font-mono text-[15px] text-terracotta font-semibold">+{n(e.v)} pts</div>
                </li>
              ))}
            </ul>
            {me && (
              <p className="muted text-[13px] mt-3 leading-relaxed">
                This quarter: {plural(me.breakdown.payments, 'payment')} ({usd(me.breakdown.paymentsUsd)}) · {plural(me.breakdown.stakes, 'stake')} ({usd(me.breakdown.stakedUsd)}) · {amount(me.breakdown.tradingVolumeSol, 3)} SOL traded · {plural(me.breakdown.referrals, 'referral')}
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
