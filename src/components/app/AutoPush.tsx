'use client';
import { useEffect, useState } from 'react';
import { autoEnablePush, enablePush } from '@/lib/push';
import { IconBell } from './Icons';

/**
 * Notifications on by default (founder, 2026-11-16). On every app start, signed in:
 * - already allowed on this device → turned on silently (and this device re-registered with the backend);
 * - the browser still needs permission → ask ONCE with this sheet (browsers and iPhone only allow asking from a tap);
 *   "Not now" waits 7 days before asking again;
 * - turned off in Settings → never asked or turned on again by the app.
 */
const ASKED_AT = 'kc-push-asked-at';
const WAIT_MS = 7 * 24 * 60 * 60 * 1000;

export function AutoPush() {
  const [ask, setAsk] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    autoEnablePush().then((r) => {
      if (!alive || r !== 'ask') return;
      let last = 0;
      try { last = Number(localStorage.getItem(ASKED_AT) || 0); } catch { /* private mode */ }
      if (Date.now() - last > WAIT_MS) setAsk(true);
    });
    return () => { alive = false; };
  }, []);

  const later = () => {
    try { localStorage.setItem(ASKED_AT, String(Date.now())); } catch { /* private mode */ }
    setAsk(false);
  };
  const allow = async () => {
    setBusy(true);
    try { await enablePush(); } catch { /* the Settings switch shows the state */ }
    try { localStorage.setItem(ASKED_AT, String(Date.now())); } catch { /* private mode */ }
    setBusy(false);
    setAsk(false);
  };

  if (!ask) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40" role="dialog" aria-modal="true" aria-labelledby="autopush-title">
      <div className="w-full sm:max-w-[420px] rounded-t-3xl sm:rounded-3xl bg-cream dark:bg-night p-6" style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}>
        <span className="grid place-items-center h-12 w-12 rounded-2xl bg-terracotta-soft text-terracotta"><IconBell size={24} /></span>
        <h2 id="autopush-title" className="font-display font-bold text-[22px] text-ink dark:text-cream-warm mt-4">Know the moment money moves</h2>
        <p className="muted text-[15px] leading-relaxed mt-2">
          Get a notification when money arrives, a payment finishes or support replies, even when the app is closed. You can turn
          them off any time in Settings.
        </p>
        <div className="mt-5 flex flex-col gap-2.5">
          <button onClick={allow} disabled={busy} className="btn-primary w-full min-h-[48px] disabled:opacity-60">{busy ? 'Turning on…' : 'Turn on notifications'}</button>
          <button onClick={later} className="btn-ghost w-full min-h-[48px]">Not now</button>
        </div>
      </div>
    </div>
  );
}
