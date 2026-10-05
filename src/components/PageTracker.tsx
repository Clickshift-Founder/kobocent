'use client';
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

/**
 * First-party analytics (2026-10-05): one anonymous page view per screen → /api/track → /ops Engagement.
 * A random id on this device (not personal data), the path, and the referring site on the first view.
 */
function anonId(): string {
  try {
    let id = window.localStorage.getItem('kc-anon');
    if (!id) { id = (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`); window.localStorage.setItem('kc-anon', id); }
    return id;
  } catch { return `tmp-${Date.now()}`; }
}

export function PageTracker() {
  const pathname = usePathname();
  const first = useRef(true);
  useEffect(() => {
    if (!pathname) return;
    const body = JSON.stringify({ anonId: anonId(), path: pathname, referrer: first.current ? document.referrer || null : null });
    first.current = false;
    try {
      if (navigator.sendBeacon) navigator.sendBeacon('/api/track', new Blob([body], { type: 'application/json' }));
      else fetch('/api/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {});
    } catch { /* never break the page */ }
  }, [pathname]);
  return null;
}
