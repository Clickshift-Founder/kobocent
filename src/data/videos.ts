/**
 * The Kobocent films (2026-11-16). One list feeds the landing page's "See it working" section (the first three) and the
 * catalogue at /videos. Files live in /public/videos as <file>.mp4 (720×1280, under 2 MB) with a <file>.jpg poster.
 * Each is an illustrated walkthrough with example amounts. To add a film: render it (scripts/films/README.md), put the
 * two files in /public/videos, and add an entry here; the page, the sitemap and the landing section follow.
 */
export type VideoCategory = 'Everyday payments' | 'Kobo Pal and safety' | 'Grow your money' | 'Trading';

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
  { name: 'Everyday payments', blurb: 'Bills, bank withdrawals and the cashback they earn.' },
  { name: 'Kobo Pal and safety', blurb: 'Ask in plain words, and protect your account in one tap.' },
  { name: 'Grow your money', blurb: 'Put idle stablecoins to work.' },
  { name: 'Trading', blurb: 'Check a token, buy with USDC, set your exit.' },
];

export const VIDEOS: ProductVideo[] = [
  { file: 'pay-bills', title: 'Pay your light bill from your dollars', label: '💡 Pay a bill', category: 'Everyday payments', seconds: 30,
    caption: 'Meter checked by name, exact cost shown, hold to pay, token in seconds.' },
  { file: 'withdraw', title: 'Withdraw to your bank in minutes', label: '🏦 Withdraw to bank', category: 'Everyday payments', seconds: 30,
    caption: 'Type the amount, see the exact naira, check the name, hold to send.' },
  { file: 'kobo-pal', title: 'Just tell Kobo Pal', label: '✨ Kobo Pal', category: 'Kobo Pal and safety', seconds: 32,
    caption: 'Buy airtime by typing a sentence, ask a money question, freeze a lost phone.' },
  { file: 'cashback', title: 'Spend your cashback at checkout', label: '🎁 Cashback', category: 'Everyday payments', seconds: 30,
    caption: 'Every bill, bank transfer and withdrawal earns 0.2% back. From ₦50, switch it on and pay less.' },
  { file: 'earn', title: 'Earn on idle dollars', label: '🌱 Earn', category: 'Grow your money', seconds: 30,
    caption: 'Pick flexible or locked, stake any amount, watch earnings build every hour, withdraw with your earnings.',
    note: 'Rates can change and are not guaranteed.' },
  { file: 'trade', title: 'Check a token before you buy', label: '📈 Trading', category: 'Trading', seconds: 32,
    caption: 'Paste a token, see our read out of 100, buy with USDC, and set a take profit and stop loss before you enter.',
    note: 'Trading is risky. This is not financial advice.' },
];

/** The three shown on the landing page. */
export const FEATURED = VIDEOS.slice(0, 3);
