import { NextResponse, type NextRequest } from 'next/server';

/**
 * /app/* is behind sign-in: no session cookie → /signin (and back afterwards).
 * Already signed in → /signin and /signup go straight to the app.
 */
export function middleware(req: NextRequest) {
  const signedIn = !!req.cookies.get('kc_session')?.value;
  const { pathname } = req.nextUrl;

  if (pathname.startsWith('/app') && !signedIn) {
    const url = req.nextUrl.clone();
    url.pathname = '/signin';
    url.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }
  if ((pathname === '/signin' || pathname === '/signup') && signedIn) {
    const url = req.nextUrl.clone();
    url.pathname = '/app';
    url.search = '';
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ['/app/:path*', '/signin', '/signup'] };
