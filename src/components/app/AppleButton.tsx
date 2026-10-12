'use client';
import { useState } from 'react';

/**
 * "Continue with Apple" (2026-10-12) — App Store guideline 4.8: an app that offers Google sign-in must also offer Sign in with
 * Apple. Renders nothing until NEXT_PUBLIC_APPLE_CLIENT_ID (the Services ID) is set; the backend accepts it when the same ID is
 * in APPLE_CLIENT_IDS. Hands Apple's identity token (and, on the first sign-in only, the name) to onToken — the server verifies.
 */
const CLIENT_ID = process.env.NEXT_PUBLIC_APPLE_CLIENT_ID || '';

type AppleAuth = { init: (o: Record<string, unknown>) => void; signIn: () => Promise<{ authorization?: { id_token?: string }; user?: { name?: { firstName?: string; lastName?: string } } }> };
declare global { interface Window { AppleID?: { auth?: AppleAuth } } }

let scriptPromise: Promise<void> | null = null;
function loadScript(): Promise<void> {
  if (typeof window === 'undefined' || window.AppleID?.auth) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => { scriptPromise = null; reject(new Error('Apple sign-in could not load')); };
      document.head.appendChild(s);
    });
  }
  return scriptPromise;
}

export const appleEnabled = () => !!CLIENT_ID;

export function AppleButton({ onToken }: { onToken: (idToken: string, name: string | null) => void }) {
  const [err, setErr] = useState('');
  if (!CLIENT_ID) return null;
  async function go() {
    setErr('');
    try {
      await loadScript();
      const a = window.AppleID?.auth;
      if (!a) throw new Error('Apple sign-in could not load');
      a.init({ clientId: CLIENT_ID, scope: 'name email', redirectURI: `${window.location.origin}/signin`, usePopup: true });
      const r = await a.signIn();
      const token = r.authorization?.id_token;
      if (!token) throw new Error('Apple did not return a sign-in');
      const n = r.user?.name;
      onToken(token, n ? [n.firstName, n.lastName].filter(Boolean).join(' ') || null : null);
    } catch (e) {
      const m = e instanceof Error ? e.message : String((e as { error?: string })?.error || '');
      if (!/popup_closed|user_cancelled/i.test(m)) setErr(m || 'Apple sign-in failed — try again');
    }
  }
  return (
    <div>
      <button onClick={go} className="w-full rounded-full bg-black text-white font-semibold min-h-[44px] flex items-center justify-center gap-2 text-[15px]">
        <svg width="16" height="18" viewBox="0 0 16 18" fill="currentColor" aria-hidden><path d="M13.2 9.5c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.9-3.5.9-.7 0-1.8-.9-3-.8-1.5 0-3 .9-3.8 2.3-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.4 2.9 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3 .7c1.3 0 2.1-1.1 2.8-2.3.9-1.3 1.3-2.6 1.3-2.6s-2.5-1-2.5-3.8zM10.9 2.7c.6-.8 1.1-1.8 1-2.8-.9 0-2 .6-2.7 1.4-.6.7-1.1 1.7-1 2.7 1 .1 2-.5 2.7-1.3z" /></svg>
        Continue with Apple
      </button>
      {err && <p className="mt-2 text-center text-[13px]" style={{ color: '#B84A40' }}>{err}</p>}
    </div>
  );
}
