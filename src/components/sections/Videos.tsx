'use client';
import { useState } from 'react';
import { Section, SectionHead } from '@/components/ui/Section';

/**
 * Replace these IDs with Kobocent-branded films once they are shot.
 * `staking` intentionally reuses the payments film until its own exists.
 */
const VIDEOS = {
  spending: { id: 'XB6Renr4N-A', label: '💳 Sending & paying', caption: 'Watch a bill get paid and money reach a bank account — just by typing.' },
  trading:  { id: 'ZB_M8SNOyFQ', label: '📈 Trading',          caption: 'From pasting a contract address to an automated exit at the peak.' },
  staking:  { id: 'XB6Renr4N-A', label: '🌱 Earning',           caption: 'Staking film coming soon — for now, see the payments flow in action.' },
} as const;

type Key = keyof typeof VIDEOS;

export function Videos() {
  const [active, setActive] = useState<Key>('spending');
  const v = VIDEOS[active];

  return (
    <Section id="watch" tone="warm">
      <SectionHead
        eyebrow="See it working"
        title={<>Real screens, <span className="text-terracotta italic">real transactions</span></>}
        body="No mockups. Tap the speaker in the player to hear the walkthrough."
      />

      <div className="mt-8 flex flex-wrap justify-center gap-2.5">
        {(Object.keys(VIDEOS) as Key[]).map((k) => (
          <button
            key={k}
            onClick={() => setActive(k)}
            className={`rounded-xl px-5 py-2.5 text-[13.5px] font-semibold border transition-all
              ${active === k
                ? 'bg-terracotta text-white border-terracotta'
                : 'border-cream-border dark:border-night-border muted hover:border-terracotta hover:text-terracotta'}`}
          >
            {VIDEOS[k].label}
          </button>
        ))}
      </div>

      <div className="mt-10 mx-auto w-full max-w-[360px]">
        <div className="relative rounded-[32px] overflow-hidden border-2 border-cream-border dark:border-night-border shadow-lift aspect-[9/16] bg-black">
          <iframe
            key={active}
            src={`https://www.youtube-nocookie.com/embed/${v.id}?autoplay=1&mute=1&loop=1&playlist=${v.id}&controls=1&modestbranding=1&rel=0&playsinline=1`}
            title={`Kobocent — ${v.label}`}
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 h-full w-full border-0"
          />
        </div>
        <p className="text-center text-[13.5px] muted mt-5">{v.caption}</p>
      </div>
    </Section>
  );
}
