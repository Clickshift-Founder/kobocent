import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArticleBody, BlogShell } from '@/components/blog/BlogShell';
import { fmtDate, getPost, listPosts, toBlocks } from '@/lib/blog';

export const revalidate = 300;
export const dynamicParams = true;

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://kobocent.com';

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return (await listPosts()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await getPost((await params).slug);
  if (!post) return { title: 'Not found — Kobocent', robots: { index: false } };
  const url = `${SITE}/blog/${post.slug}`;
  return {
    title: `${post.title} — Kobocent`,
    description: post.description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.description,
      url,
      siteName: 'Kobocent',
      type: 'article',
      publishedTime: post.publishedAt ? new Date(post.publishedAt).toISOString() : undefined,
      modifiedTime: new Date(post.updatedAt).toISOString(),
      section: post.category,
    },
    twitter: { card: 'summary_large_image', title: post.title, description: post.description },
  };
}

export default async function Article({ params }: Props) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();
  const more = (await listPosts()).filter((p) => p.slug !== post.slug).slice(0, 3);

  // Article data for search engines (schema.org).
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    datePublished: post.publishedAt ? new Date(post.publishedAt).toISOString() : undefined,
    dateModified: new Date(post.updatedAt).toISOString(),
    articleSection: post.category,
    mainEntityOfPage: `${SITE}/blog/${post.slug}`,
    image: `${SITE}/blog/${post.slug}/opengraph-image`,
    author: { '@type': 'Organization', name: 'Kobocent', url: SITE },
    publisher: { '@type': 'Organization', name: 'Kobocent', url: SITE, logo: { '@type': 'ImageObject', url: `${SITE}/icons/icon-512.png` } },
  };
  const crumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE}/blog` },
      { '@type': 'ListItem', position: 3, name: post.title, item: `${SITE}/blog/${post.slug}` },
    ],
  };

  return (
    <BlogShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, '\\u003c') }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs).replace(/</g, '\\u003c') }} />
      <article className="container-page max-w-[720px] pt-8 sm:pt-14">
        <nav aria-label="Breadcrumb" className="text-[13.5px] muted">
          <Link href="/blog" className="inline-flex items-center gap-1.5 min-h-[44px] hover:text-terracotta">
            <span aria-hidden>←</span> All articles
          </Link>
        </nav>
        <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-terracotta mt-2">{post.category}</p>
        <h1 className="h-display text-[32px] sm:text-[46px] mt-2">{post.title}</h1>
        <p className="muted text-[17px] sm:text-[19px] mt-4 leading-relaxed">{post.description}</p>
        <p className="text-[13.5px] muted mt-4 pb-6 border-b border-cream-border dark:border-night-border">
          {fmtDate(post.publishedAt)} · {post.readMinutes} min read
        </p>
        <div className="mt-7">
          <ArticleBody blocks={toBlocks(post.body)} />
        </div>

        <aside className="surface rounded-3xl p-6 sm:p-8 mt-12">
          <h2 className="h-display text-[24px]">Try it with nothing at stake</h2>
          <p className="muted mt-2 text-[15.5px]">
            Open a Kobocent account in a minute with Google or Apple, or start in practice mode with virtual funds.
          </p>
          <div className="mt-5 flex flex-col sm:flex-row gap-3">
            <Link href="/signup" className="btn-primary">Get started</Link>
            <a href="https://t.me/kobocentbot?start=practice" target="_blank" rel="noopener noreferrer" className="btn-ghost">Try practice mode</a>
          </div>
        </aside>
      </article>

      {more.length > 0 && (
        <section className="container-page max-w-[1000px] mt-14">
          <h2 className="h-display text-[24px] mb-4">Keep reading</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 [&>*]:min-w-0">
            {more.map((p) => (
              <Link key={p.slug} href={`/blog/${p.slug}`} className="group surface rounded-2xl p-5 flex flex-col gap-2 hover:border-terracotta transition-colors">
                <span className="text-[12px] font-semibold uppercase tracking-[0.12em] text-terracotta">{p.category}</span>
                <span className="font-display font-bold text-[18px] leading-snug group-hover:text-terracotta">{p.title}</span>
                <span className="text-[13px] muted mt-auto">{p.readMinutes} min read</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </BlogShell>
  );
}
