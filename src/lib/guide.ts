// In-app product guide — every word of the tour and the feature tips lives here (2026-10-05).
//
// UPDATING THE GUIDE: when a feature ships or changes, edit its entry below and bump its `version`
// (or TOUR_VERSION for the tour). Users who already saw the old version see the new one once.
// Tour steps point at elements carrying data-tour="…"; a missing target shows the step centred.
// Wording rules (CLAUDE.md): never "non-custodial", never "bank-grade"; $SHIFT is a usage-reward point.

export const TOUR_VERSION = 2;   // 2: Kobo Pal + live support (2026-10-05)
export const tourKey = () => `tour@${TOUR_VERSION}`;

export interface TourStep { target?: string; title: string; body: string; bullets?: string[] }

export const TOUR: TourStep[] = [
  {
    title: 'Welcome to Kobocent 👋',
    body: 'Kobocent is your money app on stablecoin rails — hold digital dollars, pay anyone in naira, pay bills, earn, and move money across borders and chains. This quick tour shows you around. It takes about a minute, and you can skip it anytime.',
    bullets: ['One account on the web app and on Telegram (@kobocentbot) — same balance, same history.', 'Use the arrows below, or tap Skip to explore on your own.'],
  },
  {
    target: 'balance',
    title: 'Your balance',
    body: 'Everything you hold, in US dollars. Most of it is usually USDC or USDT — stablecoins that stay worth one dollar each.',
    bullets: ['Tap the eye to hide your balance when someone is looking over your shoulder.', 'Your balance refreshes on its own, including payments you make on Telegram.'],
  },
  {
    target: 'add-money',
    title: 'Add money',
    body: 'Two ways to bring money in, in one place.',
    bullets: [
      'Bank transfer (₦): you get your own account number. Send naira from any Nigerian bank app — it arrives as USDC in a few minutes. You verify your BVN or NIN once.',
      'Crypto: your addresses to receive USDC, USDT, SOL or ETH from any wallet or exchange.',
    ],
  },
  {
    target: 'action-send',
    title: 'Send to bank',
    body: 'Pay anyone with a Nigerian bank account straight from your balance — vendors, family, rent.',
    bullets: ['You see the exact naira amount and fee before you confirm.', 'Every payment earns 0.2% cashback and comes with a shareable receipt.'],
  },
  {
    target: 'action-wallet',
    title: 'Send to wallet',
    body: 'Send crypto to any wallet or exchange on six networks: Solana, Ethereum, BNB Chain, Polygon, Arbitrum and Robinhood Chain.',
    bullets: ['We check the address as you paste it — wrong network, typos and your own address are caught.', 'Onchain transfers can’t be reversed, so always check the first and last characters.'],
  },
  {
    target: 'action-bills',
    title: 'Pay bills',
    body: 'Airtime, data, electricity and cable TV, paid from your stablecoins in seconds.',
    bullets: ['Electricity gives you the token right away, and we remember your meters and numbers for next time.', '0.2% cashback on every bill.'],
  },
  {
    target: 'action-withdraw',
    title: 'Withdraw to bank',
    body: 'Turn USDC or USDT into naira in your own bank account, usually in minutes.',
    bullets: ['Network fees are on us; the quote shows exactly what lands in your bank.'],
  },
  {
    target: 'action-swap',
    title: 'Swap',
    body: 'Switch between SOL, USDC and USDT in seconds at the best route we can find.',
  },
  {
    target: 'action-earn',
    title: 'Earn',
    body: 'Put idle stablecoins to work. Pick a flexible plan or lock for a higher rate — earnings build every hour and you watch them grow live.',
    bullets: ['Rates are what each plan pays today and can change.', 'Withdraw your stake plus earnings when you like (locked plans: after the unlock date).'],
  },
  {
    target: 'action-bridge',
    title: 'Bridge',
    body: 'Move money between chains — bring crypto from Ethereum, BNB Chain, Polygon or Arbitrum in as USDC, or send your USDC out. You don’t need it to spend: Withdraw, Send and Bills pay from any chain.',
    bullets: ['Every fee is paid from what you bridge — you never need to buy gas first.', 'We track the transfer and message you the moment it lands.'],
  },
  {
    target: 'card',
    title: 'Kobo Card — coming soon',
    body: 'A debit card that spends your stablecoin balance anywhere cards are accepted: online shopping, subscriptions, travel, and later tap-to-pay in stores.',
  },
  {
    target: 'tab-activity',
    title: 'Activity',
    body: 'Every deposit, payment, bill, swap, transfer and bridge — from the web and from Telegram.',
    bullets: ['Tap a payment for its receipt. Tap a transfer or bridge for the explorer link — proof you sent it.'],
  },
  {
    target: 'tab-rewards',
    title: 'Rewards',
    body: 'Using Kobocent pays you back.',
    bullets: [
      '0.2% cashback on bank transfers, bills and withdrawals.',
      '$SHIFT points for using the app — climb the weekly, monthly and all-time leaderboards. ($SHIFT is a usage-reward point.)',
      'Invite friends and earn 20% of the fees they pay.',
    ],
  },
  {
    target: 'pal',
    title: 'Kobo Pal — ask anything',
    body: 'Tap Pal at the top of any screen. Ask how to do something, check on a payment, or get advice on your money — answers come with buttons that take you straight there.',
    bullets: [
      'Free answers every day.',
      'Something didn’t work? Tap “Ask Kobo Pal” under the message — Pal sees what happened and tells you what to do next.',
      'Tip Pal to unlock Pal VIP: money check-ups, Earn plans, spending insights and market deep-dives from a far more capable AI.',
      'Need a person? Tap “Talk to a person” — someone from the Kobocent team joins the chat by name.',
    ],
  },
  {
    target: 'tab-settings',
    title: 'Settings & safety',
    body: 'Your PIN, how you sign in, your recovery phrase, and this guide.',
    bullets: [
      'App PIN: asked when the app opens, after 15 minutes idle, and before payments — you can change the timing.',
      'Keep two ways to sign in (Telegram and Google) so losing one never locks you out.',
      'Back up your recovery phrase offline. Anyone with it controls your wallet.',
    ],
  },
  {
    title: 'You’re all set 🎉',
    body: 'Your keys are encrypted, and only you can trigger a transaction. Kobocent will never message you first asking for money, your PIN, your recovery phrase or a code.',
    bullets: ['Official links: kobocent.com and t.me/kobocentbot.', 'Replay this tour anytime: Settings → Product guide.'],
  },
];

export interface Tip { key: string; version: number; title: string; intro: string; steps: string[]; good: string[] }

/** First-visit tips, matched by route (longest prefix wins). */
export const TIPS: Array<{ route: string } & Tip> = [
  { route: '/app/add-money', key: 'add-money', version: 1, title: 'Adding money',
    intro: 'Bring money into Kobocent — naira from your bank, or crypto from another wallet.',
    steps: ['Bank transfer: verify your BVN or NIN once to get your own account number.', 'Send any amount from your bank app to that number. We notice it and credit USDC, usually within minutes.', 'Crypto: switch to the Crypto tab, copy the address for the right network, and send from your wallet or exchange.'],
    good: ['The estimate uses today’s rate; your USDC is priced when the transfer arrives.', 'Always match the network: Solana address for Solana, 0x address for Ethereum, BNB Chain, Polygon and Arbitrum.'] },
  { route: '/app/send-wallet', key: 'send-wallet', version: 1, title: 'Sending to a wallet',
    intro: 'Send crypto to any wallet or exchange.',
    steps: ['Pick the network first, then what to send.', 'Paste the address — we check it as you go.', 'Enter the amount and review: you see what they receive, the 1.5% fee and the network fee.', 'Tick that you checked the address, then hold to send.'],
    good: ['Onchain transfers can’t be undone. Check the first and last 6 characters.', 'Sending to an exchange? Use the deposit address for that exact network.', 'Every transfer shows in Activity with an explorer link you can share as proof.'] },
  { route: '/app/send', key: 'send', version: 2, title: 'Sending to a bank',
    intro: 'Pay any Nigerian bank account from any balance — on any chain.',
    steps: ['Choose the bank and enter the 10-digit account number — the account name appears so you know it’s right.', '“Pay from” picks the cheapest balance (USDC/USDT, SOL, or USDT, USDC, ETH, BNB, POL on other chains). Tap Change to choose.', 'Enter the naira amount, review exactly what you pay, then hold to confirm. The recipient usually gets it within minutes.'],
    good: ['No bridging — we handle the network behind the scenes.', 'You earn 0.2% cashback on every transfer.', 'Download or share the receipt as proof of payment.'] },
  { route: '/app/bills', key: 'bills', version: 2, title: 'Paying bills',
    intro: 'Airtime, data, electricity and cable TV — paid from any balance, on any chain.',
    steps: ['“Pay from” at the top picks the cheapest balance — tap Change to use ETH, BNB, SOL or stablecoins on another chain.', 'Pick the bill type, then enter the phone number, meter or smartcard — we confirm the name where the provider allows it.', 'Choose the amount or plan, review, and hold to pay.'],
    good: ['Electricity: your token shows straight away and stays in Activity.', 'We remember recent numbers, meters and cards so repeat payments take seconds.', '0.2% cashback on every bill.'] },
  { route: '/app/withdraw', key: 'withdraw', version: 2, title: 'Withdrawing to your bank',
    intro: 'Turn what you hold into naira in your own account — from any chain.',
    steps: ['Add your bank once (the account name is checked).', 'Enter the amount in dollars. “Pay from” picks the cheapest balance — USDC/USDT, SOL, or USDT, USDC, ETH, BNB and POL on Ethereum, BNB Chain, Polygon, Arbitrum or Robinhood Chain. Tap Change to choose.', 'Review exactly how much naira lands, then hold to confirm. Most withdrawals arrive within minutes.'],
    good: ['No bridging — we handle the network behind the scenes.', 'Holding only USDT/USDC on BNB Chain, Polygon or Arbitrum? We cover the network fee.', 'Your receipt is ready as soon as the bank confirms.'] },
  { route: '/app/swap', key: 'swap', version: 1, title: 'Swapping',
    intro: 'Switch between SOL, USDC and USDT.',
    steps: ['Choose what you pay with and what you receive (use the arrow to flip).', 'Enter an amount — the quote shows what you get after the fee, and the minimum you’ll receive.', 'Review and hold to swap.'],
    good: ['A little SOL stays in your wallet so payments keep working — Max leaves it for you.'] },
  { route: '/app/trade', key: 'trade', version: 4, title: 'Trading',
    intro: 'Your tokens, how each is doing, what’s moving — and buying or selling any of them.',
    steps: ['The top card shows what your tokens are worth, your open profit or loss, and what you’ve already realised.', 'Search any token by name, or paste its address, to see a live chart, our read on it and how risky its holders are.', 'Smart Picks lists tokens with strong momentum right now, scored out of 100. Tap one to see why.', 'On a token’s page, choose Buy or Sell and what you pay with or receive: USDC or USDT (no SOL needed, from $5) or SOL. Then Normal (1% fee) or, with SOL, Ultra (priority and MEV protection: +3%, or included with an Ultra subscription). Review the quote and hold to confirm.'],
    good: ['Numbers match Telegram exactly — it is the same wallet.', 'A shield means take profit, stop loss or trailing is protecting that token. Set it on the token’s page under “Protect” — it runs 24/7, and can sell into USDC so you never need SOL.', 'DCA buys over time: on a schedule or each time the price dips.', 'Signals are never guarantees — only trade what you can afford to lose.'] },
  { route: '/app/earn', key: 'earn', version: 1, title: 'Earning',
    intro: 'Grow idle stablecoins.',
    steps: ['Pick a plan: flexible (withdraw anytime) or locked (higher rate, available after the unlock date).', 'Choose USDC, USDT or SOL and an amount — you see what it earns per day, month and year.', 'Hold to stake. Watch your earnings tick up in real time.'],
    good: ['Earnings are added every hour.', 'Rates are today’s rates and can change.', 'Withdrawing returns your stake plus everything earned to your wallet.'] },
  { route: '/app/bridge', key: 'bridge', version: 1, title: 'Bridging',
    intro: 'Move money between chains.',
    steps: ['Bring in: pick the chain and coin you hold on your 0x wallet, enter an amount, and see the USDC you’ll receive.', 'Send out: pick the destination chain and coin, and send to your own 0x wallet or another address.', 'Review, hold to bridge, then follow the tracker until it lands.'],
    good: ['All fees come out of what you bridge — no gas to buy.', 'Small bridges lose a big share to fixed network costs; we show a recommended minimum.', 'Once it lands as USDC you can spend, send, withdraw, pay bills, earn or trade it.'] },
  { route: '/app/activity', key: 'activity', version: 1, title: 'Your activity',
    intro: 'Everything you do, from the web and Telegram, newest first.',
    steps: ['Switch the period at the top.', 'Tap a payment for its receipt; tap a transfer or bridge for the explorer link.', 'Download a PDF statement whenever you need one.'],
    good: ['Use “Share proof” to send someone the explorer link for a transfer.'] },
  { route: '/app/rewards', key: 'rewards', version: 1, title: 'Rewards',
    intro: 'What you earn back for using Kobocent.',
    steps: ['See your $SHIFT points, your tier and your rank on the leaderboard.', 'Copy your referral link and share it — you earn 20% of the fees your friends pay.'],
    good: ['$SHIFT is a usage-reward point. Points come from payments, bills, withdrawals, staking and friends who start transacting.'] },
  { route: '/app/card', key: 'card', version: 1, title: 'Kobo Card',
    intro: 'Coming soon: a card that spends your stablecoin balance.',
    steps: ['Keep your account verified and hold some USDC — you’ll be ready on launch day.'],
    good: ['We’ll announce it in the app and on Telegram first.'] },
  { route: '/app/settings', key: 'settings', version: 1, title: 'Settings',
    intro: 'Security, sign-in and help.',
    steps: ['App lock & sign-in: change your PIN and how long before the app locks, and whether payments ask for the PIN.', 'Add a second way to sign in so losing Telegram or Google never locks you out.', 'Show your recovery phrase to back up your wallet offline.', 'Product guide: replay the tour or bring back the feature tips.'],
    good: ['Kobocent never asks for your phrase, PIN or a code in a message.'] },
];

export const tipKey = (t: Tip) => `tip:${t.key}@${t.version}`;
export function tipFor(pathname: string): (Tip & { route: string }) | null {
  const matches = TIPS.filter(t => pathname === t.route || pathname.startsWith(`${t.route}/`) || pathname.startsWith(`${t.route}?`));
  return matches.sort((a, b) => b.route.length - a.route.length)[0] || null;
}

// ── What's new (2026-10-09) ────────────────────────────────────────────────────────────────────────────
// A one-time announcement per account for a feature that just shipped — existing users see it on their next
// visit, new users right after the tour. Seen = `new:<key>@<version>` in the same per-account guide store.
// Bump `version` to show an updated announcement again.
export interface Announcement { key: string; version: number; eyebrow: string; title: string; body: string; bullets: string[]; cta: { label: string; href: string } }
export const ANNOUNCEMENTS: Announcement[] = [
  {
    key: 'trade', version: 1, eyebrow: 'New', title: 'Trading is live on the web',
    body: 'Buy and sell tokens right here — the same wallet and the same numbers as Telegram.',
    bullets: [
      'See every token you hold, with your profit or loss in dollars and percent.',
      'Buy any token in seconds with USDC, USDT or SOL — with stablecoins you need no SOL at all.',
      'Normal or Ultra speed. Sell 25%, 50% or everything, then share your result card.',
    ],
    cta: { label: 'Open Trade', href: '/app/trade' },
  },
];
export const announcementKey = (a: Announcement) => `new:${a.key}@${a.version}`;
