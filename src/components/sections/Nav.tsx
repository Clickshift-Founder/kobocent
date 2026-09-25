'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { LogoLockup } from '@/components/ui/Logo';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

const LINKS = [
  { href: '#what', label: 'What you can do' },
  { href: '#spending', label: 'Send & Spend' },
  { href: '#trading', label: 'Trade' },
  { href: '#staking', label: 'Earn' },
  { href: '#multichain', label: 'Multichain' },
  { href: '#faq', label: 'FAQ' },
  { href: '#download', label: 'Get the app' },
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300
        ${scrolled ? 'bg-cream/90 dark:bg-night/90 backdrop-blur-lg border-b border-cream-border dark:border-night-border py-3' : 'py-5'}`}
    >
      <nav className="container-page flex items-center justify-between gap-4">
        <Link href="/" aria-label="Kobocent home"><LogoLockup /></Link>

        <ul className="hidden lg:flex items-center gap-7">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a href={l.href} className="text-[13.5px] muted hover:text-terracotta transition-colors">{l.label}</a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2.5">
          <ThemeToggle compact />
          <Link href="/signup" className="btn-primary !px-5 !py-2.5 !text-[14px] hidden sm:inline-flex">
            Get started
          </Link>
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
            aria-expanded={open}
            className="lg:hidden grid place-items-center h-9 w-9 rounded-xl border border-cream-border dark:border-night-border"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {open ? <path d="M18 6L6 18M6 6l12 12" /> : <path d="M3 12h18M3 6h18M3 18h18" />}
            </svg>
          </button>
        </div>
      </nav>

      {open && (
        <div className="lg:hidden container-page mt-3 pb-3">
          <ul className="surface rounded-2xl p-2">
            {LINKS.map((l) => (
              <li key={l.href}>
                <a href={l.href} onClick={() => setOpen(false)} className="block px-4 py-3 rounded-xl text-[15px] hover:bg-cream-warm dark:hover:bg-night">
                  {l.label}
                </a>
              </li>
            ))}
            <li className="p-2"><Link href="/signup" className="btn-primary w-full">Get started</Link></li>
          </ul>
        </div>
      )}
    </header>
  );
}
