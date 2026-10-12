import Link from 'next/link';
import { LogoLockup } from '@/components/ui/Logo';

/**
 * Shared frame for the public policy pages (/legal, /delete-account, /shift) — 2026-10-12. Light, readable at 390 px.
 * LEGAL_ENTITY: the registered company that operates Kobocent and controls the data. Privacy law (NDPA 2023) and both app
 * stores require it to be named; set NEXT_PUBLIC_LEGAL_ENTITY to the registered name. Until then the service name is shown.
 */
export const LEGAL_ENTITY = process.env.NEXT_PUBLIC_LEGAL_ENTITY || 'Kobocent';
export const PRIVACY_EMAIL = process.env.NEXT_PUBLIC_PRIVACY_EMAIL || 'privacy@kobocent.com';
export const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@kobocent.com';

export function LegalShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-cream dark:bg-night">
      <header className="border-b border-cream-border dark:border-night-border">
        <div className="container-page flex items-center justify-between h-16">
          <Link href="/" aria-label="Kobocent home"><LogoLockup /></Link>
          <nav className="flex gap-4 text-[14px] font-semibold">
            <Link href="/legal" className="text-terracotta min-h-[44px] leading-[44px]">Legal</Link>
            <Link href="/app" className="muted min-h-[44px] leading-[44px]">Open app</Link>
          </nav>
        </div>
      </header>
      <main className="container-page max-w-[780px] py-10 sm:py-14 text-[15px] leading-relaxed text-ink dark:text-cream-warm [&_h2]:font-display [&_h2]:font-bold [&_h2]:text-[22px] [&_h2]:mt-10 [&_h2]:mb-3 [&_h3]:font-semibold [&_h3]:text-[16px] [&_h3]:mt-6 [&_h3]:mb-2 [&_p]:mb-3 [&_p]:muted [&_li]:muted [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_li]:mb-1.5 [&_a]:text-terracotta [&_a]:font-semibold">
        {children}
      </main>
    </div>
  );
}
