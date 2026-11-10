import { NextResponse } from 'next/server';
import { backend, getSessionToken } from '@/lib/server/backend';

export const dynamic = 'force-dynamic';

/**
 * First-party page-view counter for /ops → Engagement (2026-10-05). Forwards { anonId, path, referrer }
 * to the backend; adds the session when signed in so we can count web users. Never blocks the page.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const token = getSessionToken();
    await backend('/events', {
      method: 'POST',
      body: { anonId: body.anonId, path: body.path, referrer: body.referrer },
      ...(token ? { token } : {}),
      headers: { 'User-Agent': req.headers.get('user-agent') || '' },
    }).catch(() => null);
  } catch { /* ignore */ }
  return new NextResponse(null, { status: 204 });
}
