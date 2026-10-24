import { NextResponse } from 'next/server';
import { APP_ID_IOS, APP_LINK_PREFIXES } from '@/lib/appLinks';

/**
 * iOS Universal Links (2026-10-24). iOS downloads this when the app is installed and then opens kobocent.com/app… links
 * in the app. APPLE_TEAM_ID (Vercel) = the 10-character Team ID from developer.apple.com → Membership — known once the
 * Apple account exists. Unset → no apps listed: links keep opening in the browser.
 */
export const dynamic = 'force-dynamic';

export function GET() {
  const team = (process.env.APPLE_TEAM_ID || '').trim();
  const details = /^[A-Z0-9]{10}$/.test(team)
    ? [{ appIDs: [`${team}.${APP_ID_IOS}`], components: APP_LINK_PREFIXES.flatMap(p => [{ '/': p }, { '/': `${p}/*` }]) }]
    : [];
  return NextResponse.json({ applinks: { details } }, { headers: { 'Cache-Control': 'public, max-age=3600' } });
}
