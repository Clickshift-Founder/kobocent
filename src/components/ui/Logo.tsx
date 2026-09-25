/**
 * The Kobocent mark: an open ring (the local kobo) connected to a
 * solid circle (the global cent). Currency-agnostic, no mascot.
 */
export function LogoMark({ size = 40, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" className={className} aria-hidden="true">
      <g transform="translate(60,60)">
        <circle cx="-14" cy="0" r="30" fill="none" stroke="currentColor" strokeWidth="9" />
        <circle cx="26" cy="0" r="20" fill="currentColor" />
        <circle cx="26" cy="0" r="6.5" className="fill-cream dark:fill-night" />
      </g>
    </svg>
  );
}

export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`font-display text-[22px] font-bold tracking-[-0.01em] ${className}`}>
      <span className="text-ink dark:text-cream-warm">Kobo</span>
      <span className="text-terracotta">cent</span>
    </span>
  );
}

export function LogoLockup({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark size={34} className="text-terracotta" />
      <Wordmark />
    </span>
  );
}
