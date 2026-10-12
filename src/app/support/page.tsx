import type { Metadata } from 'next';
import { LegalShell, SUPPORT_EMAIL } from '@/components/LegalShell';

export const metadata: Metadata = {
  title: 'Support — Kobocent',
  description: 'How to reach Kobocent support.',
};

/**
 * Support (2026-10-12): support@kobocent.com is the support channel. Telegram's "Contact support" buttons open this page,
 * because Telegram URL buttons cannot open a mailto: link.
 */
export default function SupportPage() {
  return (
    <LegalShell>
      <p className="eyebrow">Support</p>
      <h1 className="h-display text-[34px] sm:text-[44px] mt-2">We’re here to help</h1>

      <p className="mt-6">
        <a href={`mailto:${SUPPORT_EMAIL}?subject=Kobocent%20support`} className="btn-primary inline-flex items-center justify-center min-h-[48px] px-6 no-underline">Email {SUPPORT_EMAIL}</a>
      </p>

      <h2>To get the fastest answer</h2>
      <ul>
        <li>Write from the email on your account, or tell us your Telegram username.</li>
        <li>Include the reference or transaction ID from the receipt, the amount and roughly when it happened.</li>
        <li>Never send your recovery phrase or PIN — Kobocent will never ask for them.</li>
      </ul>

      <h2>In the app</h2>
      <p>Open Kobo Pal and tap <strong>Talk to a person</strong> — someone from the team replies in the same chat.</p>
    </LegalShell>
  );
}
