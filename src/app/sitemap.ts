import type { MetadataRoute } from 'next';
import { listPosts } from '@/lib/blog';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://kobocent.com';

// Rebuilt hourly, and at once when /ops publishes an article (POST /api/blog/revalidate).
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const posts = await listPosts();
  return [
    { url: SITE, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE}/signup`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE}/blog`, lastModified: posts[0]?.updatedAt ? new Date(posts[0].updatedAt) : now, changeFrequency: 'daily', priority: 0.8 },
    ...posts.map((p) => ({
      url: `${SITE}/blog/${p.slug}`,
      lastModified: new Date(p.updatedAt),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
    { url: `${SITE}/shift`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE}/legal`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE}/app`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
  ];
}
