'use client';
import { useEffect, useRef } from 'react';

/**
 * Keep a screen fresh without sign-out/sign-in: re-run `load` when the user comes back to the
 * tab or app (visibility/focus) and every `intervalMs` while it is visible. A payment made in
 * Telegram shows up on the web within moments.
 */
export function useLiveRefresh(load: () => unknown, intervalMs = 30_000) {
  const fn = useRef(load);
  fn.current = load;

  useEffect(() => {
    let last = Date.now();
    const run = () => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - last < 5_000) return; // ignore bursts (focus + visibility together)
      last = Date.now();
      fn.current();
    };
    const timer = window.setInterval(run, intervalMs);
    document.addEventListener('visibilitychange', run);
    window.addEventListener('focus', run);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', run);
      window.removeEventListener('focus', run);
    };
  }, [intervalMs]);
}
