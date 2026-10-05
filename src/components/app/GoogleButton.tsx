'use client';
import { useEffect, useRef, useState } from 'react';

/**
 * "Continue with Google" via Google Identity Services (sign-in v2, 2026-10-05). Renders nothing until
 * NEXT_PUBLIC_GOOGLE_CLIENT_ID is set (the same client ID the backend checks as GOOGLE_CLIENT_ID).
 * Hands the ID token (credential) to onCredential; the server verifies it — never trust it here.
 */
const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

type GoogleId = {
  initialize: (o: { client_id: string; callback: (r: { credential?: string }) => void; ux_mode?: string; auto_select?: boolean }) => void;
  renderButton: (el: HTMLElement, o: Record<string, unknown>) => void;
};
declare global { interface Window { google?: { accounts?: { id?: GoogleId } } } }

let scriptPromise: Promise<void> | null = null;
function loadScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true; s.defer = true;
      s.onload = () => resolve();
      s.onerror = () => { scriptPromise = null; reject(new Error('Google sign-in could not load')); };
      document.head.appendChild(s);
    });
  }
  return scriptPromise;
}

export const googleEnabled = () => !!CLIENT_ID;

export function GoogleButton({ onCredential, text = 'continue_with' }: { onCredential: (credential: string) => void; text?: 'continue_with' | 'signin_with' | 'signup_with' }) {
  const ref = useRef<HTMLDivElement>(null);
  const cb = useRef(onCredential);
  cb.current = onCredential;
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!CLIENT_ID) return;
    let live = true;
    loadScript().then(() => {
      const id = window.google?.accounts?.id;
      if (!live || !id || !ref.current) return;
      id.initialize({ client_id: CLIENT_ID, callback: (r) => { if (r.credential) cb.current(r.credential); } });
      const width = Math.min(380, Math.max(240, ref.current.offsetWidth || 320));
      id.renderButton(ref.current, { type: 'standard', theme: 'outline', size: 'large', shape: 'pill', text, width, logo_alignment: 'center' });
    }).catch(() => setFailed(true));
    return () => { live = false; };
  }, [text]);

  if (!CLIENT_ID) return null;
  if (failed) return <p className="text-center text-[13px] muted">Google sign-in could not load — check your connection.</p>;
  return <div ref={ref} className="w-full flex justify-center min-h-[44px]" />;
}
