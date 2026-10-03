'use client';
import { useEffect, useMemo, useState } from 'react';
import { kc, dayLabel, type History, type HistoryItem } from '@/lib/kc';
import { ActivityRow, EmptyState, Skeleton } from '@/components/app/ui';
import { IconDownload } from '@/components/app/Icons';
import { PageHeader } from '@/components/app/PageHeader';
import { useLiveRefresh } from '@/lib/useLiveRefresh';

const PERIODS = [
  { key: 'week', label: '7 days' },
  { key: 'month', label: '30 days' },
  { key: 'quarter', label: '90 days' },
  { key: 'all', label: 'All' },
] as const;

const FILTERS: Array<{ key: string; label: string; kinds: HistoryItem['kind'][] | null }> = [
  { key: 'all', label: 'All', kinds: null },
  { key: 'pay', label: 'Payments', kinds: ['bank_transfer', 'utility', 'withdrawal'] },
  { key: 'move', label: 'Transfers', kinds: ['wallet_transfer', 'bridge'] },
  { key: 'trade', label: 'Trades', kinds: ['trade', 'sniper', 'copy_trade'] },
  { key: 'earn', label: 'Earn', kinds: ['yield'] },
];

export default function ActivityPage() {
  const [period, setPeriod] = useState<(typeof PERIODS)[number]['key']>('month');
  const [filter, setFilter] = useState('all');
  const [data, setData] = useState<History | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setData(null);
    setError('');
    kc<History>(`history?period=${period}`).then(setData).catch(e => setError(e instanceof Error ? e.message : 'Could not load activity'));
  }, [period]);
  // Background refresh — new payments appear without reloading; failures keep what is shown.
  useLiveRefresh(() => { kc<History>(`history?period=${period}`).then(setData).catch(() => {}); });

  const groups = useMemo(() => {
    const kinds = FILTERS.find(f => f.key === filter)?.kinds;
    const items = (data?.items || []).filter(i => !kinds || kinds.includes(i.kind));
    const out: Array<{ day: string; items: HistoryItem[] }> = [];
    for (const i of items) {
      const day = dayLabel(i.at);
      const last = out[out.length - 1];
      if (last && last.day === day) last.items.push(i); else out.push({ day, items: [i] });
    }
    return out;
  }, [data, filter]);

  return (
    <div className="space-y-6">
      <PageHeader title="Activity" action={
        <a href={`/api/kc/statement.pdf?period=${period}`} className="btn-ghost !px-4 !py-0 min-h-[44px] !text-[14px]">
          <IconDownload />Statement
        </a>
      } />

      <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1" role="tablist" aria-label="Period">
        {PERIODS.map(p => (
          <button key={p.key} role="tab" aria-selected={period === p.key} onClick={() => setPeriod(p.key)}
            className={`shrink-0 rounded-full px-4 min-h-[40px] text-[14px] font-medium transition-colors
              ${period === p.key ? 'bg-ink text-cream dark:bg-cream-warm dark:text-ink' : 'surface text-warmgray dark:text-warmgray-dark'}`}>
            {p.label}
          </button>
        ))}
      </div>
      <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1" aria-label="Type">
        {FILTERS.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`shrink-0 rounded-full px-3.5 min-h-[36px] text-[13.5px] font-medium border transition-colors
              ${filter === f.key ? 'border-terracotta text-terracotta bg-terracotta-soft' : 'border-cream-border dark:border-night-border muted'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {data && data.shiftPoints > 0 && (
        <div className="rounded-2xl bg-cream-warm dark:bg-night-card px-4 py-3 text-[14px] muted">
          $SHIFT points earned in this period: <span className="font-semibold text-ink dark:text-cream-warm">{data.shiftPoints.toLocaleString()}</span>
        </div>
      )}

      {error ? (
        <EmptyState title="Could not load activity" body={error} />
      ) : !data ? (
        <div className="space-y-2">{[0, 1, 2, 3].map(n => <Skeleton key={n} className="h-16" />)}</div>
      ) : groups.length === 0 ? (
        <EmptyState title="No activity in this period" body="Try a longer period, or make your first payment — on Telegram or here." />
      ) : (
        <div className="space-y-6">
          {groups.map(g => (
            <section key={g.day}>
              <div className="eyebrow mb-1.5">{g.day}</div>
              <ul className="surface rounded-2xl divide-y divide-cream-border dark:divide-night-border px-4">
                {g.items.map((i, n) => <ActivityRow key={`${i.kind}-${i.reference || n}-${i.at}`} item={i} />)}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
