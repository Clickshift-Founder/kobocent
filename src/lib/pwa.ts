export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function isIOS(): boolean {
  if (typeof window === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

export function registerServiceWorker() {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;
  const register = () => navigator.serviceWorker.register('/sw.js').catch(() => {
    /* non-fatal: the site works fine without offline caching */
  });
  // In the app the page is usually loaded already by the time this runs.
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register);
}

// ── Install prompt, captured once per page load ───────────────────────
// Chrome/Android fires `beforeinstallprompt` once, often before a component that wants it has
// mounted (e.g. while the sign-in page was showing). Capture it globally and let components
// subscribe.
let deferredPrompt: BeforeInstallPromptEvent | null = null;
const subscribers = new Set<() => void>();
type InstallWindow = Window & { __kcInstallCapture?: boolean };

export function initInstallCapture() {
  if (typeof window === 'undefined') return;
  const w = window as InstallWindow;
  if (w.__kcInstallCapture) return;
  w.__kcInstallCapture = true;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    subscribers.forEach((fn) => fn());
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    subscribers.forEach((fn) => fn());
  });
}

export function getInstallPrompt(): BeforeInstallPromptEvent | null {
  return deferredPrompt;
}

export function onInstallChange(fn: () => void): () => void {
  subscribers.add(fn);
  return () => { subscribers.delete(fn); };
}

export function clearInstallPrompt() {
  deferredPrompt = null;
}
