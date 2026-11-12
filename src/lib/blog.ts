import { API_BASE } from '@/lib/server/backend';

/**
 * The Kobocent blog (founder, 2026-11-13). Articles are written in /ops → Blog and served by the backend's public
 * read-only routes (clickbot src/api/blogApi.js, GET /api/blog and /api/blog/:slug). Pages rebuild every 5 minutes, and
 * at once when /ops publishes (POST /api/blog/revalidate, signed with WEB_PROXY_SECRET).
 *
 * Body format (Markdown-lite, same as the /ops preview): blank-line paragraphs, ## / ### headings, "- " and "1. " lists,
 * **bold**, *italic*, [text](https://… or /path) links and "> " callouts.
 */

export const BLOG_REVALIDATE_S = 300;
const BLOG_API = `${API_BASE.replace(/\/api\/v1$/, '')}/api/blog`;

export type PostSummary = {
  slug: string;
  title: string;
  description: string;
  category: string;
  readMinutes: number;
  publishedAt: number | null;
  updatedAt: number;
};
export type Post = PostSummary & { body: string };

async function get<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${BLOG_API}${path}`, {
      headers: { Accept: 'application/json' },
      next: { revalidate: BLOG_REVALIDATE_S, tags: ['blog'] },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null; // the blog never takes the site down: an empty list, or a 404 for one article
  }
}

export async function listPosts(): Promise<PostSummary[]> {
  return (await get<{ posts: PostSummary[] }>(''))?.posts ?? [];
}

export async function getPost(slug: string): Promise<Post | null> {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return null;
  return (await get<{ post: Post }>(`/${slug}`))?.post ?? null;
}

export const fmtDate = (ms: number | null) =>
  ms ? new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Lagos' }) : '';

/* ---------- Markdown-lite → blocks ---------- */

export type Inline = { t: 'text' | 'b' | 'i'; v: string } | { t: 'a'; v: string; href: string };
export type Block =
  | { k: 'p'; c: Inline[] }
  | { k: 'h2' | 'h3'; c: Inline[]; id: string }
  | { k: 'ul' | 'ol'; items: Inline[][] }
  | { k: 'quote'; c: Inline[] };

export function inline(text: string): Inline[] {
  const out: Inline[] = [];
  const re = /\*\*([^*]+)\*\*|\*([^*]+)\*|\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]*)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push({ t: 'text', v: text.slice(last, m.index) });
    if (m[1]) out.push({ t: 'b', v: m[1] });
    else if (m[2]) out.push({ t: 'i', v: m[2] });
    else out.push({ t: 'a', v: m[3], href: m[4] });
    last = re.lastIndex;
  }
  if (last < text.length) out.push({ t: 'text', v: text.slice(last) });
  return out;
}

const anchor = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);

export function toBlocks(body: string): Block[] {
  return body
    .replace(/\r\n?/g, '\n')
    .trim()
    .split(/\n\s*\n/)
    .map((b): Block => {
      const lines = b.split('\n');
      if (b.startsWith('### ')) return { k: 'h3', c: inline(b.slice(4)), id: anchor(b.slice(4)) };
      if (b.startsWith('## ')) return { k: 'h2', c: inline(b.slice(3)), id: anchor(b.slice(3)) };
      if (lines.every((l) => l.startsWith('> '))) return { k: 'quote', c: inline(lines.map((l) => l.slice(2)).join(' ')) };
      if (lines.every((l) => l.startsWith('- '))) return { k: 'ul', items: lines.map((l) => inline(l.slice(2))) };
      if (lines.every((l) => /^\d+\. /.test(l))) return { k: 'ol', items: lines.map((l) => inline(l.replace(/^\d+\. /, ''))) };
      return { k: 'p', c: inline(lines.join(' ')) };
    });
}
