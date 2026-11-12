import type { Metadata } from 'next';
import Link from 'next/link';
import { BlogShell } from '@/components/blog/BlogShell';
import { fmtDate, listPosts } from '@/lib/blog';

export const revalidate = 300;

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://kobocent.com';

export const metadata: Metadata = {
  title: 'Blog — Kobocent',
  description:
    'Plain-language guides to stablecoins and everyday money: withdrawing to your bank, paying bills, sending money across borders and keeping your account safe.',
  alternates: { canonical: '/blog' },
  openGraph: {
    title: 'The Kobocent blog',
    description: 'Plain-language guides to stablecoins and everyday money.',
    url: `${SITE}/blog`,
    siteName: 'Kobocent',
    type: 'website',
  },
};

export default async function BlogIndex() {
  const posts = await listPosts();
  const [first, ...rest] = posts;
  return (
    <BlogShell>
      <section className="container-page pt-10 sm:pt-16 pb-6">
        <p className="eyebrow">The Kobocent blog</p>
        <h1 className="h-display text-[36px] sm:text-[52px] mt-2 max-w-[18ch]">
          Everyday money, <span className="text-terracotta italic">explained plainly</span>
        </h1>
        <p className="muted mt-4 text-[16px] sm:text-[18px] max-w-[60ch]">
          Guides to stablecoins, payments and staying safe, written for people who just want their money to work.
        </p>
      </section>

      <section className="container-page pb-6">
        {posts.length === 0 ? (
          <p className="surface rounded-2xl p-6 muted">New articles are on their way. Check back soon.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3 [&>*]:min-w-0">
            {first && (
              <Link href={`/blog/${first.slug}`} className="group surface rounded-3xl p-6 sm:p-8 md:col-span-2 lg:col-span-3 flex flex-col gap-3 hover:border-terracotta transition-colors">
                <span className="text-[12px] font-semibold uppercase tracking-[0.12em] text-terracotta">{first.category} · Latest</span>
                <h2 className="h-display text-[26px] sm:text-[36px] group-hover:text-terracotta transition-colors">{first.title}</h2>
                <p className="muted text-[15px] sm:text-[17px] max-w-[70ch]">{first.description}</p>
                <span className="text-[13px] muted mt-1">{fmtDate(first.publishedAt)} · {first.readMinutes} min read</span>
              </Link>
            )}
            {rest.map((p) => (
              <Link key={p.slug} href={`/blog/${p.slug}`} className="group surface rounded-3xl p-6 flex flex-col gap-2.5 hover:border-terracotta transition-colors">
                <span className="text-[12px] font-semibold uppercase tracking-[0.12em] text-terracotta">{p.category}</span>
                <h2 className="font-display font-bold text-[20px] leading-snug group-hover:text-terracotta transition-colors">{p.title}</h2>
                <p className="muted text-[14.5px] line-clamp-3">{p.description}</p>
                <span className="text-[13px] muted mt-auto pt-2">{fmtDate(p.publishedAt)} · {p.readMinutes} min read</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </BlogShell>
  );
}
