import type { Metadata } from 'next';
import { LegalShell, PRIVACY_EMAIL } from '@/components/LegalShell';

export const metadata: Metadata = {
  title: 'Delete your account — Kobocent',
  description: 'How to delete your Kobocent account and what happens to your data.',
};

/**
 * Account deletion — the public page both app stores ask for (Google Play: "a web link where users can request deletion";
 * Apple: deletion must be possible from inside the app — Settings → Delete account). 2026-10-12.
 */
export default function DeleteAccountPage() {
  return (
    <LegalShell>
      <p className="eyebrow">Your data</p>
      <h1 className="h-display text-[34px] sm:text-[44px] mt-2">Delete your Kobocent account</h1>

      <h2>In the app (fastest)</h2>
      <ul>
        <li>Open Kobocent → <strong>Settings</strong> → <strong>Delete account</strong>.</li>
        <li>Move your money out first (Withdraw, Send or Send to wallet). An account still holding more than $1 can’t be deleted — so nothing is lost by accident. You can also export your wallet with your recovery phrase (Settings → Recovery phrase) and use it in any other wallet.</li>
        <li>Confirm with your PIN. Deletion happens straight away.</li>
      </ul>

      <h2>By email</h2>
      <p>Can’t open the app? Email <a href={`mailto:${PRIVACY_EMAIL}?subject=Delete%20my%20Kobocent%20account`}>{PRIVACY_EMAIL}</a> from the email address on your account (or tell us your Telegram username). We verify it’s you and complete the deletion within 30 days.</p>

      <h2>What is deleted</h2>
      <ul>
        <li>Your sign-in links (Google, Telegram) and your name, email and profile details.</li>
        <li>Your PIN and security settings, saved banks, meters and phone numbers, phone-notification tokens.</li>
        <li>Kobo Pal conversations, summaries and preferences.</li>
        <li>Your stored wallet keys and recovery phrase — after this, Kobocent can never sign for that wallet again.</li>
        <li>Running automations and subscriptions are stopped; auto-renew is switched off.</li>
      </ul>

      <h2>What we must keep</h2>
      <p>Anti-money-laundering law requires us to keep records of your transactions and any identity verification for at least five years after your last transaction. They are kept separately, used only for legal and compliance purposes, and then deleted. Anything already on a public blockchain cannot be deleted by anyone.</p>
    </LegalShell>
  );
}
