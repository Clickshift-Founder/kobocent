import { NextResponse } from 'next/server';
import { backend, setSessionToken } from '@/lib/server/backend';

export const dynamic = 'force-dynamic';

/**
 * Google Sign-In → backend POST /auth/google → session cookie (sign-in v2, 2026-10-05).
 * The Google ID token is forwarded untouched; the backend verifies it with Google and our client ID.
 * The JWT never reaches the browser.
 */
export async function POST(req: Request) {
  let body: { credential?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid sign-in data' }, { status: 400 }); }
  if (!body?.credential) return NextResponse.json({ error: 'Missing Google credential' }, { status: 400 });
  try {
    const res = await backend('/auth/google', { method: 'POST', body: { credential: body.credential } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.token) return NextResponse.json({ error: data.error || 'Sign-in failed — please try again' }, { status: res.status || 401 });
    setSessionToken(data.token);
    return NextResponse.json({ account: data.account, profile: data.profile, created: !!data.created });
  } catch {
    return NextResponse.json({ error: 'Kobocent is unreachable right now — please try again in a moment' }, { status: 503 });
  }
}
