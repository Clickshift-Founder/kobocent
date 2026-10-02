'use client';
import { useEffect, useRef } from 'react';
import { BOT } from '@/lib/kc';

export interface TelegramUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

declare global {
  interface Window { [key: `kcTelegramAuth_${string}`]: ((user: TelegramUser) => void) | undefined }
}

/**
 * Telegram's official Login Widget for @kobocentbot. Works only on the domain set with
 * BotFather /setdomain (kobocent.com). The signed payload is handed to `onAuth` unchanged —
 * the backend verifies the signature.
 */
export function TelegramLogin({ onAuth, size = 'large' }: { onAuth: (user: TelegramUser) => void; size?: 'large' | 'medium' }) {
  const ref = useRef<HTMLDivElement>(null);
  const cb = useRef(onAuth);
  cb.current = onAuth;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const name = `kcTelegramAuth_${Math.random().toString(36).slice(2)}` as const;
    window[name] = (user: TelegramUser) => cb.current(user);
    const s = document.createElement('script');
    s.src = 'https://telegram.org/js/telegram-widget.js?22';
    s.async = true;
    s.setAttribute('data-telegram-login', BOT);
    s.setAttribute('data-size', size);
    s.setAttribute('data-radius', '12');
    s.setAttribute('data-request-access', 'write');
    s.setAttribute('data-onauth', `window.${name}(user)`);
    el.innerHTML = '';
    el.appendChild(s);
    return () => { window[name] = undefined; el.innerHTML = ''; };
  }, [size]);

  return <div ref={ref} className="flex justify-center min-h-[48px]" />;
}
