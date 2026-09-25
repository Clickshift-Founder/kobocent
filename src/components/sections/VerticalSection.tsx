import type { Vertical } from '@/data/verticals';
import { Section, SectionHead, Reveal } from '@/components/ui/Section';
import Link from 'next/link';

export function VerticalSection({ v, tone }: { v: Vertical; tone: 'base' | 'warm' }) {
  return (
    <Section id={v.key} tone={tone}>
      <SectionHead
        eyebrow={`${v.icon}  ${v.name}`}
        title={<>{v.tagline.split(' ').slice(0, -1).join(' ')} <span className="text-terracotta italic">{v.tagline.split(' ').slice(-1)}</span></>}
        body={v.summary}
      />

      <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {v.features.map((f, i) => (
          <Reveal key={f.title} delay={i * 60}>
            <div className="surface rounded-2xl p-6 h-full transition-all duration-300 hover:-translate-y-1 hover:shadow-card hover:border-terracotta">
              <div className="h-1 w-8 rounded-full bg-terracotta mb-4" />
              <h3 className="font-display text-[18px] font-bold text-ink dark:text-cream-warm mb-2">{f.title}</h3>
              <p className="text-[13.5px] leading-[1.7] muted">{f.body}</p>
            </div>
          </Reveal>
        ))}
      </div>

      <div className="mt-10 text-center">
        <Link href="/signup" className="btn-primary">Start with {v.name.split(' ')[0].toLowerCase()}</Link>
      </div>
    </Section>
  );
}
