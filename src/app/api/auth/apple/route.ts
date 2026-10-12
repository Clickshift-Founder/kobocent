import { NextResponse } from 'next/server';
import { backend, setSessionToken } from '@/lib/server/backend';

export const dynamic = 'force-dynamic';

/**
 * Sign in with Apple → backend POST /auth/apple → session cookie (2026-10-12, App Store guideline 4.8).
 * Apple's identity token is forwarded untouched; the backend verifies its signature against Apple's keys and our client IDs.
 */
export async function POST(req: Request) {
  let body: { idToken?: string; name?: string | null };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid sign-in data' }, { status: 400 }); }
  if (!body?.idToken) return NextResponse.json({ error: 'Missing Apple credential' }, { status: 400 });
  try {
    const res = await backend('/auth/apple', { method: 'POST', body: { idToken: body.idToken, name: body.name || null } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.token) return NextResponse.json({ error: data.error || 'Sign-in failed — please try again' }, { status: res.status || 401 });
    setSessionToken(data.token);
    return NextResponse.json({ account: data.account, profile: data.profile, created: !!data.created });
  } catch {
    return NextResponse.json({ error: 'Kobocent is unreachable right now — please try again in a moment' }, { status: 503 });
  }
}
