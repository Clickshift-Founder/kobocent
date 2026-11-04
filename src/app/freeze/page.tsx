'use client';
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';

/**
 * The "Wasn't you? Freeze now" page from a security email (2026-11-03). It waits for a tap, because mail scanners open
 * links by themselves. The link can only freeze; unfreezing still needs the owner's answers or our team.
 */
function Freeze() {
  const token = useSearchParams().get('t') || '';
  const [state, setState] = useState<'ask' | 'busy' | 'done'>('ask');
  const [error, setError] = useState('');
  async function freeze() {
    setState('busy'); setError('');
    try {
      const res = await fetch('/api/freeze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || 'Could not freeze the account');
      setState('done');
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not freeze the account'); setState('ask'); }
  }
  return (
    <main className="min-h-[100dvh] grid place-items-center px-4 bg-cream dark:bg-night">
      <div className="surface rounded-3xl p-6 w-full max-w-md text-center">
        <div className="text-[40px]" aria-hidden>🧊</div>
        {state === 'done' ? (
          <>
            <h1 className="font-display text-[24px] font-bold mt-2 text-ink dark:text-cream-warm">Your account is frozen</h1>
            <p className="muted text-[15px] mt-2">No money can leave it, on any device. Sign in and answer your security questions to open it again, or email support@kobocent.com.</p>
          </>
        ) : (
          <>
            <h1 className="font-display text-[24px] font-bold mt-2 text-ink dark:text-cream-warm">Freeze your account?</h1>
            <p className="muted text-[15px] mt-2">This stops all money leaving your Kobocent account, on every device, until you unfreeze it.</p>
            {error && <p role="alert" className="mt-3 text-[14px] text-[#B84A40]">{error}</p>}
            <button onClick={freeze} disabled={state === 'busy' || !token} className="w-full min-h-[52px] rounded-2xl bg-[#B84A40] text-white font-semibold text-[16px] mt-5 disabled:opacity-50">{state === 'busy' ? 'Freezing…' : 'Freeze my account'}</button>
          </>
        )}
      </div>
    </main>
  );
}

export default function FreezePage() {
  return <Suspense fallback={null}><Freeze /></Suspense>;
}
