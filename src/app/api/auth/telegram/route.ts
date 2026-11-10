import { NextResponse } from 'next/server';
import { backend, setSessionToken } from '@/lib/server/backend';

export const dynamic = 'force-dynamic';

/**
 * Telegram Login → backend POST /auth/telegram → session cookie.
 * The signed widget payload is forwarded untouched; the backend verifies it with the
 * @kobocentbot token. The JWT never reaches the browser.
 */
export async function POST(req: Request) {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid login data' }, { status: 400 });
  }
  try {
    const res = await backend('/auth/telegram', { method: 'POST', body: payload });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.token) {
      return NextResponse.json({ error: data.error || 'Sign-in failed — please try again' }, { status: res.status || 401 });
    }
    setSessionToken(data.token);
    return NextResponse.json({ account: data.account, profile: data.profile });
  } catch {
    return NextResponse.json({ error: 'Kobocent is unreachable right now — please try again in a moment' }, { status: 503 });
  }
}
