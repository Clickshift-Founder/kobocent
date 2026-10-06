// Phone notifications (Web Push), 2026-10-06. The backend (src/services/push.js) sends; this file asks
// the browser for permission and registers this device. Android: works in the browser. iPhone/iPad:
// only once Kobocent is added to the home screen (iOS 16.4+) — we say so instead of failing silently.
import { kc } from './kc';

export type PushState = 'unsupported' | 'ios-install' | 'off-server' | 'denied' | 'on' | 'off';

const isIOS = () => typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);
export const isStandalone = () => typeof window !== 'undefined' &&
  (window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);
const supported = () => typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

function keyBytes(base64url: string): Uint8Array {
  const pad = '='.repeat((4 - (base64url.length % 4)) % 4);
  const raw = atob((base64url + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}

let keyCache: string | null | undefined;
async function serverKey(): Promise<string | null> {
  if (keyCache !== undefined) return keyCache;
  try { keyCache = (await kc<{ publicKey: string | null }>('push/key')).publicKey; } catch { keyCache = null; }
  return keyCache;
}

export async function pushState(): Promise<PushState> {
  if (!supported()) return isIOS() && !isStandalone() ? 'ios-install' : 'unsupported';
  if (!(await serverKey())) return 'off-server';
  if (Notification.permission === 'denied') return 'denied';
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  return sub && Notification.permission === 'granted' ? 'on' : 'off';
}

/** Ask permission (must run from a tap), subscribe this device, register it with the backend. */
export async function enablePush(): Promise<PushState> {
  if (!supported()) return isIOS() && !isStandalone() ? 'ios-install' : 'unsupported';
  const key = await serverKey();
  if (!key) return 'off-server';
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') return perm === 'denied' ? 'denied' : 'off';
  const reg = (await navigator.serviceWorker.getRegistration()) || (await navigator.serviceWorker.register('/sw.js'));
  await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(key) as BufferSource });
  await kc('push/subscribe', { method: 'POST', body: { subscription: sub.toJSON(), standalone: isStandalone() } });
  return 'on';
}

export async function disablePush(): Promise<PushState> {
  const reg = await navigator.serviceWorker?.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    await kc('push/unsubscribe', { method: 'POST', body: { endpoint: sub.endpoint } }).catch(() => {});
    await sub.unsubscribe().catch(() => {});
  }
  return 'off';
}
