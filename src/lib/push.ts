// Phone notifications (Web Push), 2026-10-06. The backend (src/services/push.js) sends; this file asks
// the browser for permission and registers this device. Android: works in the browser. iPhone/iPad:
// only once Kobocent is added to the home screen (iOS 16.4+) — we say so instead of failing silently.
// Inside the iOS / Android apps (2026-10-13) the same switch registers the app's device token instead
// (native.ts → /push/native/register → backend src/services/nativePush.js: FCM / APNs).
import { kc } from './kc';
import { nativePlatform } from './platform';
import { nativePushPermission, nativePushToken } from './native';

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

type KeyInfo = { publicKey: string | null; native?: { ios: boolean; android: boolean } };
let keyCache: KeyInfo | undefined;
async function serverInfo(): Promise<KeyInfo> {
  if (keyCache !== undefined) return keyCache;
  try { keyCache = await kc<KeyInfo>('push/key'); } catch { keyCache = { publicKey: null }; }
  return keyCache;
}
const serverKey = async () => (await serverInfo()).publicKey;

// ── Inside the apps ──
const NATIVE_TOKEN = 'kc-native-push-token';
const savedToken = () => { try { return localStorage.getItem(NATIVE_TOKEN); } catch { return null; } };
const saveToken = (t: string | null) => { try { if (t) localStorage.setItem(NATIVE_TOKEN, t); else localStorage.removeItem(NATIVE_TOKEN); } catch { /* ignore */ } };
async function nativeReady(): Promise<boolean> {
  const p = nativePlatform();
  return !!p && !!(await serverInfo()).native?.[p];
}
async function registerNative(welcome: boolean): Promise<void> {
  const token = await nativePushToken();
  if (!token) throw new Error('Could not turn on notifications');
  await kc('push/native/register', { method: 'POST', body: { token, platform: nativePlatform(), welcome } });
  saveToken(token);
}
/** Once per app start, signed in: re-send this install's token (Apple / Google rotate them, and a phone may have
 *  changed account). Only when notifications were turned on here and are still allowed. Never throws. */
let synced = false;
export async function syncNativePush(): Promise<void> {
  if (synced || !nativePlatform() || !savedToken()) return;
  synced = true;
  try {
    if (!(await nativeReady()) || (await nativePushPermission(false)) !== 'granted') return;
    await registerNative(false);
  } catch { /* try again next start */ }
}

export async function pushState(): Promise<PushState> {
  if (nativePlatform()) {
    if (!(await nativeReady())) return 'off-server';
    const perm = await nativePushPermission(false);
    return perm === 'denied' ? 'denied' : perm === 'granted' && savedToken() ? 'on' : 'off';
  }
  if (!supported()) return isIOS() && !isStandalone() ? 'ios-install' : 'unsupported';
  if (!(await serverKey())) return 'off-server';
  if (Notification.permission === 'denied') return 'denied';
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  return sub && Notification.permission === 'granted' ? 'on' : 'off';
}

/** Ask permission (must run from a tap), subscribe this device, register it with the backend. */
export async function enablePush(): Promise<PushState> {
  if (nativePlatform()) {
    if (!(await nativeReady())) return 'off-server';
    const perm = await nativePushPermission(true);
    if (perm !== 'granted') return perm === 'denied' ? 'denied' : 'off';
    await registerNative(true);
    return 'on';
  }
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
  if (nativePlatform()) {
    const token = savedToken();
    if (token) await kc('push/native/unregister', { method: 'POST', body: { token } }).catch(() => {});
    saveToken(null);
    return 'off';
  }
  const reg = await navigator.serviceWorker?.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    await kc('push/unsubscribe', { method: 'POST', body: { endpoint: sub.endpoint } }).catch(() => {});
    await sub.unsubscribe().catch(() => {});
  }
  return 'off';
}
