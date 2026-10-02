'use client';
import { useEffect, useState } from 'react';
import { IconCopy, IconCheck, IconBank, IconBolt, IconChart, IconLeaf, IconBridge, IconSend } from './Icons';
import { naira, usd, amount, timeLabel, type HistoryItem } from '@/lib/kc';

export function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-3 mb-3">
      <h2 className="font-display text-[19px] font-bold text-ink dark:text-cream-warm">{children}</h2>
      {action}
    </div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-cream-warm dark:bg-night-card ${className}`} />;
}

export function CopyButton({ value, label = 'Copy' }: { value: string; label?: string }) {
  const [done, setDone] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setDone(true);
      setTimeout(() => setDone(false), 1800);
    } catch { /* clipboard blocked */ }
  }
  return (
    <button onClick={copy} className="inline-flex items-center gap-2 rounded-xl border border-cream-border dark:border-night-border px-4 min-h-[44px] text-[14px] font-medium hover:border-terracotta hover:text-terracotta transition-colors">
      {done ? <IconCheck className="text-[#58834C]" /> : <IconCopy />}{done ? 'Copied' : label}
    </button>
  );
}

/** Bottom sheet on phones, centred dialog on larger screens. Esc / backdrop closes. */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <button className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]" aria-label="Close" onClick={onClose} />
      <div className="relative w-full sm:max-w-md surface rounded-t-3xl sm:rounded-3xl p-6 pb-8 shadow-lift animate-fade-up"
           style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))' }}>
        <div className="sm:hidden mx-auto mb-4 h-1.5 w-10 rounded-full bg-cream-border dark:bg-night-border" />
        <h3 className="font-display text-[21px] font-bold text-ink dark:text-cream-warm mb-2">{title}</h3>
        {children}
      </div>
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="surface rounded-2xl p-8 text-center">
      <div className="font-semibold text-ink dark:text-cream-warm mb-1.5">{title}</div>
      <p className="muted text-[14px] leading-relaxed mb-4">{body}</p>
      {action}
    </div>
  );
}

function describe(i: HistoryItem): { title: string; sub: string; value: string; Icon: (p: { size?: number }) => JSX.Element; negative: boolean } {
  const side = (i.side || '').toUpperCase();
  switch (i.kind) {
    case 'bank_transfer':
      return { title: i.counterparty ? `To ${i.counterparty}` : 'Bank transfer', sub: i.bank || 'Bank transfer', value: naira(i.amountNgn), Icon: IconBank, negative: true };
    case 'utility':
      return { title: i.service || 'Bill payment', sub: 'Bills & utilities', value: naira(i.amountNgn), Icon: IconBolt, negative: true };
    case 'yield':
      return { title: `Earn · ${i.plan || 'staking'}`, sub: i.earned ? `Earned ${amount(i.earned)} ${i.asset || ''}` : 'Staking', value: `${amount(i.amount)} ${i.asset || ''}`, Icon: IconLeaf, negative: false };
    case 'bridge':
      return { title: `Bridged in${i.fromChain ? ` from ${i.fromChain}` : ''}`, sub: i.asset || 'Bridge', value: usd(i.amountUsd), Icon: IconBridge, negative: false };
    case 'wallet_transfer':
      return { title: `Sent ${i.asset || ''}`.trim(), sub: i.chain ? `On ${i.chain}` : 'Wallet transfer', value: usd(i.amountUsd), Icon: IconSend, negative: true };
    case 'sniper':
      return { title: `Snipe ${i.asset || 'token'}`, sub: 'Sniper', value: i.amountSol ? `${amount(i.amountSol)} SOL` : '—', Icon: IconChart, negative: true };
    case 'copy_trade':
      return { title: `Copy ${side.toLowerCase() || 'trade'} ${i.asset || ''}`.trim(), sub: 'Copy trading', value: i.status || '—', Icon: IconChart, negative: false };
    default:
      return { title: `${side === 'SELL' ? 'Sold' : side === 'BUY' ? 'Bought' : 'Traded'} ${i.asset || 'token'}`, sub: 'Trade', value: usd(i.amountUsd), Icon: IconChart, negative: side === 'BUY' };
  }
}

export function ActivityRow({ item }: { item: HistoryItem }) {
  const d = describe(item);
  const failed = item.status && /fail|reject|cancel/i.test(item.status);
  const pending = item.status && /pend|process|unconfirmed/i.test(item.status);
  return (
    <li className="flex items-center gap-3.5 py-3.5">
      <span className="grid place-items-center h-11 w-11 shrink-0 rounded-2xl bg-cream-warm dark:bg-night text-terracotta">
        <d.Icon size={20} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-medium text-ink dark:text-cream-warm">{d.title}</div>
        <div className="truncate text-[13px] muted">{d.sub}{item.at ? ` · ${timeLabel(item.at)}` : ''}</div>
      </div>
      <div className="text-right shrink-0">
        <div className={`font-mono text-[14.5px] ${d.negative ? 'text-ink dark:text-cream-warm' : 'text-[#58834C]'}`}>{d.value}</div>
        {(failed || pending) && (
          <div className={`text-[11.5px] font-medium ${failed ? 'text-[#B84A40]' : 'text-[#B68B2A]'}`}>{failed ? 'Failed' : 'Pending'}</div>
        )}
      </div>
    </li>
  );
}
