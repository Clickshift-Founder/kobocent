export type VerticalKey = 'spending' | 'trading' | 'staking';

export interface Vertical {
  key: VerticalKey;
  icon: string;
  name: string;
  tagline: string;
  question: string;      // the user's own words, for the goal selector
  color: string;         // tailwind-safe hex, used inline for accents
  summary: string;
  features: { title: string; body: string }[];
}

export const VERTICALS: Vertical[] = [
  {
    key: 'spending',
    icon: '💳',
    name: 'Spending & Sending',
    tagline: 'Turn crypto into real-life money',
    question: 'I want to send or spend money',
    color: '#C1502E',
    summary:
      'Buy stablecoins with your local currency, send value across borders, pay bills at home, or withdraw straight to a bank account. No P2P traders, no exchange account, no waiting days.',
    features: [
      { title: 'Buy stablecoins with local currency', body: 'Fund with Naira today — Dollars, Pounds and Kenyan Shillings coming next. Money lands as USDC you can actually use.' },
      { title: 'Send across borders', body: 'Move value to someone in another country in minutes. They receive what you sent, not what a middleman decided to leave.' },
      { title: 'Withdraw to any bank', body: 'Cash out to 200+ Nigerian banks. Settlement in minutes, not days. No P2P counterparty risk.' },
      { title: 'Pay bills directly', body: 'Electricity, airtime, data, cable TV — paid from your stablecoin balance. Meter tokens arrive instantly.' },
      { title: 'Type it in plain words', body: '"Send 5000 to GTBank 0123456789" — Kobocent reads the intent, verifies the account name, and executes.' },
      { title: 'Combine USDC and USDT', body: 'One transaction can settle from both balances. No manual swapping, no bridging first.' },
    ],
  },
  {
    key: 'trading',
    icon: '📈',
    name: 'Trading',
    tagline: 'Grow what you hold',
    question: 'I want to trade',
    color: '#20211F',
    summary:
      'Full onchain trading with intelligence built in — risk scoring before you buy, automated exits while you sleep, and MEV protection so you keep what you earn.',
    features: [
      { title: 'AI risk analysis', body: 'Six live signals — RSI, buy pressure, volume surge, holder concentration, liquidity depth — into one scored verdict with the reasoning shown.' },
      { title: 'Trailing profit', body: 'Follows a run to its peak and exits automatically when price falls back by your set percentage. Works while you sleep.' },
      { title: 'Copy trading', body: 'Mirror proven wallets in real time. Set your amount once; every entry and exit fires into your wallet automatically.' },
      { title: 'Launch sniper', body: 'Instant and limit-order sniping on new launches, with take-profit and stop-loss arming automatically after execution.' },
      { title: 'MEV protection', body: 'Trades route privately instead of through the public mempool. No sandwich attacks, no frontrunning.' },
      { title: 'Perps up to 5x', body: 'Long or short with leverage, position management, and the same protection as spot.' },
    ],
  },
  {
    key: 'staking',
    icon: '🌱',
    name: 'Staking to Earn',
    tagline: 'Put idle money to work',
    question: 'I want to earn on my savings',
    color: '#9A3E22',
    summary:
      'Stablecoins sitting still earn nothing. Stake them and earn up to 14% a year, with earnings accruing to your balance every hour and no lock-up unless you choose one.',
    features: [
      { title: 'Up to 14% APY', body: 'On USDC, USDT and SOL. Flexible at 5%, or lock for 7, 30 or 90 days for higher rates.' },
      { title: 'Hourly accrual', body: 'Earnings accrue to your wallet every hour — not monthly, not at the end of a term. Watch it move.' },
      { title: 'Withdraw on your terms', body: 'Flexible staking withdraws anytime. Locked terms return principal plus yield the moment they mature.' },
      { title: 'Live dashboard', body: 'Every position, its rate, days remaining, and daily earnings — all in one view.' },
      { title: 'Earn $SHIFT alongside', body: 'Staking accumulates $SHIFT points ahead of the Q1 2027 token launch, on top of your yield.' },
      { title: 'No minimum drama', body: 'Start with what you have. The rate is the same whether you stake ten dollars or ten thousand.' },
    ],
  },
];
