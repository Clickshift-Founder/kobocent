import { NextRequest, NextResponse } from 'next/server';
import { backend, getSessionToken, setSessionToken, clearSessionToken } from '@/lib/server/backend';

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
};

async function handle(req: NextRequest, path: string[], method: 'GET' | 'POST') {
  const key = path.join('/');
  if (!ALLOWED[key]?.includes(method)) return NextResponse.json({ error: 'Not found' }, { status: 404 });

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

  if (res.status === 401 && !key.startsWith('wallet/recovery-phrase') && key !== 'auth/reauth') clearSessionToken();

  if (key === 'statement.pdf' && res.ok) {
    const buf = await res.arrayBuffer();
    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': res.headers.get('content-disposition') || 'attachment; filename="Kobocent-Statement.pdf"',
        'Cache-Control': 'no-store',
      },
    });
  }

  const data = await res.json().catch(() => ({}));
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
