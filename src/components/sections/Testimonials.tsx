import { TESTIMONIALS } from '@/data/testimonials';
import { SectionHead } from '@/components/ui/Section';

export function Testimonials() {
  const loop = [...TESTIMONIALS, ...TESTIMONIALS];
  return (
    <section id="stories" className="py-20 sm:py-28 overflow-hidden">
      <div className="container-page">
        <SectionHead
          eyebrow="What people say"
          title={<>Used across <span className="text-terracotta italic">50+ countries</span></>}
          body="From first-timers paying a light bill to traders running automated exits."
        />
      </div>

      <div
        className="mt-12 overflow-hidden"
        style={{ maskImage: 'linear-gradient(90deg,transparent,black 6%,black 94%,transparent)', WebkitMaskImage: 'linear-gradient(90deg,transparent,black 6%,black 94%,transparent)' }}
      >
        <div className="flex gap-4 w-max animate-marquee hover:[animation-play-state:paused]">
          {loop.map((t, i) => (
            <article key={i} className="surface rounded-2xl p-6 w-[330px] shrink-0 flex flex-col gap-4">
              <span className="self-start font-mono text-[9.5px] uppercase tracking-wider px-2.5 py-1 rounded-full bg-terracotta/10 text-terracotta">
                {t.vertical}
              </span>
              <p className="text-[14px] leading-[1.7] text-ink dark:text-cream-warm flex-1">“{t.quote}”</p>
              <div className="flex items-center gap-3">
                {t.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t.photo} alt={t.name} className="h-10 w-10 rounded-full object-cover" loading="lazy" />
                ) : (
                  <div className="grid place-items-center h-10 w-10 rounded-full bg-terracotta text-white font-semibold text-[15px]">
                    {t.name.charAt(0)}
                  </div>
                )}
                <div>
                  <div className="text-[13.5px] font-semibold text-ink dark:text-cream-warm">{t.name}</div>
                  <div className="text-[11.5px] muted">{t.flag} {t.location}</div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
