'use client';
import { useState } from 'react';
import { FAQ } from '@/data/faq';
import { Section, SectionHead } from '@/components/ui/Section';

export function Faq() {
  const [openGroup, setOpenGroup] = useState(0);
  const [open, setOpen] = useState<string | null>('0-0');

  return (
    <Section id="faq" tone="warm">
      <SectionHead
        eyebrow="Questions, answered honestly"
        title={<>Everything you might <span className="text-terracotta italic">reasonably ask</span></>}
        body="Including the parts most platforms leave out — what happens if you send on the wrong network, what non-custodial really costs you, and what we cannot promise."
      />

      {/* group tabs */}
      <div className="mt-10 flex flex-wrap justify-center gap-2">
        {FAQ.map((g, gi) => (
          <button
            key={g.group}
            onClick={() => { setOpenGroup(gi); setOpen(`${gi}-0`); }}
            className={`rounded-xl px-4 py-2.5 text-[13px] font-semibold border transition-all
              ${openGroup === gi
                ? 'bg-terracotta text-white border-terracotta'
                : 'border-cream-border dark:border-night-border muted hover:border-terracotta hover:text-terracotta'}`}
          >
            {g.group}
          </button>
        ))}
      </div>

      <div className="mt-8 mx-auto max-w-3xl space-y-2.5">
        {FAQ[openGroup].items.map((item, i) => {
          const id = `${openGroup}-${i}`;
          const isOpen = open === id;
          return (
            <div key={id} className="surface rounded-2xl overflow-hidden">
              <button
                onClick={() => setOpen(isOpen ? null : id)}
                aria-expanded={isOpen}
                className="w-full flex items-start gap-4 p-5 text-left"
              >
                <span className="flex-1 text-[15px] font-semibold text-ink dark:text-cream-warm leading-snug">
                  {item.q}
                </span>
                <span className={`shrink-0 mt-0.5 text-terracotta transition-transform duration-200 ${isOpen ? 'rotate-45' : ''}`}>
                  <svg width="18" height="18" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </span>
              </button>
              {isOpen && (
                <div className="px-5 pb-5 -mt-1">
                  <p className="text-[14px] leading-[1.8] muted">{item.a}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-9 text-center text-[13.5px] muted">
        Still stuck?{' '}
        <a href="https://t.me/ClickShiftAlerts" target="_blank" rel="noopener noreferrer" className="text-terracotta font-semibold hover:underline">
          Ask in the community
        </a>{' '}
        — a real person will answer.
      </p>
    </Section>
  );
}
