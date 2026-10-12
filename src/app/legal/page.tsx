import type { Metadata } from 'next';
import { LegalShell, LEGAL_ENTITY, PRIVACY_EMAIL, SUPPORT_EMAIL } from '@/components/LegalShell';

export const metadata: Metadata = {
  title: 'Privacy, Terms & Risk — Kobocent',
  description: 'Kobocent Privacy Policy, Terms of Service and Risk Disclosure.',
};

const UPDATED = '12 October 2026';

/**
 * Privacy Policy, Terms of Service and Risk Disclosure (2026-10-12). Replaces the old page on the API domain. Covers the web
 * and mobile apps and Telegram, Google / Telegram sign-in, the app PIN, wallets on several chains, trading (Solana, BNB Chain),
 * premium subscriptions and auto-renew, Kobo Pal (AI), phone notifications and account deletion. Language rules (CLAUDE.md):
 * custodial, honestly described; no "bank-grade"; $SHIFT is a usage-reward point.
 */
export default function LegalPage() {
  return (
    <LegalShell>
      <p className="eyebrow">Legal</p>
      <h1 className="h-display text-[34px] sm:text-[44px] mt-2">Privacy, Terms &amp; Risk</h1>
      <p className="mt-3">Last updated {UPDATED}. These documents apply to Kobocent on the web, on mobile and on Telegram (@kobocentbot).</p>
      <nav className="mt-6 flex flex-wrap gap-2 [&_a]:rounded-full [&_a]:border [&_a]:border-cream-border dark:[&_a]:border-night-border [&_a]:px-4 [&_a]:py-2 [&_a]:min-h-[44px] [&_a]:inline-flex [&_a]:items-center">
        <a href="#privacy">Privacy Policy</a><a href="#terms">Terms of Service</a><a href="#risk">Risk Disclosure</a><a href="/delete-account">Delete your account</a>
      </nav>

      {/* ───────────────────────────── PRIVACY ───────────────────────────── */}
      <h2 id="privacy">Privacy Policy</h2>
      <h3>1. Who we are</h3>
      <p>Kobocent (&quot;Kobocent&quot;, &quot;we&quot;, &quot;us&quot;) is a financial app on stablecoin rails: buy and hold digital dollars, pay people and bills, withdraw to a bank, trade digital assets and earn yield. The service is operated by {LEGAL_ENTITY}, the controller of your personal data. Contact: <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a>.</p>

      <h3>2. What we collect</h3>
      <ul>
        <li><strong>Sign-in data.</strong> If you sign in with Telegram: your Telegram user ID, username, name and profile photo link. If you sign in with Google: your name, email address and Google account identifier. We never see your Telegram or Google password.</li>
        <li><strong>Security data.</strong> A scrambled (hashed) copy of your app PIN, your security settings, and records of sensitive actions such as viewing your recovery phrase.</li>
        <li><strong>Wallets.</strong> The onchain wallets created for you (Solana and an EVM &quot;0x&quot; wallet used on Ethereum, BNB Chain, Polygon, Arbitrum and Robinhood Chain): public addresses, balances and transaction history, and your private keys and recovery phrase, which are stored encrypted. Blockchain activity is public by nature and cannot be deleted by anyone.</li>
        <li><strong>Payments and transactions.</strong> Amounts, rates, fees, references, status and time of every trade, transfer, bill, withdrawal, deposit, bridge and subscription; for bills, the meter, smartcard or phone number you enter and the customer name returned; for bank transfers, the recipient&apos;s bank, account number and name.</li>
        <li><strong>Identity verification (KYC).</strong> When needed to give you a bank account for deposits: your BVN or NIN, name and date of birth, stored encrypted.</li>
        <li><strong>Kobo Pal.</strong> What you write to Kobo Pal (our AI assistant), its answers, short summaries of past conversations and preferences it learns, so it can help you better.</li>
        <li><strong>Device and usage.</strong> App events (screens opened, errors), approximate country, device type, and — if you allow them — a phone notification token.</li>
        <li><strong>Referrals.</strong> Who invited you, whom you invited, and the commissions earned.</li>
      </ul>

      <h3>3. Why we use it</h3>
      <ul>
        <li>To provide what you ask for: run your payments, trades, automations (take profit, stop loss, DCA, copy trading, snipes), subscriptions and withdrawals.</li>
        <li>To keep your account safe: sign-in, PIN checks, fraud and abuse detection.</li>
        <li>To meet legal duties, including anti-money-laundering and counter-terrorism-financing rules, tax and record-keeping obligations, and lawful requests from authorities.</li>
        <li>To support you, including by a person from our team when you ask Kobo Pal to &quot;Talk to a person&quot;.</li>
        <li>To send receipts, alerts and service messages (in the app, by phone notification, on Telegram, or by email).</li>
        <li>To improve Kobocent using aggregated statistics. We do not sell your personal data and do not use it for third-party advertising.</li>
      </ul>

      <h3>4. Who we share it with</h3>
      <p>Only what each one needs to do its job, under contract:</p>
      <ul>
        <li>Licensed payment partners in Nigeria (naira deposits and bank payouts) and a licensed bill-payment aggregator (airtime, data, electricity, cable TV).</li>
        <li>Blockchain networks and infrastructure: Solana and EVM networks, RPC node providers, swap and bridge routers (e.g. Jupiter, KyberSwap, deBridge), market-data and token-safety services (e.g. DexScreener, GeckoTerminal, GoPlus, rugcheck). Your wallet address is visible to these services and on the public blockchain.</li>
        <li>Anthropic (Claude), which processes Kobo Pal messages to produce answers. It does not use them to train its models under our agreement.</li>
        <li>Sign-in providers (Telegram, Google), notification services (Web Push, Apple and Google push services), our hosting providers (cloud servers in the EU and the hosting platform for the web app).</li>
        <li>Authorities, when the law or a valid order requires it.</li>
      </ul>

      <h3>5. How long we keep it</h3>
      <p>Transaction records and identity verification data are kept for at least five years after your last transaction, as anti-money-laundering law requires. Usage logs are kept for up to 180 days. Kobo Pal conversation summaries are kept while your account is open. When you delete your account we delete or anonymise everything else (see <a href="/delete-account">Delete your account</a>).</p>

      <h3>6. Security</h3>
      <p>Private keys, recovery phrases and identity numbers are encrypted at rest; access to production systems is restricted; the app is protected by your PIN and sign-in. No system is perfectly secure. If a breach affects your data we will tell you and the Nigeria Data Protection Commission as the law requires.</p>

      <h3>7. Your rights</h3>
      <p>Under the Nigeria Data Protection Act 2023 (and similar laws where you live) you can ask to access, correct or delete your data, object to or restrict some processing, withdraw consent, and ask for a copy in a portable format. Write to <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a>; we answer within 30 days. You can also complain to the Nigeria Data Protection Commission (ndpc.gov.ng). You can delete your account yourself in Settings → Delete account.</p>

      <h3>8. Children</h3>
      <p>Kobocent is for adults (18+). We do not knowingly serve or collect data from anyone younger.</p>

      <h3>9. Changes</h3>
      <p>We will tell you in the app before material changes take effect.</p>

      {/* ───────────────────────────── TERMS ───────────────────────────── */}
      <h2 id="terms">Terms of Service</h2>
      <h3>1. The agreement</h3>
      <p>These terms are between you and {LEGAL_ENTITY} (&quot;Kobocent&quot;) and cover Kobocent on the web, on mobile and on Telegram. By creating an account or using Kobocent you agree to them, to the Privacy Policy and to the Risk Disclosure.</p>
      <h3>2. Who can use Kobocent</h3>
      <ul>
        <li>You are at least 18 and can enter a binding contract.</li>
        <li>You are not barred by law from using digital-asset services where you live, and not subject to sanctions.</li>
        <li>You give true information and keep one account for yourself only.</li>
      </ul>
      <h3>3. What Kobocent provides</h3>
      <p>Holding and sending stablecoins and other digital assets; naira deposits and bank withdrawals through licensed partners; bill payments; swaps and bridges; trading of digital assets on supported chains (with optional automation: take profit, stop loss, trailing, DCA, buy at a price, copy trading); premium subscriptions; earn products; Kobo Pal, an AI assistant; and rewards ($SHIFT is a usage-reward point, not a token with value). Features may change or be withdrawn, and some are not available everywhere.</p>
      <h3>4. Your wallet</h3>
      <p>Kobocent creates onchain wallets for you. Your private keys are stored encrypted on our systems and used to sign the transactions you start: your keys are encrypted, and only you can trigger a transaction. This means you depend on our systems to reach your funds. You can view your recovery phrase in Settings (after re-confirming who you are) and use it in another wallet at any time. Keep your sign-in methods, your PIN and your recovery phrase private; anyone with your recovery phrase controls your funds.</p>
      <h3>5. Fees</h3>
      <p>Fees are shown before you confirm (for example 1% on trades, the fee on withdrawals and payments, and any network fee). Subscription prices and what they include are shown before you pay.</p>
      <h3>6. Subscriptions and auto-renew</h3>
      <p>Premium plans (for example Ultra, Copy Pro, Sniper Pro and Kobocent Pro) last the period shown. Auto-renew is optional: when it is on, the plan is renewed after it ends using stablecoins (or SOL) in your Kobocent wallet, and you are told each time. You can turn it off at any time. Payments for periods already started are not refunded, except where the law requires. On iOS and Android, subscriptions bought through the App Store or Google Play follow their billing and refund rules.</p>
      <h3>7. Automation</h3>
      <p>Automations run on our servers and act on market prices when they are checked; fast markets can move past a level before an order fills, an order can fail (for example for lack of liquidity), and copy trading follows another wallet&apos;s trades, which may lose money. You stay responsible for what you set up.</p>
      <h3>8. Your responsibilities</h3>
      <ul>
        <li>Use Kobocent lawfully; only use funds that are yours and lawfully obtained.</li>
        <li>Check recipient details, addresses and networks before confirming; onchain transfers cannot be reversed.</li>
        <li>Do not abuse, attack or try to get around Kobocent&apos;s security or limits, or manipulate markets.</li>
        <li>Meet your own tax obligations.</li>
      </ul>
      <h3>9. Finality and refunds</h3>
      <p>Confirmed transactions are final. If you are charged and a bill, bank payment or service is provably not delivered because of an error on our side or a partner&apos;s, contact us within 7 days with the reference and we will investigate and, where due, credit your Kobocent wallet.</p>
      <h3>10. Suspension and closure</h3>
      <p>We may suspend or close accounts for breaches of these terms, suspected fraud or crime, failed verification, or a legal order. You can close your account at any time (<a href="/delete-account">how</a>); move your funds out first.</p>
      <h3>11. Liability</h3>
      <p>To the extent the law allows, we are not liable for market losses, failures of third-party protocols, networks or partners, losses caused by your account being accessed with your credentials, or indirect losses. Where liability cannot be excluded, it is limited to the fees you paid us in the 90 days before the event.</p>
      <h3>12. Disputes and law</h3>
      <p>Contact <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> first and give us 30 days to resolve it. These terms are governed by the laws of the Federal Republic of Nigeria; unresolved disputes go to arbitration in Abuja under the Arbitration and Mediation Act 2023.</p>

      {/* ───────────────────────────── RISK ───────────────────────────── */}
      <h2 id="risk">Risk Disclosure</h2>
      <p><strong>You can lose money. Only use what you can afford to lose.</strong></p>
      <ul>
        <li><strong>Prices.</strong> Digital assets are volatile; new and meme tokens often lose most or all of their value. Stablecoins can lose their dollar peg or be frozen by their issuer.</li>
        <li><strong>Signals are not advice.</strong> Smart Picks, analysis, suggested levels, Smart Money alerts and Alpha wallet rankings read market data. They are never recommendations or guarantees, and past results do not predict future ones.</li>
        <li><strong>Protocols and networks.</strong> Smart contracts can fail or be exploited; networks can congest or halt; a contract check (honeypot, tax, rug flags) reduces but never removes risk.</li>
        <li><strong>Custody.</strong> Your access depends on Kobocent&apos;s systems and security. Balances are not bank deposits and are not insured by the NDIC or any deposit scheme.</li>
        <li><strong>Practice perps.</strong> Perpetual futures in Kobocent are practice mode only — no real money is traded.</li>
        <li><strong>Earn.</strong> Rates change and are not guaranteed; locked plans cannot be withdrawn before they unlock.</li>
        <li><strong>Regulation.</strong> Rules for digital assets change; we may have to change, limit or stop services, or freeze funds, if the law requires.</li>
      </ul>
      <p className="mt-8 text-[13px]">Questions: <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> · Privacy: <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a> · <a href="https://t.me/kobocentbot">t.me/kobocentbot</a></p>
    </LegalShell>
  );
}
