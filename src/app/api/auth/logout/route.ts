import { NextResponse } from 'next/server';
import { clearSessionToken } from '@/lib/server/backend';

export const dynamic = 'force-dynamic';

export async function POST() {
  clearSessionToken();
  return NextResponse.json({ ok: true });
}
