export interface FaqItem { q: string; a: string }
export interface FaqGroup { group: string; items: FaqItem[] }

export const FAQ: FaqGroup[] = [
  {
    group: 'Getting started',
    items: [
      { q: 'What exactly is Kobocent?', a: 'A financial account that runs on stablecoin rails. You can buy stablecoins with your local currency, send money to another country, pay bills at home, withdraw to a bank account, trade, and earn on what you are not using. It works on Telegram and on the web at kobocent.com, with iOS and Android apps on the way.' },
      { q: 'Do I need to already own crypto?', a: 'No. Most people start by transferring their local currency from a normal bank account, which becomes a stablecoin balance you can use immediately. If you already hold crypto, you can bring that in instead.' },
      { q: 'Do I need to understand blockchains to use this?', a: 'No. The stablecoin and the network underneath are plumbing. You see a balance, you send it somewhere, it arrives. Everything technical is handled for you, including the network fees.' },
      { q: 'Is there a way to try it without risking money?', a: 'Yes. Practice mode gives you virtual funds — $100, 1 SOL and ₦50,000 — so you can walk through every feature with nothing at stake before you fund anything real.' },
    ],
  },
  {
    group: 'Your money and your wallet',
    items: [
      { q: 'Who controls my funds?', a: 'Your keys are encrypted, and only you can trigger a transaction. Each wallet has its own onchain address that you can check on a public explorer at any time, and you can export your recovery phrase and take your funds elsewhere whenever you like.' },
      { q: 'What happens to my wallet if I lose my phone?', a: 'Your account is tied to your Google or Apple sign-in (and Telegram, if you connect it), not to a single device. Sign in again on a new device and your wallet is still there, and your app PIN protects it on every device. If the phone may be in the wrong hands, freeze your account first: one tap from any signed-in device, Telegram or Kobo Pal stops all money leaving.' },
      { q: 'Where is my recovery phrase?', a: 'Your recovery phrase is generated for you and is only ever shown to you, once, when you ask for it. We deliberately do not email it, store it in plain text, or display it on a page you might screenshot casually. Treat it the way you would treat the only key to a safe.' },
      { q: 'Is my balance really onchain?', a: 'Yes. The balance you see sits at your own onchain address, not as an entry in a ledger we owe you. The trade-off is real: an onchain transfer you authorise cannot be reversed, by us or anyone else. Check addresses carefully.' },
      { q: 'Do I get a record of my transactions?', a: 'Yes. You can download a PDF statement covering 7 days, 30 days, 90 days or everything — formatted the way a bank statement is, which makes it usable for visas, loan applications and accounting.' },
    ],
  },
  {
    group: 'Sending and spending',
    items: [
      { q: 'How do I add money?', a: 'Transfer from your Nigerian bank account and it arrives as a stablecoin balance. Dollars, Pounds and Kenyan Shillings are next. You can also send crypto in from any chain we support.' },
      { q: 'Can I pay from crypto on another chain?', a: 'Yes. Bills, bank transfers and withdrawals can be paid from USDC or USDT on any of our six chains, or from SOL, ETH, BNB or POL — choose it under “Pay from”, or split one payment across up to three balances. No bridging first.' },
      { q: 'Can I send money to someone in another country?', a: 'Yes. You hold stablecoins and send value across borders in minutes rather than days. Which local currencies can be paid out on the other side depends on the corridor — Dollars are live, with Yen, Yuan, Pounds and Shillings opening as each one is built.' },
      { q: 'How long does a bank withdrawal take?', a: 'Usually minutes. We support 200+ Nigerian banks. If something takes longer than expected it is almost always the receiving bank, not the transfer itself.' },
      { q: 'What bills can I pay?', a: 'Electricity across the major discos, airtime and data on every network, and cable TV including DStv, GOtv and Startimes. Electricity tokens are delivered to your meter immediately.' },
      { q: 'Are there hidden fees?', a: 'No. Every payment shows its fee and the exact amount before you confirm, and the network fee is on us. Every bank transfer, bill and withdrawal also earns 0.2% cashback, which you can take off your next payment on the review screen. The paid plans exist only for traders who want priority execution.' },
      { q: 'How does cashback work?', a: 'Each bank transfer, bill and withdrawal earns 0.2% back. Once it adds up to ₦50, the review screen of your next payment shows “Use cashback” — switch it on and it comes off the fee, so you pay less or receive more naira. Your receipt shows how much was used.' },
    ],
  },
  {
    group: 'Networks and funding — read this before you send',
    items: [
      { q: 'Which networks do you support?', a: 'Solana, Ethereum, BNB Chain, Polygon, Arbitrum and Robinhood Chain. You can bring funds in from any of them, and send funds back out to any of them.' },
      { q: 'What happens if I send on the wrong network?', a: 'This is the single most common way people lose crypto, anywhere, not just here. If you send on a network we do not support, or a different network than the one shown, the funds may be unrecoverable. Kobocent always displays the exact network to select before you send — match it exactly. If you are unsure, send a small test amount first.' },
      { q: 'Which network should I pick on my exchange?', a: 'Use the one shown on the deposit screen for the asset you chose. As a rough guide: ERC-20 for Ethereum, BEP-20 for BNB Chain, and the named network for Polygon, Arbitrum and Solana. Do not guess — the screen tells you.' },
      { q: 'Is my address the same on every chain?', a: 'You have one address that works across the EVM chains (Ethereum, BNB Chain, Polygon, Arbitrum, Robinhood Chain) and a separate Solana address, because Solana uses a different address format. The app shows you the right one for whichever chain you picked.' },
      { q: 'Why do I not need a gas token?', a: 'On most platforms you need to hold a separate token just to pay network fees, which traps beginners constantly. We sponsor the fee ourselves, so a wallet holding nothing but stablecoins works perfectly.' },
      { q: 'Can I move funds between chains after they arrive?', a: 'Yes, in both directions. Bridge from Ethereum, BNB Chain, Polygon, Arbitrum or Robinhood Chain into Solana, or from Solana out to any of those five — whichever chain the person or platform on the other side uses.' },
      { q: 'How long does bridging take?', a: 'Usually a few minutes. Ethereum can be slower at busy times because that is how the network behaves, not because of anything on our side.' },
    ],
  },
  {
    group: 'Earning and trading',
    items: [
      { q: 'How does staking work?', a: 'You stake stablecoins or SOL and earn up to 14% a year. Flexible staking pays 5% and can be withdrawn at any time; locking for 7, 30 or 90 days pays more. Earnings accrue to your balance every hour rather than at the end of a term.' },
      { q: 'Is the yield guaranteed?', a: 'No. Rates are variable and depend on underlying market conditions. We show the current rate clearly and it can change. Treat any yield product, here or elsewhere, as carrying risk rather than as a savings account.' },
      { q: 'What does the trading side actually do?', a: 'It scores a token on six live signals before you buy, routes your trade privately so it cannot be frontrun, and can exit automatically when a position turns using a trailing stop. You can copy wallets ranked from their real results, snipe at your price, and trade on Solana and BNB Chain. Perps are available in practice mode only — simulated, no real money.' },
      { q: 'Can the analysis guarantee I will not lose money?', a: 'No, and anyone telling you otherwise is selling something. It flags patterns associated with rug pulls and poor liquidity, which removes a category of avoidable mistakes. It cannot predict the market.' },
      { q: 'What is $SHIFT?', a: 'A usage-reward point you earn from payments, bills, withdrawals, staking and friends who start transacting, ahead of a token generation event targeted for Q2 2027. Early users earn at a 3× multiplier. It is a reward mechanism, not a security, and carries no guarantee of future value.' },
      { q: 'What is Kobo Pal?', a: 'The assistant inside Kobocent, on the web and in Telegram. Ask it in plain words — it checks your actual activity when you ask about a payment, remembers your meter and usual bank, and hands you to a person on our team when you need one. Pal VIP, unlocked with a tip, goes deeper into your spending, Earn options and Smart Picks.' },
    ],
  },
  {
    group: 'Telegram, the web app, and your account',
    items: [
      { q: 'Do Telegram and the web app share one account?', a: 'Yes, that is the whole point. One account, one balance, one history. Start something in one and finish it in the other.' },
      { q: 'I already use the Telegram bot. Do I need a new account for the web?', a: 'No. Sign up on the web with Google or Apple, then connect your Telegram in one tap — your balance and history are the same in both.' },
      { q: 'I signed up on the web first. Do I need to do anything for Telegram?', a: 'We recommend connecting it — it takes a minute, and it gives you your referral link (20% of your friends’ fees) and $SHIFT points. Kobocent shows you how right after you sign up.' },
      { q: 'Can I install this like a normal app?', a: 'Yes. Tap Download app and it installs to your home screen straight from the browser — no app store needed. Native iOS and Android apps are coming.' },
      { q: 'Is a debit card coming?', a: 'It is on the roadmap. The intent is that you hold stablecoins and spend in local currency wherever cards are accepted. We will announce it properly when it is real rather than promise a date now.' },
    ],
  },
  {
    group: 'Safety and support',
    items: [
      { q: 'What does freezing my account do?', a: 'It stops all money leaving, on every device: withdrawals, sends, bills, bridges, swaps, buying tokens, and showing your recovery phrase. Money can still come in, and any stop loss or take profit you set keeps working. Freeze from Settings, the app’s lock screen, /freeze on Telegram, or by asking Kobo Pal.' },
      { q: 'How do I unfreeze my account?', a: 'Sign in again and answer your three security questions. If you never set them or forgot them, tap Talk to a person in Kobo Pal or email support@kobocent.com: our team checks details a thief could not guess. For 24 hours after, money can only go to banks and wallets you have paid before.' },
      { q: 'What are the security questions for?', a: 'You pick three from a list. They unfreeze your account and reset a forgotten PIN. Your answers are scrambled before we store them, so nobody at Kobocent can read them, and we will never ask you for them in a message. Three wrong tries lock them for 24 hours and freeze the account as a precaution.' },
      { q: 'What happens if I enter the wrong PIN?', a: 'After two wrong tries the app tells you how many are left. After five, you must answer your security questions to continue. If you have not set them, the PIN locks for 15 minutes.' },
      { q: 'Can I use a PIN on Telegram?', a: 'Yes, it is optional and off by default. Send /pin and a scrambled keypad appears before money leaves, so nobody watching can learn your PIN.' },
      { q: 'How do I know someone contacting me is really from Kobocent?', a: 'We are building a verified associates page so you can always check. Until then: we will never DM you first asking for money, your recovery phrase, or remote access to your device. If someone does, they are not us. Check with support@kobocent.com before acting.' },
      { q: 'What if a transaction fails or gets stuck?', a: 'Email support@kobocent.com. Failed transactions generally return funds to your balance automatically. Bring the reference or transaction ID and it can be traced.' },
      { q: 'How do I get help from a real person?', a: 'Email support@kobocent.com, or open Kobo Pal in the app and tap Talk to a person. For anything involving your funds, include the reference or transaction ID.' },
    ],
  },
];
