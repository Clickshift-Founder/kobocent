/**
 * The Kobocent films (2026-11-16). One list feeds the landing page's "See it working" section (the first three) and the
 * catalogue at /videos. Files live in /public/videos as <file>.mp4 (720×1280, about 2 MB) with a <file>.jpg poster.
 * Each is an illustrated walkthrough with example amounts. To add a film: render it (scripts/films/README.md), put the
 * two files in /public/videos, and add an entry here; the page, the sitemap and the landing section follow.
 * Nothing on the site states how many films there are, so adding one needs no copy change.
 */
export type VideoCategory = 'Getting started' | 'Everyday payments' | 'Swap and bridge' | 'Kobo Pal and safety' | 'Grow your money' | 'Trading';

export interface ProductVideo {
  file: string;
  title: string;
  label: string;      // short tab label on the landing page
  caption: string;
  category: VideoCategory;
  seconds: number;
  note?: string;      // shown under the caption where the subject needs a caveat
}

export const VIDEO_CATEGORIES: { name: VideoCategory; blurb: string }[] = [
  { name: 'Getting started', blurb: 'Fund your account with naira or with crypto you already hold.' },
  { name: 'Everyday payments', blurb: 'Bills, bank withdrawals, sending to any wallet, and the cashback they earn.' },
  { name: 'Swap and bridge', blurb: 'Change coins, or bring crypto in from another network.' },
  { name: 'Kobo Pal and safety', blurb: 'Ask in plain words, and protect your account in one tap.' },
  { name: 'Grow your money', blurb: 'Put idle stablecoins to work.' },
  { name: 'Trading', blurb: 'Check a token, buy with USDC, protect your position.' },
];

export const VIDEOS: ProductVideo[] = [
  // The first three are the ones on the landing page.
  { file: 'pay-bills', title: 'Pay your light bill from your dollars', label: '💡 Pay a bill', category: 'Everyday payments', seconds: 30,
    caption: 'Meter checked by name, exact cost shown, hold to pay, token in seconds.' },
  { file: 'withdraw', title: 'Withdraw to your bank in minutes', label: '🏦 Withdraw to bank', category: 'Everyday payments', seconds: 30,
    caption: 'Type the amount, see the exact naira, check the name, hold to send.' },
  { file: 'kobo-pal', title: 'Just tell Kobo Pal', label: '✨ Kobo Pal', category: 'Kobo Pal and safety', seconds: 32,
    caption: 'Buy airtime by typing a sentence, ask a money question, freeze a lost phone.' },

  { file: 'add-money', title: 'Your first deposit', label: '➕ Add money', category: 'Getting started', seconds: 30,
    caption: 'Verify once, get your own account number, transfer from any Nigerian bank app, and it arrives as USDC.' },
  { file: 'deposit-crypto', title: 'Deposit crypto from six networks', label: '💎 Deposit crypto', category: 'Getting started', seconds: 34,
    caption: 'Your two wallets: a Solana address for USDC, USDT and SOL, and one address for Ethereum, BNB Chain, Polygon, Arbitrum and Robinhood Chain. Once it lands you can pay, withdraw, trade or earn.',
    note: 'Always check the network before anyone sends.' },
  { file: 'send-bank', title: 'Send naira to any bank account', label: '🏦 Send to bank', category: 'Everyday payments', seconds: 30,
    caption: 'Pick their bank, enter the account number, check the name, type the naira and hold to send.' },
  { file: 'swap', title: 'Swap between SOL, USDC and USDT', label: '🔄 Swap', category: 'Swap and bridge', seconds: 30,
    caption: 'Type what you pay, see what you get and the least you will receive, then hold to swap. The network fee is covered.' },
  { file: 'bridge', title: 'Bring crypto in from another chain', label: '🌉 Bridge', category: 'Swap and bridge', seconds: 32,
    caption: 'Move ETH, BNB, USDT or USDC from another chain to USDC on Solana, and track it until it arrives.',
    note: 'You see the exact fee and what will arrive before you confirm.' },
  { file: 'send', title: 'Send dollars to any wallet', label: '🌍 Send', category: 'Everyday payments', seconds: 30,
    caption: 'Paste their address, pick the network, check the first and last characters, hold to send.',
    note: 'Onchain transfers can’t be reversed. Always check the address and the network.' },
  { file: 'cashback', title: 'Spend your cashback at checkout', label: '🎁 Cashback', category: 'Everyday payments', seconds: 30,
    caption: 'Every bill, bank transfer and withdrawal earns 0.2% back. From ₦50, switch it on and pay less.' },
  { file: 'protect', title: 'Lost your phone? Freeze your account', label: '🧊 Freeze', category: 'Kobo Pal and safety', seconds: 32,
    caption: 'One tap stops all money leaving. Unfreeze with your security questions, and move to a new wallet if your recovery phrase leaked.',
    note: 'A freeze stops moves made through Kobocent. If your recovery phrase leaked, move to a new wallet.' },
  { file: 'earn', title: 'Earn on idle dollars', label: '🌱 Earn', category: 'Grow your money', seconds: 30,
    caption: 'Pick flexible or locked, stake any amount, watch earnings build every hour, withdraw with your earnings.',
    note: 'Rates can change and are not guaranteed.' },
  { file: 'trade', title: 'Check, buy and protect a token', label: '📈 Trading', category: 'Trading', seconds: 36,
    caption: 'Paste a token, see our read out of 100, buy with USDC, then protect it with the suggested levels or your own take profit and stop loss.',
    note: 'Trading is risky. This is not financial advice.' },
];

/** The three shown on the landing page. */
export const FEATURED = VIDEOS.slice(0, 3);
