'use client';
import { useEffect, useState } from 'react';
import { IconCopy, IconCheck, IconBank, IconBolt, IconChart, IconLeaf, IconBridge, IconSend, IconClose } from './Icons';
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
        {/* Every sheet can be closed from the corner, not only by its buttons (design rule). */}
        <button onClick={onClose} aria-label="Close" className="absolute top-3 right-3 grid place-items-center h-11 w-11 rounded-xl muted hover:text-terracotta"><IconClose /></button>
        <h3 className="font-display text-[21px] font-bold text-ink dark:text-cream-warm mb-2 pr-10">{title}</h3>
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
    case 'withdrawal':
      return { title: i.bank ? `Withdrew to ${i.bank}` : 'Bank withdrawal', sub: i.counterparty || 'To your bank', value: naira(i.amountNgn), Icon: IconBank, negative: true };
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

/**
 * "Get receipt": fetches the same receipt image Telegram sends (the backend redraws it from the
 * record), previews it, and offers Share (phones: straight to WhatsApp etc.) and Download.
 * Withdrawals only for now; the receipt exists once the bank has confirmed the payout.
 */
export function ReceiptButton({ reference, kind = 'withdrawal', className = 'btn-ghost w-full' }: { reference: string; kind?: 'withdrawal' | 'utility'; className?: string }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [img, setImg] = useState<{ url: string; file: File } | null>(null);
  useEffect(() => () => { if (img) URL.revokeObjectURL(img.url); }, [img]);

  async function open() {
    setBusy(true); setMsg('');
    try {
      const res = await fetch(`/api/kc/receipts/${kind}/${encodeURIComponent(reference)}`, { cache: 'no-store' });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        setMsg(d.error || 'Receipt not available yet');
        return;
      }
      const blob = await res.blob();
      const file = new File([blob], `Kobocent-Receipt-${reference.slice(-12)}.png`, { type: 'image/png' });
      setImg({ url: URL.createObjectURL(blob), file });
    } catch {
      setMsg('Could not load the receipt — check your connection');
    } finally {
      setBusy(false);
    }
  }
  const canShare = typeof navigator !== 'undefined' && !!img && !!navigator.canShare?.({ files: [img.file] });

  return (
    <>
      <button onClick={open} disabled={busy} className={className}>
        {busy && <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />}
        {busy ? 'Getting receipt…' : 'Get receipt'}
      </button>
      {msg && <p className="mt-2 text-center text-[13.5px] muted">{msg}</p>}
      <Sheet open={!!img} onClose={() => setImg(null)} title="Receipt">
        {img && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.url} alt="Kobocent receipt" className="w-full max-h-[60vh] object-contain rounded-2xl border border-cream-border dark:border-night-border bg-white" />
            <div className="mt-4 grid grid-cols-2 gap-3">
              {canShare && (
                <button onClick={() => navigator.share({ files: [img.file], title: 'Kobocent receipt' }).catch(() => {})} className="btn-primary">Share</button>
              )}
              <a href={img.url} download={img.file.name} className={canShare ? 'btn-ghost' : 'btn-primary col-span-2'}>Download</a>
            </div>
          </>
        )}
      </Sheet>
    </>
  );
}

export function ActivityRow({ item }: { item: HistoryItem }) {
  const d = describe(item);
  const failed = item.status && /fail|reject|cancel/i.test(item.status);
  const pending = item.status && /pend|process|unconfirmed/i.test(item.status);
  const [open, setOpen] = useState(false);
  // Withdrawals open a detail sheet with the receipt (proof of payment).
  const tappable = (item.kind === 'withdrawal' || item.kind === 'utility') && !!item.reference;
  const row = (
    <>
      <span className="grid place-items-center h-11 w-11 shrink-0 rounded-2xl bg-cream-warm dark:bg-night text-terracotta">
        <d.Icon size={20} />
      </span>
      <div className="min-w-0 flex-1 text-left">
        <div className="truncate text-[15px] font-medium text-ink dark:text-cream-warm">{d.title}</div>
        <div className="truncate text-[13px] muted">{d.sub}{item.at ? ` · ${timeLabel(item.at)}` : ''}</div>
      </div>
      <div className="text-right shrink-0">
        <div className={`font-mono text-[14.5px] ${d.negative ? 'text-ink dark:text-cream-warm' : 'text-[#58834C]'}`}>{d.value}</div>
        {(failed || pending) && (
          <div className={`text-[11.5px] font-medium ${failed ? 'text-[#B84A40]' : 'text-[#B68B2A]'}`}>{failed ? 'Failed' : 'Pending'}</div>
        )}
      </div>
    </>
  );
  if (!tappable) return <li className="flex items-center gap-3.5 py-3.5">{row}</li>;
  const done = !item.status || /complet|success/i.test(item.status);
  return (
    <li>
      <button onClick={() => setOpen(true)} className="w-full flex items-center gap-3.5 py-3.5 min-h-[64px] active:opacity-70">{row}</button>
      <Sheet open={open} onClose={() => setOpen(false)} title={d.title}>
        <div className="text-center py-2">
          <div className="font-display font-bold text-[34px] text-ink dark:text-cream-warm">{d.value}</div>
          <div className="muted text-[14px]">{item.at ? timeLabel(item.at) : ''}{item.status ? ` · ${item.status}` : ''}</div>
        </div>
        <dl className="mt-3 rounded-2xl bg-cream-warm dark:bg-night p-4 grid grid-cols-[auto,1fr] gap-x-4 gap-y-2 text-[14px]">
          {item.counterparty && (<><dt className="muted">To</dt><dd className="text-right font-medium">{item.counterparty}</dd></>)}
          {item.amountUsd ? (<><dt className="muted">Withdrew</dt><dd className="text-right font-mono">{usd(item.amountUsd)}</dd></>) : null}
          <dt className="muted">Reference</dt><dd className="text-right font-mono text-[12.5px] break-all">{item.reference}</dd>
        </dl>
        <div className="mt-5">
          {done
            ? <ReceiptButton reference={item.reference!} kind={item.kind === 'utility' ? 'utility' : 'withdrawal'} className="btn-primary w-full" />
            : <p className="text-center muted text-[14px]">The receipt is ready once this payment is completed.</p>}
        </div>
      </Sheet>
    </li>
  );
}
