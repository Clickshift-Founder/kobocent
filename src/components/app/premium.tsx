'use client';
import { useEffect, useRef, useState } from 'react';
import { kc, KcError, usd } from '@/lib/kc';
import { Sheet } from './ui';
import { ErrorNote } from './ErrorNote';
import { HoldToConfirm, newKey } from './money';
import { usePayFrom, PayFromPicker } from './PayFrom';
import { IconCheck } from './Icons';

/**
 * Trade T4 — the premium hub (2026-10-11). Shared types and the Subscribe sheet. Backend: /premium/* (src/services/premium.js →
 * the same Ultra, Copy trading, Sniper and Smart Money engines Telegram uses). Pay with USDC/USDT on Solana (Kobocent pays the
 * network fee) or any other balance via the shared Pay-from picker. A renewal adds its days to the time left.
 */

export type ProductId = 'pro' | 'ultra' | 'copy' | 'sniper';
export interface Plan { id: 'monthly' | 'quarterly'; usd: number; days: number }
export interface Product { id: ProductId; name: string; tagline: string; plans: Plan[]; perks: string[]; includes?: ProductId[] }
export interface SubStatus { active: boolean; expiresAt: number | null; daysLeft: number; plan?: string | null; autoRenew?: boolean }
export interface Hub {
  ok: true;
  status: { pro: SubStatus; ultra: SubStatus; copy: SubStatus; sniper: SubStatus; alerts: { included: boolean; on: boolean } };
  numbers: {
    ultra: { trades: number; volumeUsd: number | null; perTradeFeesUsd: number | null; breakEvenUsd: number | null };
    sniper: { snipes: number; feesUsd: number | null; feesSol: number };
    copy: { trades: number; feesUsd: number | null; feesSol: number };
  };
  products: Product[];
  watchersLive: boolean;
  alertsSummary: TrackSummary;
  payNote: string;
  disclaimer: string;
}
export interface TrackSummary { alerts: number; measured: number; up: number; medianPct: number | null; bestPct: number | null; days: number }

export const TIER_LABEL: Record<string, string> = { top1: 'Top 1%', top10: 'Top 10%', smart: 'Smart money' };
export const TIER_COLOR: Record<string, string> = { top1: '#B84A40', top10: '#B68B2A', smart: '#58834C' };

export function ago(ms: number | null | undefined): string {
  if (!ms) return '';
  const s = Math.max(0, Math.round((Date.now() - ms) / 1000));
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86400)} d ago`;
}
export function until(ms: number | null | undefined): string {
  if (!ms) return '';
  const s = Math.round((ms - Date.now()) / 1000);
  if (s <= 0) return 'now';
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))} min`;
  if (s < 86400) return `${Math.round(s / 3600)} h`;
  return `${Math.round(s / 86400)} d`;
}
export const dateLabel = (ms: number | null | undefined) => (ms ? new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—');

/** Poll a /premium job until it finishes (≤ ~2 min). */
export async function runPremiumJob<T>(path: string, body: Record<string, unknown>, onStage?: (s: string) => void): Promise<T & { ok: boolean; code?: string; error?: string }> {
  interface Job { id: string; status: 'running' | 'done'; stage: string; result: (T & { ok: boolean; code?: string; error?: string }) | null }
  let j = await kc<Job>(path, { method: 'POST', body });
  for (let i = 0, misses = 0; i < 120 && j.status !== 'done'; i++) {
    await new Promise(r => setTimeout(r, misses ? Math.min(6000, 1500 * misses) : 1000));
    try { j = await kc<Job>(`premium/jobs/${j.id}`); misses = 0; onStage?.(j.stage); }
    catch (e) { if (e instanceof KcError && e.status === 404) break; misses++; }
  }
  if (j.status !== 'done' || !j.result) return { ok: false, code: 'OUTCOME_UNKNOWN', error: 'Still going through — check back in a minute before trying again.' } as T & { ok: boolean; code?: string; error?: string };
  return j.result;
}

export function StatusPill({ s }: { s: SubStatus }) {
  if (!s.active) return <span className="rounded-full bg-cream-warm dark:bg-night px-2.5 py-1 text-[12px] font-semibold muted">Not active</span>;
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-semibold" style={{ background: '#58834C1A', color: '#58834C' }}>
      <IconCheck size={13} /> Active · {s.daysLeft} day{s.daysLeft === 1 ? '' : 's'} left
    </span>
  );
}

interface SubResult { ok: boolean; code?: string; error?: string; name?: string; expiresAt?: number; daysLeft?: number; paidFrom?: string; explorerUrl?: string | null }

/** Choose a plan → Pay from → hold to pay. */
export function SubscribeSheet({ product, status, open, onClose, onDone }: { product: Product | null; status: SubStatus | null; open: boolean; onClose: () => void; onDone: () => void }) {
  const [planId, setPlanId] = useState<Plan['id']>('monthly');
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState('');
  const [err, setErr] = useState('');
  const [done, setDone] = useState<SubResult | null>(null);
  const keyRef = useRef(newKey());
  const plan = product?.plans.find(p => p.id === planId) || product?.plans[0] || null;
  const pf = usePayFrom(plan?.usd ?? 20);
  useEffect(() => { if (open) { setErr(''); setDone(null); setBusy(false); setPlanId('monthly'); keyRef.current = newKey(); } }, [open, product?.id]);
  if (!product || !plan) return null;
  const renew = !!status?.active;
  const monthly = product.plans.find(p => p.id === 'monthly');

  async function pay() {
    if (!product || !plan) return;
    setBusy(true); setErr(''); setStage('paying');
    try {
      const r = await runPremiumJob<SubResult>('premium/subscribe', { product: product.id, plan: plan.id, ...pf.fromBody, idempotencyKey: keyRef.current }, setStage);
      if (r.ok || r.code === 'OUTCOME_UNKNOWN') { setDone(r); if (r.ok) onDone(); }
      else { setErr(r.error || 'The payment did not go through — nothing was taken.'); keyRef.current = newKey(); }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'The payment did not go through — nothing was taken.'); keyRef.current = newKey();
    } finally { setBusy(false); }
  }

  return (
    <Sheet open={open} onClose={() => { if (!busy) onClose(); }} title={done ? (done.ok ? `${product.name} is on` : 'Payment confirming') : `${renew ? 'Renew' : 'Get'} ${product.name}`}>
      {done ? (
        <div className="text-center py-2">
          <div className="mx-auto grid place-items-center h-16 w-16 rounded-full" style={{ background: done.ok ? '#58834C1A' : '#B68B2A1A', color: done.ok ? '#58834C' : '#B68B2A' }}>
            {done.ok ? <IconCheck size={32} /> : <span className="text-[26px] font-bold">…</span>}
          </div>
          <p className="text-[15px] text-ink dark:text-cream-warm mt-4 leading-relaxed">
            {done.ok ? <>Active until <b>{dateLabel(done.expiresAt)}</b> ({done.daysLeft} days).{done.paidFrom ? <> Paid with {done.paidFrom}.</> : null}</> : done.error}
          </p>
          {done.explorerUrl && <a href={done.explorerUrl} target="_blank" rel="noopener noreferrer" className="inline-block mt-3 text-[14px] font-semibold text-terracotta min-h-[44px] leading-[44px]">View the payment on-chain</a>}
          <button onClick={onClose} className="btn-primary w-full mt-4">Done</button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="muted text-[14px] -mt-1 leading-relaxed">{product.tagline}</p>
          {product.plans.length > 1 && (
            <div className="grid grid-cols-2 gap-2">
              {product.plans.map(p => {
                const save = monthly && p.id === 'quarterly' ? monthly.usd * (p.days / monthly.days) - p.usd : 0;
                return (
                  <button key={p.id} onClick={() => setPlanId(p.id)} aria-pressed={p.id === planId}
                    className={`rounded-2xl border p-3.5 text-left min-h-[76px] transition-colors ${p.id === planId ? 'border-terracotta bg-terracotta-soft' : 'border-cream-border dark:border-night-border'}`}>
                    <div className="font-display font-bold text-[22px] text-ink dark:text-cream-warm">${p.usd}</div>
                    <div className="text-[13px] muted">{p.days} days{save > 0 ? ` · save $${save}` : ''}</div>
                  </button>
                );
              })}
            </div>
          )}
          <PayFromPicker pf={pf} note="USDC or USDT on Solana: Kobocent pays the network fee." />
          <ul className="space-y-1.5">
            {product.perks.map(p => <li key={p} className="flex gap-2 text-[14px] text-ink dark:text-cream-warm"><IconCheck size={16} className="text-[#58834C] shrink-0 mt-0.5" />{p}</li>)}
          </ul>
          <div className="rounded-2xl bg-cream-warm dark:bg-night p-4 text-[13.5px] space-y-1">
            <div className="flex justify-between"><span className="muted">You pay</span><span className="font-semibold text-ink dark:text-cream-warm">{usd(plan.usd)}</span></div>
            <div className="flex justify-between"><span className="muted">{renew ? 'Adds' : 'Active for'}</span><span className="font-semibold text-ink dark:text-cream-warm">{plan.days} days{renew && status?.expiresAt ? ` → until ${dateLabel(status.expiresAt + plan.days * 86_400_000)}` : ''}</span></div>
            <p className="muted pt-1">{renew ? 'Renewing early never loses a day — the new days start when the current ones end.' : 'No automatic charge unless you turn on auto-renew.'}</p>
          </div>
          <ErrorNote msg={err} />
          <HoldToConfirm label={busy ? (stage === 'paying' ? 'Paying…' : 'Working…') : `Hold to pay ${usd(plan.usd)}`} onConfirm={pay} busy={busy} />
        </div>
      )}
    </Sheet>
  );
}

/** Small lock card shown where a Pro feature would be. */
export function ProLock({ title, body, cta, onClick }: { title: string; body: string; cta: string; onClick: () => void }) {
  return (
    <div className="rounded-3xl p-5 bg-ink dark:bg-night-card text-white relative overflow-hidden">
      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-terracotta/30 blur-2xl" aria-hidden />
      <div className="relative">
        <div className="text-[12px] uppercase tracking-wide text-white/60 font-semibold">Pro</div>
        <div className="font-display font-bold text-[20px] mt-1">{title}</div>
        <p className="text-[14px] text-white/75 mt-1 leading-relaxed">{body}</p>
        <button onClick={onClick} className="mt-4 rounded-2xl bg-terracotta hover:bg-terracotta-dark text-white font-semibold px-5 min-h-[48px]">{cta}</button>
      </div>
    </div>
  );
}
