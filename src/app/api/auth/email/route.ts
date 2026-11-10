import { NextResponse } from 'next/server';
import { backend, setSessionToken } from '@/lib/server/backend';

export const dynamic = 'force-dynamic';

/**
 * Sign in with an email code (2026-11-03). action 'start' sends the code; 'verify' checks it and sets the session cookie.
 * The JWT never reaches the browser.
 */
export async function POST(req: Request) {
  let body: { action?: string; email?: string; code?: string; mode?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid sign-in data' }, { status: 400 }); }
  try {
    if (body.action === 'start') {
      const res = await backend('/auth/email/start', { method: 'POST', body: { email: body.email } });
      const data = await res.json().catch(() => ({}));
      return NextResponse.json(res.ok ? { ok: true } : { error: data.error || 'We could not send the email' }, { status: res.status });
    }
    const res = await backend('/auth/email/verify', { method: 'POST', body: { email: body.email, code: body.code, mode: body.mode === 'signin' ? 'signin' : undefined } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.token) return NextResponse.json({ error: data.error || 'Sign-in failed — please try again', code: data.code }, { status: res.status === 200 ? 502 : res.status });
    await setSessionToken(data.token);
    return NextResponse.json({ account: data.account, profile: data.profile, created: !!data.created });
  } catch {
    return NextResponse.json({ error: 'Kobocent is unreachable right now — please try again in a moment' }, { status: 503 });
  }
}
