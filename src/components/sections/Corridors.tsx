import { CORRIDORS } from '@/data/corridors';
import { Section, SectionHead, Reveal } from '@/components/ui/Section';

/**
 * The clearest thing on the page: concrete money journeys.
 * A visitor should find their own situation in one of these rows.
 */
export function Corridors() {
  return (
    <Section id="corridors">
      <SectionHead
        eyebrow="Money that actually moves"
        title={<>From <span className="text-terracotta italic">where you are</span> to wherever it needs to go</>}
        body="Stablecoins are the rail. You never have to think about them — you just see money leave one place and arrive in another."
      />

      <div className="mt-12 grid gap-3">
        {CORRIDORS.map((c, i) => (
          <Reveal key={`${c.from}-${c.to}`} delay={i * 60}>
            <div className="surface rounded-2xl p-5 sm:p-6 flex flex-wrap items-center gap-x-4 gap-y-3 transition-colors hover:border-terracotta">
              <div className="flex items-center gap-2.5 min-w-[150px]">
                <span className="text-[22px]">{c.fromFlag}</span>
                <span className="font-semibold text-[15px] text-ink dark:text-cream-warm">{c.from}</span>
              </div>

              <div className="flex items-center gap-2.5 flex-1 min-w-[200px]">
                <span className="hidden sm:block h-px flex-1 bg-gradient-to-r from-terracotta/40 to-terracotta/10" />
                <span className="font-mono text-[12px] muted whitespace-nowrap">{c.action}</span>
                <span className="hidden sm:block h-px flex-1 bg-gradient-to-l from-terracotta/40 to-terracotta/10" />
              </div>

              <div className="flex items-center gap-2.5 min-w-[170px]">
                <span className="text-[22px]">{c.toFlag}</span>
                <span className="font-semibold text-[15px] text-ink dark:text-cream-warm">{c.to}</span>
                {!c.live && (
                  <span className="font-mono text-[9.5px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-cream-warm dark:bg-night border border-cream-border dark:border-night-border muted">
                    Soon
                  </span>
                )}
              </div>

              <p className="text-[13px] muted basis-full lg:basis-auto lg:ml-auto lg:text-right lg:max-w-[260px]">
                {c.note}
              </p>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
