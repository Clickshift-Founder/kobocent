import { NextResponse } from 'next/server';
import { APP_ID_ANDROID } from '@/lib/appLinks';

/**
 * Android App Links verification (2026-10-24). Android checks this file when the app is installed and then opens
 * kobocent.com/app… links in the app. ANDROID_CERT_SHA256 (Vercel, comma-separated) = the SHA-256 of every key that
 * signs the app: Play Console → Test and release → App integrity → App signing key, plus the upload key (for test APKs).
 * Unset → an empty list: links keep opening in the browser.
 */
export const dynamic = 'force-dynamic';

export function GET() {
  const prints = (process.env.ANDROID_CERT_SHA256 || '').split(',').map(s => s.trim().toUpperCase()).filter(s => /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(s));
  const body = prints.length
    ? [{ relation: ['delegate_permission/common.handle_all_urls'], target: { namespace: 'android_app', package_name: APP_ID_ANDROID, sha256_cert_fingerprints: prints } }]
    : [];
  return NextResponse.json(body, { headers: { 'Cache-Control': 'public, max-age=3600' } });
}
