'use client';
import { useState } from 'react';
import { Section, SectionHead } from '@/components/ui/Section';

/**
 * Three Kobocent films (2026-11-16), served from /public/videos (720×1280, under 2 MB each).
 * Nothing but a small poster image loads with the page: the video file is fetched only when someone presses play,
 * so the section costs the landing page almost nothing (the old YouTube embed loaded YouTube's player on every visit).
 * The films are illustrated walkthroughs of the real screens, with example amounts, and the copy says so.
 * Full-size masters (1080×1920) are kept by the founder for social posts.
 */
const VIDEOS = {
  bills:    { file: 'pay-bills', label: '💡 Pay a bill',        caption: 'Pay your electricity from your dollars: meter checked, exact cost shown, token in seconds.' },
  withdraw: { file: 'withdraw',  label: '🏦 Withdraw to bank',  caption: 'Type the amount, see the exact naira, check the name, hold to send.' },
  pal:      { file: 'kobo-pal',  label: '✨ Kobo Pal',           caption: 'Buy airtime by typing a sentence, ask a money question, freeze a lost phone.' },
} as const;

type Key = keyof typeof VIDEOS;

export function Videos() {
  const [active, setActive] = useState<Key>('bills');
  const [playing, setPlaying] = useState(false);
  const v = VIDEOS[active];

  return (
    <Section id="watch" tone="warm">
      <SectionHead
        eyebrow="See it working"
        title={<>Thirty seconds, <span className="text-terracotta italic">start to finish</span></>}
        body="Short walkthroughs of the real screens. Amounts and rates shown are examples."
      />

      <div className="mt-8 flex flex-wrap justify-center gap-2.5">
        {(Object.keys(VIDEOS) as Key[]).map((k) => (
          <button
            key={k}
            onClick={() => { setActive(k); setPlaying(false); }}
            className={`rounded-xl px-5 py-2.5 min-h-[44px] text-[13.5px] font-semibold border transition-all
              ${active === k
                ? 'bg-terracotta text-white border-terracotta'
                : 'border-cream-border dark:border-night-border muted hover:border-terracotta hover:text-terracotta'}`}
          >
            {VIDEOS[k].label}
          </button>
        ))}
      </div>

      <div className="mt-10 mx-auto w-full max-w-[360px]">
        <div className="relative rounded-[32px] overflow-hidden border-2 border-cream-border dark:border-night-border shadow-lift aspect-[9/16] bg-cream-warm">
          {playing ? (
            <video
              key={active}
              src={`/videos/${v.file}.mp4`}
              poster={`/videos/${v.file}.jpg`}
              autoPlay
              controls
              playsInline
              preload="auto"
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <button
              type="button"
              onClick={() => setPlaying(true)}
              aria-label={`Play: ${v.label}`}
              className="group absolute inset-0 h-full w-full"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/videos/${v.file}.jpg`} alt="" loading="lazy" decoding="async" width={540} height={960} className="absolute inset-0 h-full w-full object-cover" />
              <span className="absolute inset-0 bg-ink/10 group-hover:bg-ink/5 transition-colors" />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 grid place-items-center h-20 w-20 rounded-full bg-terracotta text-white shadow-lift group-hover:scale-105 transition-transform">
                <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" /></svg>
              </span>
            </button>
          )}
        </div>
        <p className="text-center text-[13.5px] muted mt-5">{v.caption}</p>
      </div>
    </Section>
  );
}
