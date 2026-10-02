'use client';
import { useRouter } from 'next/navigation';

/**
 * Every screen except Home gets a back arrow (design rule — CLAUDE.md "Navigation").
 * Goes back in history when there is somewhere to go back to inside the app, otherwise to
 * `fallback` (people often land on a screen straight from a link or the installed app).
 */
export function PageHeader({ title, subtitle, fallback = '/app', action }: {
  title: string; subtitle?: string; fallback?: string; action?: React.ReactNode;
}) {
  const router = useRouter();
  function back() {
    const sameSite = typeof document !== 'undefined' && document.referrer.startsWith(window.location.origin);
    if (sameSite && window.history.length > 1) router.back();
    else router.push(fallback);
  }
  return (
    <div className="flex items-start gap-3 mb-6">
      <button onClick={back} aria-label="Go back" title="Back"
        className="shrink-0 grid place-items-center h-11 w-11 -ml-1.5 rounded-xl text-ink dark:text-cream-warm hover:bg-cream-warm dark:hover:bg-night-card transition-colors">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
      </button>
      <div className="min-w-0 flex-1 pt-1">
        <h1 className="h-display text-[26px] sm:text-[32px] leading-tight">{title}</h1>
        {subtitle && <p className="muted text-[14.5px] leading-relaxed mt-1">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0 pt-1">{action}</div>}
    </div>
  );
}
