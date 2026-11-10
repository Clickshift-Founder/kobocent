import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * kobocent.com/investor?key=… — the live investor page (founder, 2026-11-10: nobody should have to visit the API host).
 * The backend renders it (clickbot src/api/statsApi.js, GET /api/investor); this route fetches it server-side with
 * WEB_PROXY_SECRET and the visitor's IP, so wrong keys are limited per visitor, not per Vercel server.
 */
const API = (process.env.NEXT_PUBLIC_STATS_API || 'https://api.kobocent.com').replace(/\/+$/, '');

const HEADERS = {
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'no-store',
  'Referrer-Policy': 'no-referrer',
  'X-Robots-Tag': 'noindex, nofollow',
};

function page(status: number, message: string) {
  return new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">` +
      `<meta name="robots" content="noindex"><title>Kobocent · Investors</title></head>` +
      `<body style="margin:0;background:#F7F3EE;color:#20211F;font-family:system-ui,sans-serif;padding:40px 16px">` +
      `<p style="max-width:520px;margin:0 auto;font-size:16px;line-height:1.5">${message}</p></body></html>`,
    { status, headers: HEADERS },
  );
}

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get('key') || '';
  const secret = process.env.WEB_PROXY_SECRET;
  if (!secret) return page(503, 'The investor page is not available right now. Please try again later.');
  if (!key) return page(401, 'Access denied. Please use the link you were sent.');

  const ip = (req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for')?.split(',')[0] || '').trim();
  let res: Response;
  try {
    res = await fetch(`${API}/api/investor`, {
      headers: { 'x-api-key': key, 'X-Kc-Proxy-Key': secret, ...(ip ? { 'X-Kc-Client-Ip': ip } : {}) },
      cache: 'no-store',
      redirect: 'manual', // the backend redirects requests it can't verify back here; never follow that in a loop
    });
  } catch {
    return page(503, 'The investor page is not available right now. Please try again in a moment.');
  }
  if (res.status >= 300 && res.status < 400) return page(503, 'The investor page is not available right now. Please try again later.');
  return new Response(await res.text(), { status: res.status, headers: HEADERS });
}
