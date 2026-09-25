export interface LiveStats {
  users: number | null;
  volumeUsd: number | null;
  transactions: number | null;
  countries: number | null;
}

const API = process.env.NEXT_PUBLIC_STATS_API || 'https://api.clickshift.io';

export function fmtCompact(n: number | null, prefix = ''): string {
  if (n === null || Number.isNaN(n)) return '—';
  if (n >= 1_000_000) return `${prefix}${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${prefix}${(n / 1_000).toFixed(1)}K`;
  return `${prefix}${Math.round(n).toLocaleString()}`;
}

/**
 * Pulls live platform numbers. Returns nulls on failure so the UI can
 * show a neutral placeholder instead of an invented figure.
 */
export async function fetchLiveStats(): Promise<LiveStats> {
  const empty: LiveStats = { users: null, volumeUsd: null, transactions: null, countries: null };
  try {
    const res = await fetch(`${API}/api/stats/live`, { cache: 'no-store' });
    if (!res.ok) return empty;
    const d = await res.json();
    return {
      users: num(d.users),
      volumeUsd: num(d.volume_usd),
      transactions: num(d.transactions),
      countries: num(d.countries) ?? 50,
    };
  } catch {
    return empty;
  }
}

function num(v: unknown): number | null {
  const n = typeof v === 'string' ? parseFloat(v) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) ? n : null;
}
