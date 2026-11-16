'use client';
import { useState } from 'react';

/**
 * One film, click to play (2026-11-16). Until someone presses play only the small poster image is on the page, and it
 * loads lazily; the MP4 is fetched on play. So a page can show many films and stay light.
 */
export function VideoPlayer({ file, title, className = '' }: { file: string; title: string; className?: string }) {
  const [playing, setPlaying] = useState(false);
  return (
    <div className={`relative rounded-[28px] overflow-hidden border-2 border-cream-border dark:border-night-border shadow-lift aspect-[9/16] bg-cream-warm ${className}`}>
      {playing ? (
        <video src={`/videos/${file}.mp4`} poster={`/videos/${file}.jpg`} autoPlay controls playsInline preload="auto" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <button type="button" onClick={() => setPlaying(true)} aria-label={`Play: ${title}`} className="group absolute inset-0 h-full w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/videos/${file}.jpg`} alt="" loading="lazy" decoding="async" width={540} height={960} className="absolute inset-0 h-full w-full object-cover" />
          <span className="absolute inset-0 bg-ink/10 group-hover:bg-ink/5 transition-colors" />
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 grid place-items-center h-[72px] w-[72px] rounded-full bg-terracotta text-white shadow-lift group-hover:scale-105 transition-transform">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" /></svg>
          </span>
        </button>
      )}
    </div>
  );
}
