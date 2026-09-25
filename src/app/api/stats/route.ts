import { NextResponse } from 'next/server';

const API = process.env.NEXT_PUBLIC_STATS_API || 'https://api.clickshift.io';

/**
 * Server-side proxy to the platform stats API.
 * Keeps the browser off a cross-origin call and lets us cache briefly.
 */
export const revalidate = 60;

export async function GET() {
  try {
    const res = await fetch(`${API}/api/stats/live`, { next: { revalidate: 60 } });
    if (!res.ok) return NextResponse.json({ ok: false }, { status: 200 });
    const data = await res.json();
    return NextResponse.json({ ok: true, data });
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
