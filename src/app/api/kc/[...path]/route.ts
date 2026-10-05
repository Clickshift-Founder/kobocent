import { NextRequest, NextResponse } from 'next/server';
import { backend, getSessionToken, setSessionToken, clearSessionToken, isSessionError, maybeRefreshSession } from '@/lib/server/backend';

export const dynamic = 'force-dynamic';

/**
 * Authenticated proxy: /api/kc/<path> → backend /api/v1/<path> with the session cookie
 * attached as a Bearer token. Only the routes the web app uses are allowed.
 */
const ALLOWED: Record<string, Array<'GET' | 'POST'>> = {
  'me': ['GET'],
  'wallet': ['GET'],
  'wallet/addresses': ['GET'],
  'history': ['GET'],
  'shift': ['GET'],
  'statement.pdf': ['GET'],
  'wallet/import': ['POST'],
  'wallet/create': ['POST'],
  'link/telegram-code': ['POST'],
  'auth/link': ['POST'],
  'auth/reauth': ['POST'],
  'wallet/recovery-phrase': ['GET'],
  'withdraw': ['GET', 'POST'],
  'withdraw/banks': ['GET'],
  'withdraw/resolve': ['POST'],
  'withdraw/bank': ['POST'],
  'withdraw/quote': ['POST'],
  'bills': ['GET'],
  'bills/network': ['POST'],
  'bills/verify': ['POST'],
  'bills/quote': ['POST'],
  'bills/pay': ['POST'],
  'bills/plans': ['GET'],   // data plans / cable packages (was missing → "Not found")
  'bills/recent': ['GET'],  // remembered meters, phones, smartcards (was missing → no Recent row)
  'onramp': ['GET'],
  'onramp/quote': ['POST'],
  'onramp/account': ['POST'],
  'onramp/kyc': ['POST'],
  'send': ['GET'],
  'send/quote': ['POST'],
  'send/pay': ['POST'],
  'swap': ['GET'],
  'swap/quote': ['POST'],
  'swap/execute': ['POST'],
  'earn': ['GET'],
  'earn/deposit': ['POST'],
  'earn/withdraw': ['POST'],
  'transfer': ['GET'],
  'transfer/address': ['POST'],
  'transfer/quote': ['POST'],
  'transfer/send': ['POST'],
  'bridge': ['GET'],
  'bridge/quote': ['POST'],
  'bridge/execute': ['POST'],
  'bridge/orders': ['GET'],
};
// Routes with an id in the path.
const ALLOWED_PATTERNS: Array<{ re: RegExp; methods: Array<'GET' | 'POST'> }> = [
  { re: /^withdraw\/jobs\/[0-9a-f-]{36}$/, methods: ['GET'] },
  { re: /^receipts\/(withdrawal|utility|bill)\/[A-Za-z0-9_-]{4,100}$/, methods: ['GET'] },
  { re: /^bills\/jobs\/[0-9a-f-]{36}$/, methods: ['GET'] },
  { re: /^(send|swap|earn|transfer|bridge)\/jobs\/[0-9a-f-]{36}$/, methods: ['GET'] },
  { re: /^bridge\/orders\/0x[0-9a-fA-F]{64}$/, methods: ['GET'] },
];
function allowed(key: string, method: 'GET' | 'POST') {
  return !!ALLOWED[key]?.includes(method) || ALLOWED_PATTERNS.some(p => p.re.test(key) && p.methods.includes(method));
}

async function handle(req: NextRequest, path: string[], method: 'GET' | 'POST') {
  const key = path.join('/');
  if (!allowed(key, method)) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const token = getSessionToken();
  if (!token) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });

  const qs = req.nextUrl.search || '';
  const headers: Record<string, string> = {};
  const reauth = req.headers.get('x-reauth-token');
  if (reauth) headers['X-Reauth-Token'] = reauth;

  let body: unknown;
  if (method === 'POST') body = await req.json().catch(() => ({}));

  let res: Response;
  try {
    res = await backend(`/${key}${qs}`, { method, body, token, headers });
  } catch {
    return NextResponse.json({ error: 'Kobocent is unreachable right now — please try again in a moment' }, { status: 503 });
  }

  if (res.ok) await maybeRefreshSession(token);

  // Files (statement PDF, receipt PNG) pass straight through.
  const isFile = key === 'statement.pdf' || key.startsWith('receipts/');
  if (isFile && res.ok) {
    const buf = await res.arrayBuffer();
    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': res.headers.get('content-type') || (key === 'statement.pdf' ? 'application/pdf' : 'image/png'),
        'Content-Disposition': res.headers.get('content-disposition') || 'attachment; filename="Kobocent-Statement.pdf"',
        'Cache-Control': 'no-store',
      },
    });
  }

  const data = await res.json().catch(() => ({}));
  // Clear the cookie only when the backend says the session itself is gone — never for a
  // 401 from the recovery-phrase re-auth gate or anything else.
  if (isSessionError(res.status, data) && !key.startsWith('wallet/recovery-phrase') && key !== 'auth/reauth') clearSessionToken();
  // Linking may move the session to another account — keep the new token server-side only.
  if (data && typeof data === 'object' && 'token' in data && typeof data.token === 'string') {
    if (key === 'auth/link') setSessionToken(data.token);
    delete (data as { token?: string }).token;
  }
  return NextResponse.json(data, { status: res.status, headers: { 'Cache-Control': 'no-store' } });
}

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  return handle(req, params.path, 'GET');
}

export async function POST(req: NextRequest, { params }: { params: { path: string[] } }) {
  return handle(req, params.path, 'POST');
}
