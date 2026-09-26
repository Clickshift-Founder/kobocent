'use client';
import { useEffect, useState } from 'react';

const SECTIONS = [
  { id: 'what',        label: 'What you can do' },
  { id: 'corridors',   label: 'Money that moves' },
  { id: 'how',         label: 'Getting started' },
  { id: 'stablecoins', label: 'How money travels' },
  { id: 'spending',    label: 'Send & Spend' },
  { id: 'trading',     label: 'Trade' },
  { id: 'staking',     label: 'Earn' },
  { id: 'multichain',  label: 'Multichain' },
  { id: 'watch',       label: 'Watch' },
  { id: 'extras',      label: 'Statements & fees' },
  { id: 'rewards',     label: 'Rewards' },
  { id: 'pricing',     label: 'Pricing' },
  { id: 'roadmap',     label: 'Roadmap' },
  { id: 'faq',         label: 'FAQ' },
  { id: 'download',    label: 'Get the app' },
];

/**
 * A quiet floating control: jump to top, jump to the end, or open a drawer
 * listing every section. Appears only once the visitor has scrolled, so it
 * never competes with the hero.
 */
export function ScrollNav() {
  const [visible, setVisible] = useState(false);
  const [open, setOpen] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      setProgress(max > 0 ? window.scrollY / max : 0);
      setVisible(window.scrollY > 600);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function go(id?: string) {
    setOpen(false);
    if (!id) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  if (!visible) return null;
  const pct = Math.round(progress * 100);

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-[60] bg-ink/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* drawer */}
      <aside
        className={`fixed right-0 top-0 z-[70] h-full w-[min(84vw,300px)] bg-cream dark:bg-night
          border-l border-cream-border dark:border-night-border shadow-lift
          transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}
        aria-hidden={!open}
      >
        <div className="flex items-center justify-between px-5 py-5 border-b border-cream-border dark:border-night-border">
          <span className="eyebrow">Jump to</span>
          <button onClick={() => setOpen(false)} aria-label="Close" className="grid place-items-center h-8 w-8 rounded-lg hover:text-terracotta">
            <svg width="16" height="16" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>
        <nav className="overflow-y-auto h-[calc(100%-69px)] py-2">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => go(s.id)}
              className="w-full text-left px-5 py-3 text-[14px] muted hover:text-terracotta hover:bg-cream-warm dark:hover:bg-night-card transition-colors"
            >
              {s.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* floating control */}
      <div className="fixed bottom-5 right-5 z-[55] flex flex-col gap-2">
        <button
          onClick={() => setOpen(true)}
          aria-label="Jump to a section"
          className="grid place-items-center h-11 w-11 rounded-full surface shadow-card hover:text-terracotta hover:border-terracotta transition-colors"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>

        <button
          onClick={() => go()}
          aria-label="Back to top"
          title={`${pct}% read`}
          className="relative grid place-items-center h-11 w-11 rounded-full bg-terracotta text-white shadow-card hover:bg-terracotta-dark transition-colors"
        >
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 44 44" aria-hidden="true">
            <circle cx="22" cy="22" r="20" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="2.5" />
            <circle
              cx="22" cy="22" r="20" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"
              strokeDasharray={125.6} strokeDashoffset={125.6 * (1 - progress)}
              style={{ transition: 'stroke-dashoffset 0.15s linear' }}
            />
          </svg>
          <svg width="15" height="15" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" className="relative">
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
        </button>
      </div>
    </>
  );
}
