/**
 * Client helpers for the signed-in app. Every call goes to our own /api/kc proxy
 * (src/app/api/kc), never to the backend directly. Shapes mirror ../clickbot/API.md.
 */

export const BOT = process.env.NEXT_PUBLIC_TELEGRAM_BOT || 'kobocentbot';
export const BOT_URL = `https://t.me/${BOT}`;

export interface Account {
  id: string;
  telegramLinked: boolean;
  hasPhone: boolean;
  hasEmail: boolean;
  hasWallet?: boolean;
  walletAddress: string | null;
  createdAt: number | null;
}

export interface Balances {
  exists: true;
  solana: {
    address: string;
    solPrice: number | null;
    sol: { amount: number; lamports: number; usd: number | null };
    tokens: Array<{ mint: string; symbol: string; amount: number; usd: number | null }>;
    error: string | null;
  };
  evm: {
    address: string;
    native: Array<{ chainKey: string; symbol: string; amount: number; usd: number | null }>;
    stablecoins: Array<{ assetKey: string; symbol: string; amount: number; usd: number }>;
    totalUsd: number | null;
  } | null;
  totals: { usd: number; stablecoinsUsd: number; partial: boolean };
}

export interface HistoryItem {
  kind: 'trade' | 'bank_transfer' | 'utility' | 'deposit' | 'withdrawal' | 'yield' | 'sniper' | 'copy_trade' | 'bridge' | 'wallet_transfer';
  at: number | null;
  status?: string | null;
  side?: string | null;
  asset?: string | null;
  amountUsd?: number | null;
  amountNgn?: number | null;
  amountStable?: number | null;
  amount?: number | null;
  earned?: number | null;
  amountSol?: number | null;
  feeUsd?: number | null;
  pnlUsd?: number | null;
  counterparty?: string | null;
  bank?: string | null;
  service?: string | null;
  plan?: string | null;
  fromChain?: string | null;
  chain?: string | null;
  reference?: string | null;
}

export interface History {
  period: string;
  startTs: number;
  endTs: number;
  shiftPoints: number;
  items: HistoryItem[];
}

export class KcError extends Error {
  status: number;
  data: Record<string, unknown>;
  constructor(status: number, message: string, data: Record<string, unknown>) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

export async function kc<T>(path: string, init: { method?: 'GET' | 'POST'; body?: unknown; headers?: Record<string, string> } = {}): Promise<T> {
  const res = await fetch(`/api/kc/${path.replace(/^\//, '')}`, {
    method: init.method || 'GET',
    headers: { ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(init.headers || {}) },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    cache: 'no-store',
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  const sessionGone = res.status === 401 && /session expired|sign in required|account not found/i.test(String(data.error || ''));
  if (sessionGone && !path.startsWith('wallet/recovery-phrase') && path !== 'auth/reauth') {
    if (typeof window !== 'undefined') window.location.href = `/signin?next=${encodeURIComponent(window.location.pathname)}`;
  }
  if (!res.ok) throw new KcError(res.status, String(data.error || 'Something went wrong — please try again'), data);
  return data as T;
}

// ── Small client-side profile (non-sensitive) remembered from Telegram sign-in ──
export interface LocalProfile { firstName: string | null; username: string | null; photoUrl: string | null; telegramId: number | null }
const PROFILE_KEY = 'kc-profile';
export function saveProfile(p: LocalProfile) {
  try { window.localStorage.setItem(PROFILE_KEY, JSON.stringify(p)); } catch { /* private mode */ }
}
export function loadProfile(): LocalProfile | null {
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    return raw ? (JSON.parse(raw) as LocalProfile) : null;
  } catch { return null; }
}
export function clearProfile() {
  try { window.localStorage.removeItem(PROFILE_KEY); } catch { /* ignore */ }
}

export function referralLink(telegramId: number | null | undefined): string | null {
  return telegramId ? `https://t.me/${BOT}?start=ref_${telegramId}` : null;
}

// ── Formatting: a dash when a value is unknown, never a guess ──
export function usd(n: number | null | undefined, opts: { compact?: boolean } = {}): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—';
  if (opts.compact && Math.abs(n) >= 10_000) return `$${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
export function naira(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—';
  return `₦${Math.round(n).toLocaleString('en-NG')}`;
}
export function amount(n: number | null | undefined, digits = 4): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—';
  const d = Math.abs(n) >= 1000 ? 2 : digits;
  return n.toLocaleString('en-US', { maximumFractionDigits: d });
}
export function shortAddress(a: string | null | undefined): string {
  return a ? `${a.slice(0, 4)}…${a.slice(-4)}` : '—';
}
export function dayLabel(ms: number | null): string {
  if (!ms) return 'Earlier';
  const d = new Date(ms);
  const today = new Date();
  const y = new Date(); y.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === y.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: d.getFullYear() === today.getFullYear() ? undefined : 'numeric' });
}
export function timeLabel(ms: number | null): string {
  return ms ? new Date(ms).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '';
}
export function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}
