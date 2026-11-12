import { createHash, timingSafeEqual } from 'node:crypto';
import { revalidatePath, revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/blog/revalidate — the backend calls this when /ops publishes, edits, hides or deletes an article, so the
 * blog updates at once instead of at the next 5-minute refresh (clickbot src/api/blogApi.js makeRevalidator).
 * Signed with the shared WEB_PROXY_SECRET (server-only) in X-Kc-Proxy-Key, compared in constant time.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.WEB_PROXY_SECRET;
  const given = req.headers.get('x-kc-proxy-key') || '';
  const h = (s: string) => createHash('sha256').update(s).digest();
  if (!secret || secret.length < 24 || !given || !timingSafeEqual(h(given), h(secret))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as { slugs?: unknown };
  const slugs = Array.isArray(body.slugs) ? body.slugs.filter((s): s is string => typeof s === 'string' && /^[a-z0-9-]{1,90}$/.test(s)).slice(0, 20) : [];
  revalidateTag('blog');
  revalidatePath('/blog');
  revalidatePath('/sitemap.xml');
  for (const s of slugs) revalidatePath(`/blog/${s}`);
  return NextResponse.json({ ok: true, revalidated: slugs.length });
}
