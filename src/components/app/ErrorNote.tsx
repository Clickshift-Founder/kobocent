'use client';
import { AskPalButton } from './Pal';

/**
 * An error message on a screen, always followed by "Ask Kobo Pal" (founder, 2026-10-07): Pal gets this
 * exact message and explains what happened and what to do next. Pass the screen's own styling.
 */
export function ErrorNote({ msg, className = 'text-[14px] text-[#B84A40]' }: { msg?: string | null; className?: string }) {
  if (!msg) return null;
  return (
    <div role="alert" className={className}>
      <div>{msg}</div>
      <AskPalButton about={msg} className="-ml-1" />
    </div>
  );
}
