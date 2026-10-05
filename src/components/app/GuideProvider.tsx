'use client';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { kc } from '@/lib/kc';
import { TOUR, tourKey, tipFor, tipKey, TIPS, type Tip, type TourStep } from '@/lib/guide';
import { Sheet } from './ui';

/**
 * In-app product guide (2026-10-05): a first-run tour on Home, a tip the first time each feature is
 * opened, and a reminder that both can be replayed from Settings → Product guide. What was seen is
 * stored per account (backend /guide) with a device copy as fallback. Never shows over another
 * dialog (PIN, payment sheets): it waits until the screen is clear.
 * Settings drives it with window events: kc-guide-replay, kc-guide-tip (detail: key), kc-guide-reset.
 */
const LOCAL = 'kc-guide-seen';
const readLocal = (): Record<string, number> => { try { return JSON.parse(window.localStorage.getItem(LOCAL) || '{}'); } catch { return {}; } };
const writeLocal = (m: Record<string, number>) => { try { window.localStorage.setItem(LOCAL, JSON.stringify(m)); } catch { /* private mode */ } };
const dialogOpen = () => !!document.querySelector('[role="dialog"]');

export function GuideProvider() {
  const pathname = usePathname() || '';
  const params = useSearchParams();
  const router = useRouter();
  const [seen, setSeen] = useState<Record<string, number> | null>(null);
  const [touring, setTouring] = useState(false);
  const [tip, setTip] = useState<(Tip & { route: string }) | null>(null);
  const [toast, setToast] = useState('');
  const toldThisSession = useRef(false);

  useEffect(() => {
    const local = readLocal();
    kc<{ seen: Record<string, number> }>('guide').then(r => { const m = { ...local, ...(r.seen || {}) }; writeLocal(m); setSeen(m); }).catch(() => setSeen(local));
  }, []);

  const markSeen = useCallback((key: string) => {
    setSeen(prev => { const m = { ...(prev || {}), [key]: Date.now() }; writeLocal(m); return m; });
    kc('guide/seen', { method: 'POST', body: { key } }).catch(() => {});
  }, []);

  const remind = useCallback((force = false) => {
    if (toldThisSession.current && !force) return;
    toldThisSession.current = true;
    setToast('You can replay the guide anytime in Settings → Product guide.');
    window.setTimeout(() => setToast(''), 5000);
  }, []);

  // Start the tour on Home for first-timers, or on demand (?tour=1 from Settings).
  useEffect(() => {
    if (!seen || touring) return;
    const wanted = pathname === '/app' && (params.get('tour') === '1' || !seen[tourKey()]);
    if (!wanted) return;
    let t: ReturnType<typeof setTimeout>;
    const tryStart = () => { if (dialogOpen()) { t = setTimeout(tryStart, 1500); return; } setTip(null); setTouring(true); };
    t = setTimeout(tryStart, 1200);
    return () => clearTimeout(t);
  }, [seen, pathname, params, touring]);

  // A tip the first time each feature is opened (not during the tour).
  useEffect(() => {
    if (!seen || touring || pathname === '/app') return;
    const tp = tipFor(pathname);
    if (!tp || seen[tipKey(tp)]) return;
    let t: ReturnType<typeof setTimeout>;
    const tryShow = () => { if (dialogOpen()) { t = setTimeout(tryShow, 1500); return; } setTip(tp); };
    t = setTimeout(tryShow, 700);
    return () => clearTimeout(t);
  }, [seen, pathname, touring]);

  // Settings controls.
  useEffect(() => {
    const replay = () => { router.push('/app?tour=1'); };
    const showTip = (e: Event) => { const key = (e as CustomEvent<string>).detail; const tp = TIPS.find(x => x.key === key); if (tp) setTip(tp); };
    const reset = () => { setSeen(prev => { const m = Object.fromEntries(Object.entries(prev || {}).filter(([k]) => !k.startsWith('tip:'))); writeLocal(m); return m; }); kc('guide/reset', { method: 'POST', body: { tipsOnly: true } }).catch(() => {}); };
    window.addEventListener('kc-guide-replay', replay);
    window.addEventListener('kc-guide-tip', showTip);
    window.addEventListener('kc-guide-reset', reset);
    return () => { window.removeEventListener('kc-guide-replay', replay); window.removeEventListener('kc-guide-tip', showTip); window.removeEventListener('kc-guide-reset', reset); };
  }, [router]);

  function endTour(completed: boolean) {
    setTouring(false);
    markSeen(tourKey());
    if (params.get('tour') === '1') router.replace('/app');
    if (!completed) remind(true);
  }

  return (
    <>
      {touring && <Tour steps={TOUR} onDone={() => endTour(true)} onSkip={() => endTour(false)} />}
      <Sheet open={!!tip} onClose={() => { if (tip) markSeen(tipKey(tip)); setTip(null); remind(); }} title={tip?.title || ''}>
        {tip && (
          <div className="space-y-4">
            <p className="text-[14.5px] text-ink dark:text-cream-warm">{tip.intro}</p>
            <div>
              <div className="eyebrow mb-2">How it works</div>
              <ol className="space-y-2">
                {tip.steps.map((s, i) => (
                  <li key={i} className="flex gap-3 text-[14px] leading-relaxed">
                    <span className="grid place-items-center h-6 w-6 shrink-0 rounded-full bg-terracotta text-white text-[12px] font-bold">{i + 1}</span><span>{s}</span>
                  </li>
                ))}
              </ol>
            </div>
            {tip.good.length > 0 && (
              <div className="rounded-2xl bg-cream-warm dark:bg-night p-4">
                <div className="eyebrow mb-1.5">Good to know</div>
                <ul className="space-y-1.5 text-[13.5px] muted leading-relaxed list-disc pl-4">{tip.good.map((g, i) => <li key={i}>{g}</li>)}</ul>
              </div>
            )}
            <button onClick={() => { markSeen(tipKey(tip)); setTip(null); remind(); }} className="btn-primary w-full">Got it</button>
          </div>
        )}
      </Sheet>
      {toast && (
        <div className="fixed inset-x-4 bottom-24 lg:bottom-8 z-[80] flex justify-center pointer-events-none" role="status" aria-live="polite">
          <div className="pointer-events-auto max-w-md rounded-2xl bg-ink text-cream-warm dark:bg-cream-warm dark:text-ink px-4 py-3 text-[14px] shadow-lift flex items-center gap-3">
            <span>💡</span><span className="flex-1">{toast}</span>
            <button onClick={() => setToast('')} className="text-[13px] font-semibold opacity-80 min-h-[36px] px-1">OK</button>
          </div>
        </div>
      )}
    </>
  );
}

/** Spotlight tour: dims the screen, cuts out the target, explains it in a card. Mobile-first. */
function Tour({ steps, onDone, onSkip }: { steps: TourStep[]; onDone: () => void; onSkip: () => void }) {
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const step = steps[i];
  const last = i === steps.length - 1;

  const findTarget = useCallback((): HTMLElement | null => {
    if (!step.target) return null;
    const els = Array.from(document.querySelectorAll<HTMLElement>(`[data-tour="${step.target}"]`));
    return els.find(el => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden') || null;
  }, [step]);

  useLayoutEffect(() => {
    setRect(null);
    const el = findTarget();
    if (!el) return;
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    const measure = () => setRect(el.getBoundingClientRect());
    const t = setTimeout(measure, 380);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => { clearTimeout(t); window.removeEventListener('resize', measure); window.removeEventListener('scroll', measure, true); };
  }, [findTarget]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onSkip();
      else if (e.key === 'ArrowRight' || e.key === 'Enter') (last ? onDone() : setI(x => x + 1));
      else if (e.key === 'ArrowLeft') setI(x => Math.max(0, x - 1));
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [last, onDone, onSkip]);

  const pad = 8;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const cardAtTop = !!rect && rect.top + rect.height / 2 > vh / 2;   // keep the card away from what it explains
  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label={`Product tour, step ${i + 1} of ${steps.length}`}>
      {/* Click shield + dim. With a target, the dim comes from the cut-out's shadow. */}
      <div className="absolute inset-0" style={{ background: rect ? 'transparent' : 'rgba(20,17,15,0.62)' }} />
      {rect && (
        <div className="absolute rounded-2xl transition-all duration-300 pointer-events-none ring-2 ring-white/80"
          style={{ top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2, boxShadow: '0 0 0 9999px rgba(20,17,15,0.62)' }} />
      )}
      <div className={`absolute inset-x-0 flex justify-center px-4 ${rect ? (cardAtTop ? 'top-4' : 'bottom-4') : 'top-1/2 -translate-y-1/2'}`}
        style={rect ? (cardAtTop ? { paddingTop: 'env(safe-area-inset-top)' } : { paddingBottom: 'env(safe-area-inset-bottom)' }) : undefined}>
        <div className="w-full max-w-md surface rounded-3xl p-5 shadow-lift animate-fade-up max-h-[70dvh] overflow-y-auto">
          <div className="flex items-center justify-between gap-3">
            <div className="flex gap-1" aria-hidden>
              {steps.map((_, k) => <span key={k} className={`h-1.5 rounded-full transition-all ${k === i ? 'w-5 bg-terracotta' : k < i ? 'w-1.5 bg-terracotta/50' : 'w-1.5 bg-cream-border dark:bg-night-border'}`} />)}
            </div>
            <span className="text-[12px] muted shrink-0">{i + 1} of {steps.length}</span>
          </div>
          <h3 className="font-display text-[20px] font-bold text-ink dark:text-cream-warm mt-3">{step.title}</h3>
          <p className="text-[14.5px] leading-relaxed mt-1.5">{step.body}</p>
          {step.bullets && step.bullets.length > 0 && (
            <ul className="mt-3 space-y-1.5 text-[13.5px] muted leading-relaxed list-disc pl-4">{step.bullets.map((b, k) => <li key={k}>{b}</li>)}</ul>
          )}
          <div className="mt-5 flex items-center gap-2">
            {!last && <button onClick={onSkip} className="text-[14px] muted min-h-[44px] px-2 mr-auto">Skip tour</button>}
            {i > 0 && <button onClick={() => setI(x => x - 1)} className={`btn-ghost min-h-[44px] px-4 ${last ? 'mr-auto' : ''}`}>Back</button>}
            <button onClick={() => (last ? onDone() : setI(x => x + 1))} className="btn-primary min-h-[44px] px-5">{i === 0 ? 'Show me around' : last ? 'Start using Kobocent' : 'Next'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
