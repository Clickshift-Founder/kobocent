import { cookies } from 'next/headers';

/**
 * Server-side bridge to the Kobocent backend (clickbot repo, /api/v1 — contract in
 * ../clickbot/API.md). The browser never calls the backend directly and never sees the
 * session token: it lives in an httpOnly cookie on kobocent.com and is attached here.
 */
export const API_BASE = (
  process.env.KOBOCENT_API_BASE ||
  process.env.NEXT_PUBLIC_API_BASE ||
  'https://api.clickshift.io/api/v1'
).replace(/\/+$/, '');

export const SESSION_COOKIE = 'kc_session';
const SESSION_MAX_AGE_S = 7 * 24 * 60 * 60; // matches the backend JWT lifetime (7 days)
const REFRESH_AFTER_S   = 24 * 60 * 60;     // renew a token once it is a day old

/** True when the backend's 401 means the session itself is gone (not some other 401). */
export function isSessionError(status: number, data: unknown): boolean {
  if (status !== 401) return false;
  const msg = data && typeof data === 'object' && 'error' in data ? String((data as { error: unknown }).error) : '';
  return /session expired|sign in required|account not found/i.test(msg);
}

/**
 * Sliding session: when the token is over a day old, swap it for a fresh 7-day one so active
 * users stay signed in. Best effort — a failure here never breaks the request.
 */
export async function maybeRefreshSession(token: string) {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1] || '', 'base64url').toString('utf8')) as { iat?: number };
    if (!payload.iat || Date.now() / 1000 - payload.iat < REFRESH_AFTER_S) return;
    const res = await backend('/auth/refresh', { method: 'POST', token, body: {} });
    if (!res.ok) return;
    const data = (await res.json().catch(() => ({}))) as { token?: string };
    if (data.token) setSessionToken(data.token);
  } catch { /* keep the current token */ }
}

export function getSessionToken(): string | null {
  return cookies().get(SESSION_COOKIE)?.value || null;
}

export function setSessionToken(token: string) {
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_S,
  });
}

export function clearSessionToken() {
  cookies().set(SESSION_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
}

export async function backend(
  path: string,
  init: { method?: string; body?: unknown; token?: string | null; headers?: Record<string, string> } = {},
): Promise<Response> {
  const headers: Record<string, string> = { Accept: 'application/json', ...(init.headers || {}) };
  if (init.body !== undefined) headers['Content-Type'] = 'application/json';
  if (init.token) headers.Authorization = `Bearer ${init.token}`;
  return fetch(`${API_BASE}${path.startsWith('/') ? path : `/${path}`}`, {
    method: init.method || 'GET',
    headers,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    cache: 'no-store',
  });
}
