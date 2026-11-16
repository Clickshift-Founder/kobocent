'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Section, SectionHead } from '@/components/ui/Section';
import { VideoPlayer } from '@/components/VideoPlayer';
import { FEATURED, VIDEOS } from '@/data/videos';

/**
 * Three featured Kobocent films (2026-11-16); the full catalogue is at /videos (src/data/videos.ts feeds both).
 * Only a small poster image loads with the page: the video file is fetched when someone presses play, so the section
 * costs the landing page almost nothing (the old YouTube embed loaded YouTube's player on every visit).
 * The films are illustrated walkthroughs of the real screens, with example amounts, and the copy says so.
 */
export function Videos() {
  const [active, setActive] = useState(0);
  const v = FEATURED[active];

  return (
    <Section id="watch" tone="warm">
      <SectionHead
        eyebrow="See it working"
        title={<>Thirty seconds, <span className="text-terracotta italic">start to finish</span></>}
        body="Short walkthroughs of the real screens. Amounts and rates shown are examples."
      />

      <div className="mt-8 flex flex-wrap justify-center gap-2.5">
        {FEATURED.map((f, i) => (
          <button
            key={f.file}
            onClick={() => setActive(i)}
            className={`rounded-xl px-5 py-2.5 min-h-[44px] text-[13.5px] font-semibold border transition-all
              ${active === i
                ? 'bg-terracotta text-white border-terracotta'
                : 'border-cream-border dark:border-night-border muted hover:border-terracotta hover:text-terracotta'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mt-10 mx-auto w-full max-w-[360px]">
        <VideoPlayer key={v.file} file={v.file} title={v.title} className="!rounded-[32px]" />
        <p className="text-center text-[13.5px] muted mt-5">{v.caption}</p>
        <div className="mt-6 text-center">
          <Link href="/videos" className="inline-flex items-center gap-2 min-h-[44px] px-5 rounded-xl border border-terracotta text-terracotta font-semibold text-[14px] hover:bg-terracotta hover:text-white transition-colors">
            See all {VIDEOS.length} product videos <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </Section>
  );
}
