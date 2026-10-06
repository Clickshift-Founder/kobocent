'use client';
import { useEffect, useState } from 'react';
import { pushState, enablePush, disablePush, type PushState } from '@/lib/push';
import { IconBell } from './Icons';

/** Settings → Phone notifications (2026-10-06). */
export function PushSettings() {
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => { pushState().then(setState).catch(() => setState('unsupported')); }, []);
  if (!state || state === 'off-server') return null;   // backend not ready yet

  async function toggle() {
    setBusy(true); setErr('');
    try { setState(state === 'on' ? await disablePush() : await enablePush()); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Could not change notifications'); }
    finally { setBusy(false); }
  }

  const note = state === 'on' ? 'On for this device — money in, payments done, bridges landed, replies from support.'
    : state === 'denied' ? 'Blocked in your browser settings. Allow notifications for kobocent.com, then come back.'
    : state === 'ios-install' ? 'On iPhone: tap Share → “Add to Home Screen”, open Kobocent from there, then turn this on.'
    : state === 'unsupported' ? 'This browser can’t show notifications. Try Chrome, or add Kobocent to your home screen.'
    : 'Get a notification when money arrives, a payment finishes, or support replies.';

  return (
    <section id="notifications" className="scroll-mt-20">
      <div className="eyebrow mb-2">Phone notifications</div>
      <div className="surface rounded-3xl p-5 flex items-center gap-4">
        <span className="grid place-items-center h-10 w-10 shrink-0 rounded-xl bg-terracotta-soft text-terracotta"><IconBell size={20} /></span>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-ink dark:text-cream-warm">Notifications on this device</p>
          <p className="text-[13.5px] muted leading-snug mt-0.5">{note}</p>
          {err && <p className="text-[13px] text-[#B84A40] mt-1">{err}</p>}
        </div>
        {(state === 'on' || state === 'off') && (
          <button role="switch" aria-checked={state === 'on'} aria-label="Phone notifications" onClick={toggle} disabled={busy}
            className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${state === 'on' ? 'bg-terracotta' : 'bg-cream-border dark:bg-night-border'} disabled:opacity-60`}>
            <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${state === 'on' ? 'left-7' : 'left-1'}`} />
          </button>
        )}
      </div>
    </section>
  );
}
