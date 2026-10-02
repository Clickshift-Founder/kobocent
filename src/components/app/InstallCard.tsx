'use client';
import { useEffect, useState } from 'react';
import { LogoMark } from '@/components/ui/Logo';
import { isIOS, isStandalone, getInstallPrompt, onInstallChange, clearInstallPrompt } from '@/lib/pwa';

const DISMISS_KEY = 'kc-install-dismissed';
const SHOW_AGAIN_MS = 14 * 24 * 60 * 60 * 1000;

/**
 * "Get the app" card on Home: one-tap install on Android/Chrome, step-by-step on iPhone,
 * and App Store / Google Play marked "coming soon". Hidden once installed (or opened from
 * the home screen); a dismissal is remembered for two weeks.
 */
export function InstallCard() {
  const [visible, setVisible] = useState(false);
  const [ios, setIos] = useState(false);
  const [canPrompt, setCanPrompt] = useState(false);
  const [help, setHelp] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    try {
      const at = Number(window.localStorage.getItem(DISMISS_KEY) || 0);
      if (at && Date.now() - at < SHOW_AGAIN_MS) return;
    } catch { /* ignore */ }
    setIos(isIOS());
    setCanPrompt(!!getInstallPrompt());
    setVisible(true);
    return onInstallChange(() => {
      setCanPrompt(!!getInstallPrompt());
      if (isStandalone()) setVisible(false);
    });
  }, []);

  function dismiss() {
    setVisible(false);
    try { window.localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* ignore */ }
  }

  async function install() {
    const p = getInstallPrompt();
    if (!p || ios) { setHelp(true); return; }
    await p.prompt();
    const choice = await p.userChoice.catch(() => ({ outcome: 'dismissed' as const }));
    clearInstallPrompt();
    setCanPrompt(false);
    if (choice.outcome === 'accepted') setVisible(false);
  }

  if (!visible) return null;

  return (
    <section className="relative surface rounded-3xl p-5 sm:p-6" aria-label="Install the Kobocent app">
      <button onClick={dismiss} aria-label="Dismiss" className="absolute top-3 right-3 grid place-items-center h-10 w-10 rounded-xl muted hover:text-terracotta">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
      </button>
      <div className="flex items-start gap-4 pr-8">
        <span className="grid place-items-center h-14 w-14 shrink-0 rounded-2xl bg-cream-warm dark:bg-night"><LogoMark size={36} className="text-terracotta" /></span>
        <div>
          <div className="font-display text-[19px] font-bold text-ink dark:text-cream-warm">Get the Kobocent app</div>
          <p className="muted text-[14px] leading-relaxed">Put it on your home screen — opens like any app, no store needed.</p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2.5">
        <button onClick={install} className="btn-primary !py-0 min-h-[46px] !px-5 !text-[14.5px]">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
          {ios ? 'Add to Home Screen' : canPrompt ? 'Install app' : 'How to install'}
        </button>
        <span className="inline-flex items-center rounded-xl border border-cream-border dark:border-night-border px-3.5 min-h-[46px] text-[13px] muted"> App Store · soon</span>
        <span className="inline-flex items-center rounded-xl border border-cream-border dark:border-night-border px-3.5 min-h-[46px] text-[13px] muted">▶ Google Play · soon</span>
      </div>

      {help && (
        <div className="mt-4 rounded-2xl bg-cream-warm dark:bg-night p-4 text-[14px] leading-relaxed">
          {ios ? (
            <ol className="list-decimal pl-5 space-y-1 muted">
              <li>In <strong className="text-ink dark:text-cream-warm">Safari</strong>, tap the <strong className="text-ink dark:text-cream-warm">Share</strong> button (square with an arrow).</li>
              <li>Scroll down and tap <strong className="text-ink dark:text-cream-warm">Add to Home Screen</strong>.</li>
              <li>Tap <strong className="text-ink dark:text-cream-warm">Add</strong> — Kobocent appears with your other apps.</li>
            </ol>
          ) : (
            <p className="muted">Open your browser menu (⋮) and tap <strong className="text-ink dark:text-cream-warm">Install app</strong> or <strong className="text-ink dark:text-cream-warm">Add to Home screen</strong>.</p>
          )}
        </div>
      )}
    </section>
  );
}
