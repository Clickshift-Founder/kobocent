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
const SESSION_MAX_AGE_S = 12 * 60 * 60; // matches the backend JWT lifetime (12h)

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
