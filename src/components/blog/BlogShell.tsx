import Link from 'next/link';
import { LogoLockup } from '@/components/ui/Logo';
import type { Block, Inline } from '@/lib/blog';

/** Frame for kobocent.com/blog (2026-11-13). Light by default, dark when the visitor chose it; readable at 390 px. */
export function BlogShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-cream dark:bg-night text-ink dark:text-cream-warm">
      <header className="sticky top-0 z-20 border-b border-cream-border dark:border-night-border bg-cream/90 dark:bg-night/90 backdrop-blur">
        <div className="container-page flex items-center justify-between h-16 gap-3">
          <Link href="/" aria-label="Kobocent home"><LogoLockup /></Link>
          <nav className="flex items-center gap-1 sm:gap-3 text-[14px] font-semibold">
            <Link href="/blog" className="min-h-[44px] inline-flex items-center px-2 text-terracotta">Blog</Link>
            <Link href="/signup" className="btn-primary !px-4 !py-2 !text-[14px]">Get started</Link>
          </nav>
        </div>
      </header>
      <main>{children}</main>
      <footer className="border-t border-cream-border dark:border-night-border mt-16">
        <div className="container-page py-8 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between text-[13.5px] muted">
          <p>Kobocent · Multichain, powered by stablecoins.</p>
          <nav className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/" className="hover:text-terracotta">Home</Link>
            <Link href="/blog" className="hover:text-terracotta">Blog</Link>
            <Link href="/legal" className="hover:text-terracotta">Privacy &amp; Terms</Link>
            <a href="mailto:support@kobocent.com" className="hover:text-terracotta">support@kobocent.com</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}

function Inlines({ c }: { c: Inline[] }) {
  return (
    <>
      {c.map((x, i) => {
        if (x.t === 'b') return <strong key={i} className="font-semibold text-ink dark:text-cream-warm">{x.v}</strong>;
        if (x.t === 'i') return <em key={i}>{x.v}</em>;
        if (x.t === 'a') {
          const external = /^https?:\/\//.test(x.href) && !x.href.startsWith('https://kobocent.com');
          return external ? (
            <a key={i} href={x.href} target="_blank" rel="noopener noreferrer" className="text-terracotta font-semibold underline underline-offset-4">{x.v}</a>
          ) : (
            <Link key={i} href={x.href.replace('https://kobocent.com', '') || '/'} className="text-terracotta font-semibold underline underline-offset-4">{x.v}</Link>
          );
        }
        return <span key={i}>{x.v}</span>;
      })}
    </>
  );
}

/** The article body. Text sizes are set for reading on a phone first. */
export function ArticleBody({ blocks }: { blocks: Block[] }) {
  return (
    <div className="text-[17px] leading-[1.75] text-ink-soft dark:text-cream-warm/90 space-y-5">
      {blocks.map((b, i) => {
        switch (b.k) {
          case 'h2':
            return <h2 key={i} id={b.id} className="h-display text-[24px] sm:text-[28px] !mt-10 scroll-mt-24"><Inlines c={b.c} /></h2>;
          case 'h3':
            return <h3 key={i} id={b.id} className="font-display font-bold text-[20px] !mt-8 scroll-mt-24"><Inlines c={b.c} /></h3>;
          case 'quote':
            return (
              <aside key={i} className="rounded-2xl border-l-4 border-terracotta bg-terracotta-soft dark:bg-night-card px-5 py-4 text-[16px]">
                <Inlines c={b.c} />
              </aside>
            );
          case 'ul':
            return (
              <ul key={i} className="list-disc pl-6 space-y-2 marker:text-terracotta">
                {b.items.map((it, j) => <li key={j}><Inlines c={it} /></li>)}
              </ul>
            );
          case 'ol':
            return (
              <ol key={i} className="list-decimal pl-6 space-y-2 marker:text-terracotta marker:font-semibold">
                {b.items.map((it, j) => <li key={j}><Inlines c={it} /></li>)}
              </ol>
            );
          default:
            return <p key={i}><Inlines c={b.c} /></p>;
        }
      })}
    </div>
  );
}
