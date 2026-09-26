'use client';
import { useEffect, useRef, useState } from 'react';

interface Line { agent: string; tone: 'analyze' | 'guard' | 'exec' | 'watch'; html: string }

const LINES: Line[] = [
  { agent: 'analyze', tone: 'analyze', html: 'Scanning <b>$BONK</b> — pulling live candles…' },
  { agent: 'analyze', tone: 'analyze', html: 'RSI(14): <i>28.4</i> — oversold confirmed' },
  { agent: 'analyze', tone: 'analyze', html: 'Buy pressure 1h: <i>68%</i> · volume surge <i>+240%</i>' },
  { agent: 'guard',   tone: 'guard',   html: 'Holder concentration: <i>low</i> · top wallet <i>8.2%</i>' },
  { agent: 'guard',   tone: 'guard',   html: 'Liquidity depth <i>$2.4M</i> · rug-pattern check <i>clear</i>' },
  { agent: 'analyze', tone: 'analyze', html: 'Composite score <i>86/100</i> → entry signal' },
  { agent: 'exec',    tone: 'exec',    html: 'Routing privately — bypassing public mempool' },
  { agent: 'exec',    tone: 'exec',    html: 'Filled <i>841,000 BONK</i> · no frontrun detected' },
  { agent: 'guard',   tone: 'guard',   html: 'Trailing exit armed — trail <i>15%</i> from peak' },
  { agent: 'watch',   tone: 'watch',   html: 'Monitoring position · next check in <i>20s</i>' },
  { agent: 'watch',   tone: 'watch',   html: 'Peak <i>$0.0000481</i> — stop moved to <i>$0.0000409</i>' },
  { agent: 'exec',    tone: 'exec',    html: 'Trail triggered — exited at <i>+117%</i>' },
  { agent: 'analyze', tone: 'analyze', html: 'Scanning next opportunity…' },
];

const TONE: Record<Line['tone'], string> = {
  analyze: 'bg-terracotta/20 text-terracotta-light',
  guard:   'bg-amber-500/15 text-amber-400',
  exec:    'bg-emerald-500/15 text-emerald-400',
  watch:   'bg-sky-500/15 text-sky-400',
};

export function AgentTerminal() {
  const [shown, setShown] = useState<Line[]>(LINES.slice(0, 5));
  const idx = useRef(5);
  const box = useRef<HTMLDivElement>(null);
  const [started, setStarted] = useState(false);

  // Only run once the section is actually on screen — no wasted work.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setStarted(true); io.disconnect(); } }, { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setShown(LINES.slice(0, 9)); return; }
    const t = setInterval(() => {
      const next = LINES[idx.current % LINES.length];
      idx.current += 1;
      setShown((s) => [...s.slice(-8), next]);
    }, 1600);
    return () => clearInterval(t);
  }, [started]);

  return (
    <section className="py-20 sm:py-24 bg-ink dark:bg-night-card">
      <div className="container-page grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-terracotta-light mb-3">
            Under the hood
          </div>
          <h2 className="font-display font-bold leading-[1.1] tracking-[-0.02em] text-cream text-[clamp(28px,4vw,44px)] mb-5">
            The part that works <span className="text-terracotta-light italic">while you sleep</span>
          </h2>
          <p className="text-[15.5px] leading-[1.75] text-cream-warm/65 mb-7">
            Trading is the one thing here that genuinely benefits from automation. Analysis runs
            continuously, safety checks run before anything executes, and exits fire on their own
            when a position turns — whether or not you are watching.
          </p>
          <ul className="space-y-2.5">
            {[
              'Risk scoring before any entry, not after',
              'Private routing so trades are not frontrun',
              'Trailing exits that follow a run to its peak',
              'Runs continuously, not only when the app is open',
            ].map((t) => (
              <li key={t} className="flex gap-3 text-[14px] text-cream-warm/75 leading-relaxed">
                <span className="text-terracotta-light shrink-0 font-semibold">✓</span>{t}
              </li>
            ))}
          </ul>
        </div>

        <div ref={box} className="rounded-2xl overflow-hidden border border-white/10 bg-[#141110] shadow-lift">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.07] bg-white/[0.03]">
            <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#FFBD2E]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#28CA41]" />
            <span className="ml-2 font-mono text-[10.5px] text-cream-warm/35">kobocent · live engine</span>
          </div>
          <div className="h-[340px] overflow-hidden px-5 py-4 font-mono text-[11.5px] leading-[1.9] flex flex-col justify-end">
            {shown.map((l, i) => (
              <div key={i} className="flex gap-2.5 mb-1 animate-fade-up">
                <span className={`shrink-0 rounded px-1.5 text-[10px] self-start mt-0.5 ${TONE[l.tone]}`}>
                  {l.agent}
                </span>
                <span
                  className="text-cream-warm/55 [&_b]:text-cream-warm [&_i]:not-italic [&_i]:text-terracotta-light"
                  dangerouslySetInnerHTML={{ __html: l.html }}
                />
              </div>
            ))}
            {shown.length > 0 && <span className="inline-block w-1.5 h-3 bg-terracotta-light align-middle animate-pulse" />}
          </div>
        </div>
      </div>
    </section>
  );
}
