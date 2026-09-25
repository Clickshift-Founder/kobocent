'use client';
import { VERTICALS } from '@/data/verticals';
import { Reveal } from '@/components/ui/Section';

/**
 * Deliberately NOT a tab that hides content — every vertical stays on the
 * page for SEO and for visitors who want to read everything. This is a
 * fast router for people who already know what they came for.
 */
export function GoalSelector() {
  return (
    <section id="what" className="py-16 sm:py-20 border-y border-cream-border dark:border-night-border bg-cream-warm/40 dark:bg-night-card/30">
      <div className="container-page">
        <Reveal>
          <p className="text-center eyebrow mb-8">What brought you here?</p>
          <div className="grid sm:grid-cols-3 gap-4">
            {VERTICALS.map((v, i) => (
              <a
                key={v.key}
                href={`#${v.key}`}
                className="group surface rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-card hover:border-terracotta"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="text-[30px] mb-3">{v.icon}</div>
                <div className="font-display text-[19px] font-bold text-ink dark:text-cream-warm mb-1.5">
                  {v.question}
                </div>
                <div className="text-[13px] muted mb-4 leading-relaxed">{v.tagline}</div>
                <span className="inline-flex items-center gap-1.5 font-mono text-[12px] font-semibold text-terracotta">
                  Show me
                  <span className="transition-transform group-hover:translate-x-1">→</span>
                </span>
              </a>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
