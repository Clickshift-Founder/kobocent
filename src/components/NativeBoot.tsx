'use client';
import { useEffect } from 'react';
import { startNative } from '@/lib/native';

/** Inside the iOS / Android shell: back button, status bar, splash (src/lib/native.ts). Renders nothing; no-op in a browser. */
export function NativeBoot() {
  useEffect(() => {
    const theme = () => (document.documentElement.classList.contains('dark') ? 'dark' : 'light');
    startNative(theme());
    const obs = new MutationObserver(() => startNative(theme()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);
  return null;
}
