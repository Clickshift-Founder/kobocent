'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  kc, KcError, usd, amount, greeting, loadProfile, referralLink, BOT_URL,
  type Balances, type History, type LocalProfile,
} from '@/lib/kc';
import { SectionTitle, Skeleton, Sheet, ActivityRow, EmptyState, CopyButton } from '@/components/app/ui';
import { IconPlus, IconSend, IconBolt, IconBank, IconLeaf, IconBridge, IconChart, IconReceive, IconEye, IconTelegram, IconGift, IconChevron, IconSwap, IconWallet, IconTrophy } from '@/components/app/Icons';
import { InstallCard } from '@/components/app/InstallCard';
import { useLiveRefresh } from '@/lib/useLiveRefresh';

// `href`: the action works on the web — open its screen instead of the Telegram sheet.
type Action = { key: string; label: string; Icon: (p: { size?: number }) => JSX.Element; title: string; body: string; href?: string };

// Money actions run in Telegram today and arrive on the web batch by batch (backend ROADMAP
// Phase 3). We never show a web screen for something the API cannot do yet.
const ACTIONS: Action[] = [
  { key: 'fund', label: 'Add money', Icon: IconPlus, title: 'Add money', body: 'Buy USDC with naira by bank transfer — it lands in your wallet in a few minutes. Or receive crypto to your addresses.', href: '/app/add-money' },
  { key: 'send', label: 'Send to bank', Icon: IconSend, title: 'Send to a bank account', body: 'Pay anyone in naira — type "send 5000 to GTBank 0123456789" or send a screenshot of their account details. Gasless, with a receipt and 0.2% cashback.' },
  { key: 'wallet', label: 'Send to wallet', Icon: IconWallet, title: 'Send to another wallet', body: 'Transfer SOL, USDC, USDT or any token to another wallet — on Solana, Ethereum, BNB Chain, Polygon, Arbitrum or Robinhood Chain. Gasless.' },
  { key: 'bills', label: 'Pay bills', Icon: IconBolt, title: 'Pay bills', body: 'Electricity, airtime, data and cable TV with your stablecoins. Type it, send a screenshot of the bill, or use a voice note.', href: '/app/bills' },
  { key: 'withdraw', label: 'Withdraw', Icon: IconBank, title: 'Withdraw to bank', body: 'Turn USDC or USDT into naira in any Nigerian bank account, usually in minutes.', href: '/app/withdraw' },
  { key: 'swap', label: 'Swap', Icon: IconSwap, title: 'Swap', body: 'Convert between SOL, USDC and USDT in seconds at the best route — gasless.' },
  { key: 'earn', label: 'Earn', Icon: IconLeaf, title: 'Earn on your stablecoins', body: 'Put idle USDC to work — flexible or locked plans, earnings every hour. Rates can change.' },
  { key: 'bridge', label: 'Bridge in', Icon: IconBridge, title: 'Bridge in from another chain', body: 'Bring ETH, BNB, MATIC or USDC/USDT from Ethereum, BNB Chain, Polygon, Arbitrum or Robinhood Chain into spendable USDC.' },
  { key: 'trade', label: 'Trade', Icon: IconChart, title: 'Trade tokens', body: 'Analyse any token with an AI risk score before you buy, then trade in seconds.' },
];

const HIDE_KEY = 'kc-hide-balance';

export default function HomePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<LocalProfile | null>(null);
  const [bal, setBal] = useState<Balances | null>(null);
  const [hist, setHist] = useState<History | null>(null);
  const [error, setError] = useState('');
  const [needsLink, setNeedsLink] = useState(false);
  const [sheet, setSheet] = useState<Action | null>(null);
  const [hidden, setHidden] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    setProfile(loadProfile());
    try { setHidden(window.localStorage.getItem(HIDE_KEY) === '1'); } catch { /* ignore */ }
  }, []);

  // silent = background refresh: keep what is on screen if it fails.
  const load = useCallback(async (silent = false) => {
    if (!silent) setError('');
    setRefreshing(true);
    try {
      setBal(await kc<Balances>('wallet'));
    } catch (e) {
      setRefreshing(false);
      if (e instanceof KcError && e.status === 404) return router.replace('/app/setup');
      if (e instanceof KcError && e.status === 409) return setNeedsLink(true);
      if (!silent) setError(e instanceof Error ? e.message : 'Could not load your wallet');
      return;
    }
    await kc<History>('history?period=month').then(setHist)
      .catch(() => { if (!silent) setHist({ period: 'month', startTs: 0, endTs: 0, shiftPoints: 0, items: [] }); });
    setRefreshing(false);
  }, [router]);

  useEffect(() => { load(); }, [load]);
  // A payment made in Telegram shows up here without signing out and in again.
  useLiveRefresh(() => load(true));

  function toggleHidden() {
    const v = !hidden;
    setHidden(v);
    try { window.localStorage.setItem(HIDE_KEY, v ? '1' : '0'); } catch { /* ignore */ }
  }

  const assets = useMemo(() => {
    if (!bal) return [];
    const rows: Array<{ key: string; symbol: string; network: string; amount: number; usd: number | null }> = [];
    rows.push({ key: 'sol', symbol: 'SOL', network: 'Solana', amount: bal.solana.sol.amount, usd: bal.solana.sol.usd });
    for (const t of bal.solana.tokens) rows.push({ key: t.mint, symbol: t.symbol, network: 'Solana', amount: t.amount, usd: t.usd });
    for (const s of bal.evm?.stablecoins || []) if (s.amount > 0) rows.push({ key: s.assetKey, symbol: s.symbol, network: s.assetKey.split('_')[1]?.toUpperCase() || 'EVM', amount: s.amount, usd: s.usd });
    for (const n of bal.evm?.native || []) if (n.amount > 0) rows.push({ key: n.chainKey, symbol: n.symbol, network: n.chainKey, amount: n.amount, usd: n.usd });
    return rows.filter(r => r.amount > 0).sort((a, b) => (b.usd || 0) - (a.usd || 0));
  }, [bal]);

  const ref = referralLink(profile?.telegramId);
  const mask = (s: string) => (hidden ? '••••••' : s);

  if (needsLink) {
    return (
      <EmptyState title="Link your Telegram" body="Balances and history live on your Telegram account. Open Settings → Link Telegram to connect it."
        action={<Link href="/app/settings" className="btn-primary">Open Settings</Link>} />
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="muted text-[14px]">{greeting()}{profile?.firstName ? ',' : ''}</p>
        <h1 className="h-display text-[28px] sm:text-[32px]">{profile?.firstName || 'Welcome'} 👋</h1>
      </div>

      {/* Balance */}
      <section className="relative overflow-hidden rounded-3xl bg-terracotta text-white p-6 sm:p-8 shadow-card">
        <svg className="absolute -right-10 -top-10 opacity-15" width="240" height="240" viewBox="0 0 120 120" aria-hidden="true">
          <circle cx="46" cy="60" r="30" fill="none" stroke="white" strokeWidth="9" /><circle cx="86" cy="60" r="20" fill="white" />
        </svg>
        <div className="relative">
          <div className="flex items-center gap-2 text-white/80 text-[13.5px] font-medium">
            Total balance
            <button onClick={toggleHidden} aria-label={hidden ? 'Show balance' : 'Hide balance'} className="grid place-items-center h-8 w-8 -my-1 rounded-lg hover:bg-white/10"><IconEye size={16} /></button>
            <button onClick={() => load()} aria-label="Refresh" title="Refresh" className="ml-auto grid place-items-center h-9 w-9 -my-1 rounded-lg hover:bg-white/10">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={refreshing ? 'animate-spin' : ''}><path d="M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5" /></svg>
            </button>
          </div>
          {bal ? (
            <div className="font-display font-bold text-[40px] sm:text-[48px] leading-tight mt-1">{mask(usd(bal.totals.usd))}</div>
          ) : error ? (
            <div className="mt-2 text-[15px]">{error} <button onClick={() => load()} className="underline font-semibold">Retry</button></div>
          ) : (
            <div className="h-14 w-48 mt-2 rounded-xl bg-white/20 animate-pulse" />
          )}
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[13.5px] text-white/85">
            <span>Stablecoins {bal ? mask(usd(bal.totals.stablecoinsUsd)) : '—'}</span>
            {bal?.totals.partial && <span className="text-white/70">Some prices unavailable</span>}
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:max-w-sm">
            <Link href="/app/add-money" className="inline-flex items-center justify-center gap-2 rounded-xl bg-white text-terracotta-dark font-semibold min-h-[48px]"><IconPlus size={18} />Add money</Link>
            <Link href="/app/receive" className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 font-semibold min-h-[48px]"><IconReceive size={18} />Receive</Link>
          </div>
        </div>
      </section>

      {/* Actions */}
      <section>
        <SectionTitle>Move money</SectionTitle>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 sm:gap-3">
          {ACTIONS.slice(1).map(a => (
            <button key={a.key} onClick={() => (a.href ? router.push(a.href) : setSheet(a))}
              className="group flex flex-col items-center gap-2 rounded-2xl p-2.5 min-h-[88px] hover:bg-white dark:hover:bg-night-card transition-colors">
              <span className="grid place-items-center h-12 w-12 rounded-2xl surface text-terracotta group-hover:border-terracotta transition-colors"><a.Icon size={22} /></span>
              <span className="text-[12.5px] font-medium text-ink dark:text-cream-warm text-center leading-tight">{a.label}</span>
            </button>
          ))}
        </div>
      </section>

      <InstallCard />

      {/* Assets */}
      <section>
        <SectionTitle>Your assets</SectionTitle>
        {!bal ? (
          <div className="space-y-2"><Skeleton className="h-16" /><Skeleton className="h-16" /></div>
        ) : assets.length === 0 ? (
          <EmptyState title="Your wallet is ready" body="Add money with naira, or receive USDC, USDT or SOL to your addresses — gasless from there."
            action={<Link href="/app/add-money" className="btn-primary">Add money</Link>} />
        ) : (
          <ul className="surface rounded-2xl divide-y divide-cream-border dark:divide-night-border px-4">
            {assets.map(a => (
              <li key={a.key} className="flex items-center gap-3.5 py-3.5">
                <span className="grid place-items-center h-11 w-11 shrink-0 rounded-full bg-cream-warm dark:bg-night font-mono text-[12px] font-semibold text-terracotta">{a.symbol.slice(0, 4)}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-medium text-ink dark:text-cream-warm">{a.symbol}</div>
                  <div className="text-[13px] muted capitalize">{a.network.toLowerCase()}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-[14.5px] text-ink dark:text-cream-warm">{mask(usd(a.usd))}</div>
                  <div className="font-mono text-[12.5px] muted">{mask(amount(a.amount))}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Recent activity */}
      <section>
        <SectionTitle action={<Link href="/app/activity" className="inline-flex items-center gap-1 text-[14px] font-medium text-terracotta">See all<IconChevron size={16} /></Link>}>Recent activity</SectionTitle>
        {!hist ? (
          <div className="space-y-2"><Skeleton className="h-14" /><Skeleton className="h-14" /><Skeleton className="h-14" /></div>
        ) : hist.items.length === 0 ? (
          <EmptyState title="Nothing here yet" body="Your payments, transfers, trades and earnings will show up here — from Telegram and the app." />
        ) : (
          <ul className="surface rounded-2xl divide-y divide-cream-border dark:divide-night-border px-4">
            {hist.items.slice(0, 5).map((i, n) => <ActivityRow key={`${i.kind}-${i.reference || n}-${i.at}`} item={i} />)}
          </ul>
        )}
      </section>

      {/* Rewards teaser */}
      <Link href="/app/rewards" className="surface rounded-3xl p-5 flex items-center gap-4 hover:border-terracotta transition-colors">
        <span className="grid place-items-center h-12 w-12 shrink-0 rounded-2xl bg-terracotta-soft text-terracotta"><IconTrophy /></span>
        <span className="flex-1">
          <span className="block font-semibold text-ink dark:text-cream-warm">Your $SHIFT rank</span>
          <span className="block muted text-[14px]">See where you are on the leaderboard and how to climb.</span>
        </span>
        <IconChevron className="muted" />
      </Link>

      {/* Invite */}
      {ref && (
        <section className="surface rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center gap-5">
          <span className="grid place-items-center h-14 w-14 shrink-0 rounded-2xl bg-terracotta-soft text-terracotta"><IconGift size={26} /></span>
          <div className="flex-1">
            <div className="font-display text-[19px] font-bold text-ink dark:text-cream-warm">Invite friends, earn 20%</div>
            <p className="muted text-[14px] leading-relaxed">You earn 20% of the fees your friends pay — on trades, payments, bills, withdrawals and staking. Paid to your wallet.</p>
          </div>
          <div className="flex gap-2">
            <CopyButton value={ref} label="Copy link" />
            <button
              onClick={() => { if (navigator.share) navigator.share({ title: 'Kobocent', text: 'Pay bills, send money and grow your stablecoins with Kobocent — Telegram and App.', url: ref }).catch(() => {}); }}
              className="btn-primary !px-4 !py-0 min-h-[44px] !text-[14px]">Share</button>
          </div>
        </section>
      )}

      <Sheet open={!!sheet} onClose={() => setSheet(null)} title={sheet?.title || ''}>
        <p className="muted text-[15px] leading-relaxed mb-5">{sheet?.body}</p>
        <div className="rounded-2xl bg-cream-warm dark:bg-night px-4 py-3 text-[13.5px] muted mb-5">
          Ready now on Telegram — same account, same balance. Coming to the web app soon.
        </div>
        <a href={BOT_URL} target="_blank" rel="noopener noreferrer" className="btn-primary w-full"><IconTelegram />Continue in Telegram</a>
        <button onClick={() => setSheet(null)} className="btn-ghost w-full mt-3">Not now</button>
      </Sheet>
    </div>
  );
}
