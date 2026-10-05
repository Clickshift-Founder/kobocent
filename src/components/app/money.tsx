'use client';
import { useEffect, useRef, useState } from 'react';
import { CopyButton } from '@/components/app/ui';
import { IconShield } from '@/components/app/Icons';

/** Shared pieces of the money screens (withdraw, bills, …): keep every money flow consistent. */

export function newKey() {
  return (typeof crypto !== 'undefined' && 'randomUUID' in crypto) ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}-wd`;
}
export function store(k: string, v: string | null) {
  try { if (v === null) window.sessionStorage.removeItem(k); else window.sessionStorage.setItem(k, v); } catch { /* private mode */ }
}
export function read(k: string) {
  try { return window.sessionStorage.getItem(k); } catch { return null; }
}
export const initials = (s: string) => s.replace(/[^A-Za-z ]/g, '').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || 'B';

/** Smoothly counts towards `value` (the naira figure feels alive as you type). */
export function useCountUp(value: number | null, ms = 450) {
  const [shown, setShown] = useState<number | null>(value);
  const from = useRef<number>(value || 0);
  useEffect(() => {
    if (value === null) { setShown(null); return; }
    const start = performance.now(); const a = from.current; const b = value;
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / ms); const e = 1 - Math.pow(1 - k, 3);
      setShown(a + (b - a) * e);
      if (k < 1) raf = requestAnimationFrame(tick); else from.current = b;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, ms]);
  return shown;
}

/** Press-and-hold (≈1 s) button: a deliberate gesture for sending money. Enter/Space work too. */
export function HoldToConfirm({ label, onConfirm, busy }: { label: string; onConfirm: () => void; busy: boolean }) {
  const [p, setP] = useState(0);
  const raf = useRef(0);
  const startAt = useRef(0);
  const done = useRef(false);
  const HOLD = 1000;

  const stop = () => { cancelAnimationFrame(raf.current); if (!done.current) setP(0); };
  const begin = () => {
    if (busy) return;
    done.current = false;
    startAt.current = performance.now();
    const tick = (t: number) => {
      const k = Math.min(1, (t - startAt.current) / HOLD);
      setP(k);
      if (k >= 1) {
        done.current = true;
        if (navigator.vibrate) navigator.vibrate(30);
        // Ghost-tap guard (2026-10-04): confirming closes the sheet while the finger is still down;
        // lifting it then "clicks" whatever is underneath — the bottom tab bar (Swap ended up on
        // Receive). Swallow that one click.
        // 2026-10-05: no fixed window — a thumb held past it still clicked the tab bar (landed on
        // Rewards). Swallow clicks until 600 ms after the finger actually lifts (10 s backstop).
        const swallow = (ev: Event) => { ev.preventDefault(); ev.stopPropagation(); };
        const release = () => window.setTimeout(() => window.removeEventListener('click', swallow, { capture: true }), 600);
        window.addEventListener('click', swallow, { capture: true });
        window.addEventListener('pointerup', release, { capture: true, once: true });
        window.addEventListener('keyup', release, { capture: true, once: true });
        window.setTimeout(() => window.removeEventListener('click', swallow, { capture: true }), 10_000);
        onConfirm();
        return;
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  };
  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  useEffect(() => { if (!busy && done.current) { done.current = false; setP(0); } }, [busy]);

  return (
    <button
      onPointerDown={e => { e.preventDefault(); begin(); }} onPointerUp={stop} onPointerLeave={stop} onPointerCancel={stop}
      onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) { e.preventDefault(); begin(); } }}
      onKeyUp={e => { if (e.key === 'Enter' || e.key === ' ') stop(); }}
      onContextMenu={e => e.preventDefault()}
      aria-label={label} disabled={busy}
      className="relative w-full overflow-hidden rounded-2xl bg-terracotta-dark text-white font-semibold min-h-[60px] select-none touch-none"
      style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none' }}>
      <span className="absolute inset-y-0 left-0 bg-terracotta" style={{ width: `${(busy ? 1 : p) * 100}%`, transition: p === 0 ? 'width 0.25s ease' : 'none' }} />
      <span className="relative flex items-center justify-center gap-2 text-[16px]">
        {busy ? <><span className="h-5 w-5 rounded-full border-2 border-white border-t-transparent animate-spin" />Starting…</> : label}
      </span>
    </button>
  );
}


export function Outcome({ tone, title, body, reference, signature, actions }: {
  tone: 'success' | 'warn' | 'error' | 'info'; title: string; body: string; reference?: string | null; signature?: string | null; actions: React.ReactNode;
}) {
  const color = tone === 'success' ? '#58834C' : tone === 'warn' ? '#B68B2A' : tone === 'error' ? '#B84A40' : '#C1502E';
  return (
    <section className="surface rounded-3xl p-6 text-center animate-fade-up" aria-live="polite">
      <div className="mx-auto grid place-items-center h-20 w-20 rounded-full" style={{ background: `${color}1A`, color }}>
        {tone === 'success' ? (
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="m5 12 5 5 9-10" style={{ strokeDasharray: 24, strokeDashoffset: 24, animation: 'kcDraw 0.6s 0.15s ease forwards' }} />
          </svg>
        ) : tone === 'error' ? <span className="text-[34px] font-bold">!</span> : <IconShield size={36} />}
      </div>
      <h2 className="font-display text-[26px] font-bold text-ink dark:text-cream-warm mt-5 leading-tight">{title}</h2>
      <p className="muted text-[15px] leading-relaxed mt-2 max-w-sm mx-auto">{body}</p>
      {(reference || signature) && (
        <div className="mt-5 rounded-2xl bg-cream-warm dark:bg-night p-4 text-left space-y-2">
          {reference && <div className="flex items-center justify-between gap-3"><div className="min-w-0"><div className="text-[12px] muted">Reference</div><div className="font-mono text-[13px] truncate">{reference}</div></div><CopyButton value={reference} /></div>}
          {signature && signature !== reference && <a href={`https://solscan.io/tx/${signature}`} target="_blank" rel="noopener noreferrer" className="block text-[13px] text-terracotta font-semibold">View the on-chain transfer</a>}
        </div>
      )}
      <div className="mt-6 space-y-3">{actions}</div>
      <style>{`@keyframes kcDraw { to { stroke-dashoffset: 0; } }`}</style>
    </section>
  );
}
