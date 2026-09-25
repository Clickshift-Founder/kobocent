import { NextResponse } from 'next/server';

/**
 * Captures early signups so no visitor is wasted before the app is live.
 *
 * Configure ONE of these in Vercel:
 *   WAITLIST_ENDPOINT  — your own backend (recommended: api.clickshift.io/api/waitlist)
 *   WAITLIST_WEBHOOK   — a Google Apps Script / Zapier / Make webhook URL
 *
 * With neither set it still returns success and logs the entry, so the form
 * never breaks — but you will not be storing anything. Set one before launch.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const phone = String(body.phone || '').trim();
    const email = String(body.email || '').trim();
    const source = String(body.source || 'web');

    if (phone.replace(/\D/g, '').length < 8) {
      return NextResponse.json({ ok: false, error: 'invalid_phone' }, { status: 400 });
    }

    const record = {
      phone,
      email: email || null,
      source,
      created_at: Date.now(),
      user_agent: req.headers.get('user-agent') || null,
      referer: req.headers.get('referer') || null,
    };

    const target = process.env.WAITLIST_ENDPOINT || process.env.WAITLIST_WEBHOOK;

    if (target) {
      const res = await fetch(target, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.WAITLIST_SECRET ? { Authorization: `Bearer ${process.env.WAITLIST_SECRET}` } : {}),
        },
        body: JSON.stringify(record),
      });
      if (!res.ok) console.error('[waitlist] upstream rejected', res.status);
    } else {
      console.warn('[waitlist] no WAITLIST_ENDPOINT configured — entry not stored:', record.phone);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[waitlist] error', e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
