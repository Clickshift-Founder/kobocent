export interface FaqItem { q: string; a: string }
export interface FaqGroup { group: string; items: FaqItem[] }

export const FAQ: FaqGroup[] = [
  {
    group: 'Getting started',
    items: [
      { q: 'What exactly is Kobocent?', a: 'A financial account that runs on stablecoin rails. You can buy stablecoins with your local currency, send money to another country, pay bills at home, withdraw to a bank account, trade, and earn on what you are not using. It works on Telegram today and on the web as we roll the web app out.' },
      { q: 'Is this the same thing as ClickBot?', a: 'Yes. Kobocent is ClickBot, renamed. Same team, same wallets, same balances, same company (ClickShift Inc.). The old name described a trading bot, and the product outgrew that — it now handles payments, transfers, bills and savings as well as trading. Nothing was reset and nothing was lost in the rename.' },
      { q: 'Do I need to already own crypto?', a: 'No. Most people start by transferring their local currency from a normal bank account, which becomes a stablecoin balance you can use immediately. If you already hold crypto, you can bring that in instead.' },
      { q: 'Do I need to understand blockchains to use this?', a: 'No. The stablecoin and the network underneath are plumbing. You see a balance, you send it somewhere, it arrives. Everything technical is handled for you, including the network fees.' },
      { q: 'Is there a way to try it without risking money?', a: 'Yes. Practice mode gives you virtual funds — $100, 1 SOL and ₦50,000 — so you can walk through every feature with nothing at stake before you fund anything real.' },
    ],
  },
  {
    group: 'Your money and your wallet',
    items: [
      { q: 'Who controls my funds?', a: 'You do. Wallets are non-custodial, which means the keys belong to you and not to us. We cannot move your money, and you can leave at any time and take it with you.' },
      { q: 'What happens to my wallet if I lose my phone?', a: 'Your account is tied to your phone number and email, not to a single device. Sign in again on a new device and your wallet is still there. This is exactly why we ask for a real email at signup — it is your recovery route.' },
      { q: 'Where is my recovery phrase?', a: 'Your recovery phrase is generated for you and is only ever shown to you, once, when you ask for it. We deliberately do not email it, store it in plain text, or display it on a page you might screenshot casually. Treat it the way you would treat the only key to a safe.' },
      { q: 'What does non-custodial actually mean for me in practice?', a: 'It means the balance you see is genuinely yours onchain rather than an entry in our ledger that we owe you. The trade-off is real: nobody can freeze your funds, but nobody can reverse a transaction you authorised either. Check addresses carefully.' },
      { q: 'Do I get a record of my transactions?', a: 'Yes. You can download a PDF statement covering 7 days, 30 days, 90 days or everything — formatted the way a bank statement is, which makes it usable for visas, loan applications and accounting.' },
    ],
  },
  {
    group: 'Sending and spending',
    items: [
      { q: 'How do I add money?', a: 'Transfer from your Nigerian bank account and it arrives as a stablecoin balance. Dollars, Pounds and Kenyan Shillings are next. You can also send crypto in from any chain we support.' },
      { q: 'Can I send money to someone in another country?', a: 'Yes. You hold stablecoins and send value across borders in minutes rather than days. Which local currencies can be paid out on the other side depends on the corridor — Dollars are live, with Yen, Yuan, Pounds and Shillings opening as each one is built.' },
      { q: 'How long does a bank withdrawal take?', a: 'Usually minutes. We support 200+ Nigerian banks. If something takes longer than expected it is almost always the receiving bank, not the transfer itself.' },
      { q: 'What bills can I pay?', a: 'Electricity across the major discos, airtime and data on every network, and cable TV including DStv, GOtv and Startimes. Electricity tokens are delivered to your meter immediately.' },
      { q: 'Are there hidden fees?', a: 'No. Sending, spending, saving and earning are free of platform charges beyond the network cost, which we sponsor. The paid tiers exist only for high-frequency traders who want priority execution. Every transaction also returns 0.2% cashback.' },
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
      { q: 'Can I move funds between chains after they arrive?', a: 'Yes, in both directions. You can bring crypto in from any supported chain, and you can bridge your balance out to whichever chain the person or platform on the other side uses.' },
      { q: 'How long does bridging take?', a: 'Usually a few minutes. Ethereum can be slower at busy times because that is how the network behaves, not because of anything on our side.' },
    ],
  },
  {
    group: 'Earning and trading',
    items: [
      { q: 'How does staking work?', a: 'You stake stablecoins or SOL and earn up to 14% a year. Flexible staking pays 5% and can be withdrawn at any time; locking for 7, 30 or 90 days pays more. Earnings accrue to your balance every hour rather than at the end of a term.' },
      { q: 'Is the yield guaranteed?', a: 'No. Rates are variable and depend on underlying market conditions. We show the current rate clearly and it can change. Treat any yield product, here or elsewhere, as carrying risk rather than as a savings account.' },
      { q: 'What does the trading side actually do?', a: 'It scores a token on six live signals before you buy, routes your trade privately so it cannot be frontrun, and can exit automatically when a position turns using a trailing stop. You can also copy proven wallets and trade perps.' },
      { q: 'Can the analysis guarantee I will not lose money?', a: 'No, and anyone telling you otherwise is selling something. It flags patterns associated with rug pulls and poor liquidity, which removes a category of avoidable mistakes. It cannot predict the market.' },
      { q: 'What is $SHIFT?', a: 'A usage-reward point accumulated when you transact, ahead of a token generation event targeted for Q1 2027. Early users earn at a 3× multiplier. It is a reward mechanism, not a security, and carries no guarantee of future value.' },
    ],
  },
  {
    group: 'Telegram, the web app, and your account',
    items: [
      { q: 'Do Telegram and the web app share one account?', a: 'Yes, that is the whole point. One account, one balance, one history. Start something in one and finish it in the other.' },
      { q: 'I already use the Telegram bot. Do I need a new account for the web?', a: 'No. You link the two with a one-time code, and they become the same account. Your balance and history carry over — there is nothing to migrate manually.' },
      { q: 'I signed up on the web first. Do I need to do anything for Telegram?', a: 'Only if you want to use Telegram too. If you do, generate a link code in the web app and send it to the bot once. Otherwise the web app works on its own.' },
      { q: 'Why is the bot handle changing?', a: 'The rename from ClickBot to Kobocent means a new bot, @kobocentbot, because Telegram does not allow a bot username to be changed once taken. Both bots run against the same backend during the transition, so your account works identically on either one while you move across.' },
      { q: 'Can I install this like a normal app?', a: 'Yes. Tap Download app and it installs to your home screen straight from the browser — no app store needed. Native iOS and Android apps are coming.' },
      { q: 'Is a debit card coming?', a: 'It is on the roadmap. The intent is that you hold stablecoins and spend in local currency wherever cards are accepted. We will announce it properly when it is real rather than promise a date now.' },
    ],
  },
  {
    group: 'Safety and support',
    items: [
      { q: 'How do I know someone contacting me is really from Kobocent?', a: 'We are building a verified associates page so you can always check. Until then: we will never DM you first asking for money, your recovery phrase, or remote access to your device. If someone does, they are not us. Verify in the community group before acting.' },
      { q: 'What if a transaction fails or gets stuck?', a: 'Contact support in the community group. Failed transactions generally return funds to your balance automatically. Bring the reference or transaction ID and it can be traced.' },
      { q: 'How do I get help from a real person?', a: 'The community group is monitored and the team responds there. For anything involving your funds specifically, that is the fastest route.' },
    ],
  },
];
