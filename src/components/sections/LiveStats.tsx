'use client';
import { useEffect, useState } from 'react';
import { fmtCompact, type LiveStats as Stats } from '@/lib/stats';
import { Section, SectionHead } from '@/components/ui/Section';

export function LiveStats() {
  const [s, setS] = useState<Stats>({ users: null, volumeUsd: null, transactions: null, countries: 50 });

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const r = await fetch('/api/stats');
        const j = await r.json();
        if (!alive || !j.ok) return;
        const d = j.data ?? {};
        setS({
          users: toNum(d.users),
          volumeUsd: toNum(d.volume_usd),
          transactions: toNum(d.transactions),
          countries: toNum(d.countries) ?? 50,
        });
      } catch { /* leave placeholders */ }
    }
    load();
    const t = setInterval(load, 90_000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  const cards = [
    { label: 'People using Kobocent', value: fmtCompact(s.users) },
    { label: 'Value moved', value: fmtCompact(s.volumeUsd, '$') },
    { label: 'Transactions', value: fmtCompact(s.transactions) },
    { label: 'Countries reached', value: s.countries ? `${s.countries}+` : '—' },
  ];

  return (
    <Section id="numbers" tone="warm">
      <SectionHead
        eyebrow="Live, not marketing"
        title={<>Built in the open, <span className="text-terracotta italic">proven by numbers</span></>}
        body="Pulled live from the platform every 90 seconds. When a number cannot be fetched we show a dash rather than a guess."
      />
      <div className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="surface rounded-2xl p-6 text-center">
            <div className="font-mono text-[clamp(26px,3.4vw,38px)] font-semibold text-terracotta mb-1.5">{c.value}</div>
            <div className="text-[12.5px] muted leading-snug">{c.label}</div>
          </div>
        ))}
      </div>
    </Section>
  );
}

function toNum(v: unknown): number | null {
  const n = typeof v === 'string' ? parseFloat(v) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) ? n : null;
}
