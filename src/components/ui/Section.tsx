'use client';
import { useEffect, useRef, type ReactNode } from 'react';

export function Reveal({ children, delay = 0, className = '' }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setTimeout(() => el.classList.add('in'), delay); io.disconnect(); } },
      { threshold: 0.12 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [delay]);
  return <div ref={ref} className={`reveal ${className}`}>{children}</div>;
}

export function Section({
  id, children, className = '', tone = 'base',
}: { id?: string; children: ReactNode; className?: string; tone?: 'base' | 'warm' }) {
  const bg = tone === 'warm' ? 'bg-cream-warm/50 dark:bg-night-card/40' : '';
  return (
    <section id={id} className={`py-20 sm:py-28 ${bg} ${className}`}>
      <div className="container-page">{children}</div>
    </section>
  );
}

export function SectionHead({
  eyebrow, title, body, center = true,
}: { eyebrow: string; title: ReactNode; body?: string; center?: boolean }) {
  return (
    <div className={center ? 'text-center max-w-2xl mx-auto' : 'max-w-2xl'}>
      <div className="eyebrow mb-3">{eyebrow}</div>
      <h2 className="h-display text-[clamp(28px,4vw,46px)] mb-4">{title}</h2>
      {body && <p className="muted text-[16px] leading-[1.75]">{body}</p>}
    </div>
  );
}
