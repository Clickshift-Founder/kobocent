'use client';
import { useEffect, useState } from 'react';

/**
 * 6-digit PIN entry (sign-in v2). Big keys for thumbs, works with a hardware keyboard too.
 * onComplete fires with the six digits; the parent verifies and calls reset() via `resetKey` on a miss.
 */
export function PinPad({ onComplete, busy = false, error = '', resetKey = 0, autoFocusKeyboard = true }: {
  onComplete: (pin: string) => void; busy?: boolean; error?: string; resetKey?: number; autoFocusKeyboard?: boolean;
}) {
  const [pin, setPin] = useState('');
  useEffect(() => { setPin(''); }, [resetKey]);
  useEffect(() => {
    if (pin.length === 6) onComplete(pin);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);
  useEffect(() => {
    if (!autoFocusKeyboard) return;
    const onKey = (e: KeyboardEvent) => {
      if (busy) return;
      if (/^\d$/.test(e.key)) setPin(p => (p.length < 6 ? p + e.key : p));
      else if (e.key === 'Backspace') setPin(p => p.slice(0, -1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, autoFocusKeyboard]);

  const press = (d: string) => { if (!busy) setPin(p => (p.length < 6 ? p + d : p)); };
  return (
    <div className="select-none">
      <div className="flex justify-center gap-3 my-5" aria-label={`${pin.length} of 6 digits entered`}>
        {Array.from({ length: 6 }).map((_, i) => (
          <span key={i} className={`h-3.5 w-3.5 rounded-full border-2 transition-colors ${i < pin.length ? 'bg-terracotta border-terracotta' : 'border-cream-border dark:border-night-border'} ${error ? 'animate-pulse' : ''}`} />
        ))}
      </div>
      <div className="min-h-[22px] text-center text-[13.5px] text-[#B84A40]" role="alert">{error}</div>
      <div className="grid grid-cols-3 gap-3 max-w-[300px] mx-auto mt-2">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(d => (
          <button key={d} type="button" onClick={() => press(d)} disabled={busy}
            className="h-16 rounded-2xl bg-cream-warm dark:bg-night text-[24px] font-semibold text-ink dark:text-cream-warm active:scale-95 transition disabled:opacity-50">{d}</button>
        ))}
        <span />
        <button type="button" onClick={() => press('0')} disabled={busy}
          className="h-16 rounded-2xl bg-cream-warm dark:bg-night text-[24px] font-semibold text-ink dark:text-cream-warm active:scale-95 transition disabled:opacity-50">0</button>
        <button type="button" onClick={() => setPin(p => p.slice(0, -1))} disabled={busy} aria-label="Delete"
          className="h-16 rounded-2xl text-[15px] font-semibold muted active:scale-95 transition">⌫</button>
      </div>
    </div>
  );
}
