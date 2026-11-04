import { NextResponse } from 'next/server';
import { backend } from '@/lib/server/backend';

export const dynamic = 'force-dynamic';

/** "Wasn't you? Freeze now" (2026-11-03): no session, because the owner may have lost the device. The link can only freeze. */
export async function POST(req: Request) {
  let body: { token?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }); }
  try {
    const res = await backend('/security/freeze-link', { method: 'POST', body: { token: body.token } });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(res.ok ? { ok: true } : { error: data.error || 'Could not freeze the account' }, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Kobocent is unreachable right now. Email support@kobocent.com.' }, { status: 503 });
  }
}
