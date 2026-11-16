import type { Metadata } from 'next';
import Link from 'next/link';
import { BlogShell } from '@/components/blog/BlogShell';
import { VideoPlayer } from '@/components/VideoPlayer';
import { VIDEOS, VIDEO_CATEGORIES } from '@/data/videos';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://kobocent.com';

export const metadata: Metadata = {
  title: 'Product videos — Kobocent',
  description: 'Short videos showing how Kobocent works: paying bills, withdrawing to a bank, cashback, Kobo Pal, earning on idle stablecoins and trading.',
  alternates: { canonical: '/videos' },
  openGraph: { title: 'Kobocent product videos', description: 'Thirty-second walkthroughs of how Kobocent works.', url: `${SITE}/videos`, siteName: 'Kobocent', type: 'website' },
};

/** The film catalogue (2026-11-16), grouped by category from src/data/videos.ts. Posters only until play is pressed. */
export default function VideosPage() {
  // schema.org VideoObject for each film, so search engines can list them
  const ld = VIDEOS.map((v) => ({
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: v.title,
    description: v.caption,
    thumbnailUrl: `${SITE}/videos/${v.file}.jpg`,
    contentUrl: `${SITE}/videos/${v.file}.mp4`,
    uploadDate: '2026-11-16',
    duration: `PT${v.seconds}S`,
    publisher: { '@type': 'Organization', name: 'Kobocent', url: SITE },
  }));
  return (
    <BlogShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, '\\u003c') }} />
      <section className="container-page pt-10 sm:pt-16 pb-2">
        <p className="eyebrow">Product videos</p>
        <h1 className="h-display text-[36px] sm:text-[52px] mt-2 max-w-[18ch]">
          See how it works, <span className="text-terracotta italic">thirty seconds at a time</span>
        </h1>
        <p className="muted mt-4 text-[16px] sm:text-[18px] max-w-[62ch]">
          Short walkthroughs of the real screens. Amounts, rates and names shown are examples.
        </p>
        <nav className="mt-6 flex flex-wrap gap-2" aria-label="Categories">
          {VIDEO_CATEGORIES.map((c) => (
            <a key={c.name} href={`#${slug(c.name)}`} className="rounded-full border border-cream-border dark:border-night-border px-4 min-h-[44px] inline-flex items-center text-[14px] font-semibold hover:border-terracotta hover:text-terracotta">
              {c.name}
            </a>
          ))}
        </nav>
      </section>

      {VIDEO_CATEGORIES.map((c) => {
        const list = VIDEOS.filter((v) => v.category === c.name);
        if (!list.length) return null;
        return (
          <section key={c.name} id={slug(c.name)} className="container-page pt-12 scroll-mt-20">
            <h2 className="h-display text-[26px] sm:text-[32px]">{c.name}</h2>
            <p className="muted mt-1 text-[15px]">{c.blurb}</p>
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 [&>*]:min-w-0">
              {list.map((v) => (
                <article key={v.file} className="mx-auto w-full max-w-[340px]">
                  <VideoPlayer file={v.file} title={v.title} />
                  <h3 className="font-display font-bold text-[19px] leading-snug mt-4 text-ink dark:text-cream-warm">{v.title}</h3>
                  <p className="muted text-[14.5px] leading-relaxed mt-1.5">{v.caption}</p>
                  {v.note && <p className="text-[13px] mt-2 text-warmgray dark:text-warmgray-dark italic">{v.note}</p>}
                </article>
              ))}
            </div>
          </section>
        );
      })}

      <section className="container-page pt-14">
        <div className="surface rounded-3xl p-6 sm:p-8 max-w-[720px]">
          <h2 className="h-display text-[24px]">Ready to try it?</h2>
          <p className="muted mt-2 text-[15.5px]">Open an account in a minute, or start in practice mode with virtual funds.</p>
          <div className="mt-5 flex flex-col sm:flex-row gap-3">
            <Link href="/signup" className="btn-primary">Get started</Link>
            <Link href="/blog" className="btn-ghost">Read the guides</Link>
          </div>
        </div>
      </section>
    </BlogShell>
  );
}

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
