/**
 * Native features when the web app runs inside the Kobocent iOS / Android shell (kobocent-web/mobile, Capacitor), 2026-10-12.
 * The shell loads kobocent.com/app; Capacitor injects window.Capacitor with proxies to the native plugins installed in the
 * shell, so this file needs no npm packages. In a browser every function here is a no-op.
 *
 *  - Sign-in: Google blocks its sign-in inside app webviews ("disallowed_useragent") and Apple's JS popup is unreliable in
 *    WKWebView, so the apps sign in natively (@capgo/capacitor-social-login) and hand the ID token to the same
 *    /api/auth/google and /api/auth/apple routes as the web. Backend: GOOGLE_APP_CLIENT_IDS, APPLE_CLIENT_IDS.
 *  - Android back button: goes back in the app's history, and leaves the app from the home screen.
 *  - Status bar: matches the light / dark theme.
 *  - Notifications (push.ts → backend src/services/nativePush.js), Face ID / fingerprint in place of typing the PIN
 *    (SecurityProvider, SecuritySettings), QR scanner for wallet addresses (ScanButton) — 2026-10-13.
 */
import { nativePlatform } from './platform';

type PluginProxy = Record<string, (...a: unknown[]) => Promise<unknown>> & { addListener?: (e: string, cb: (x: unknown) => void) => Promise<unknown> };
type CapWithPlugins = { Plugins?: Record<string, PluginProxy> };
const plugin = (name: string): PluginProxy | null =>
  (typeof window !== 'undefined' && (window.Capacitor as unknown as CapWithPlugins | undefined)?.Plugins?.[name]) || null;

const GOOGLE_WEB_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
const GOOGLE_IOS_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_IOS_CLIENT_ID || '';

let initialised: Promise<void> | null = null;
function initSocial(): Promise<void> {
  const s = plugin('SocialLogin');
  if (!s) return Promise.reject(new Error('Sign-in is not available in this version of the app — update it from the store'));
  if (!initialised) {
    initialised = s.initialize({
      google: { webClientId: GOOGLE_WEB_CLIENT_ID, ...(GOOGLE_IOS_CLIENT_ID ? { iOSClientId: GOOGLE_IOS_CLIENT_ID, iOSServerClientId: GOOGLE_WEB_CLIENT_ID } : {}) },
      apple: {},
    }).then(() => undefined).catch((e) => { initialised = null; throw e; });
  }
  return initialised;
}

export const nativeSignInAvailable = () => !!nativePlatform();
/** Apple sign-in natively on iOS only (on Android the web flow would be needed — Google covers Android). */
export const nativeAppleAvailable = () => nativePlatform() === 'ios';

/** Native Google / Apple sign-in → the identity token the backend verifies, plus the name Apple gives on first sign-in. */
export async function nativeSignIn(provider: 'google' | 'apple'): Promise<{ idToken: string; name: string | null }> {
  await initSocial();
  const r = (await plugin('SocialLogin')!.login({ provider, options: provider === 'google' ? { scopes: ['email', 'profile'] } : { scopes: ['email', 'name'] } })) as {
    result?: { idToken?: string | null; identityToken?: string | null; profile?: { givenName?: string | null; familyName?: string | null; name?: string | null } };
  };
  const res = r?.result || {};
  const idToken = res.idToken || res.identityToken || '';
  if (!idToken) throw new Error('Sign-in was cancelled');
  const p = res.profile || {};
  const name = p.name || [p.givenName, p.familyName].filter(Boolean).join(' ') || null;
  return { idToken, name };
}

/** Once per app start: back button and status bar. Safe to call in a browser. */
let started = false;
export function startNative(theme: 'light' | 'dark') {
  if (!nativePlatform()) return;
  plugin('StatusBar')?.setStyle?.({ style: theme === 'dark' ? 'DARK' : 'LIGHT' }).catch(() => {});
  if (started) return;
  started = true;
  plugin('App')?.addListener?.('backButton', (e) => {
    const canGoBack = (e as { canGoBack?: boolean })?.canGoBack;
    if (canGoBack && window.location.pathname !== '/app') window.history.back();
    else plugin('App')?.exitApp?.().catch(() => {});
  }).catch(() => {});
  plugin('SplashScreen')?.hide?.().catch(() => {});
  const push = plugin('PushNotifications');
  if (push) {
    // Android 8+: notifications need a channel; the backend sends on 'kobocent' (src/services/nativePush.js).
    if (nativePlatform() === 'android') push.createChannel?.({ id: 'kobocent', name: 'Kobocent', description: 'Money in, payments and support replies', importance: 4, visibility: 1, vibration: true }).catch(() => {});
    // A tapped notification opens the page it is about (the same `url` Web Push uses).
    push.addListener?.('pushNotificationActionPerformed', (a) => {
      const url = (a as { notification?: { data?: { url?: unknown } } })?.notification?.data?.url;
      if (typeof url === 'string' && url.startsWith('/') && !url.startsWith('//')) window.location.assign(url);
    }).catch(() => {});
  }
}

// ── Notifications (2026-10-13): the device token for FCM (Android) / APNs (iOS), registered with the backend in push.ts ──
export type NativePermission = 'granted' | 'denied' | 'prompt';
export async function nativePushPermission(ask: boolean): Promise<NativePermission> {
  const p = plugin('PushNotifications');
  if (!p) return 'denied';
  const r = (await (ask ? p.requestPermissions() : p.checkPermissions())) as { receive?: string };
  return r?.receive === 'granted' ? 'granted' : r?.receive === 'denied' ? 'denied' : 'prompt';
}
/** Registers with Apple / Google and resolves with this install's token. Needs permission first. */
export async function nativePushToken(): Promise<string> {
  const p = plugin('PushNotifications');
  if (!p?.addListener) throw new Error('Notifications are not available in this version of the app — update it from the store');
  const listen = p.addListener;
  const handles: { remove?: () => unknown }[] = [];
  try {
    return await new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Your phone didn’t answer — try again')), 20_000);
      Promise.all([
        listen('registration', (t) => { clearTimeout(timer); resolve(String((t as { value?: string })?.value || '')); }),
        listen('registrationError', (e) => { clearTimeout(timer); reject(new Error((e as { error?: string })?.error || 'Could not turn on notifications')); }),
      ]).then((h) => { handles.push(...(h as { remove?: () => unknown }[])); return p.register(); })
        .catch((e) => { clearTimeout(timer); reject(e); });
    });
  } finally { handles.forEach((h) => { try { h.remove?.(); } catch { /* ignore */ } }); }
}

// ── Face ID / fingerprint (2026-10-13) ──
// The 6-digit PIN is kept in the phone's secure storage (iOS Keychain / Android Keystore) and released only after
// Face ID / fingerprint; the backend then checks it exactly like a typed PIN. Per phone, per account.
const BIO_SERVER = 'com.kobocent.app.pin';
const BIO_FLAG = 'kc-bio-account';
export type BiometricKind = 'face' | 'fingerprint' | 'biometrics';
export async function biometricKind(): Promise<BiometricKind | null> {
  const b = plugin('NativeBiometric');
  if (!b) return null;
  try {
    const r = (await b.isAvailable({ useFallback: false })) as { isAvailable?: boolean; biometryType?: number };
    if (!r?.isAvailable) return null;
    return r.biometryType === 2 || r.biometryType === 4 ? 'face' : r.biometryType === 1 || r.biometryType === 3 ? 'fingerprint' : 'biometrics';
  } catch { return null; }
}
export const biometricLabel = (k: BiometricKind | null) => {
  const ios = nativePlatform() === 'ios';
  return k === 'face' ? (ios ? 'Face ID' : 'face unlock') : k === 'fingerprint' ? (ios ? 'Touch ID' : 'fingerprint') : 'biometrics';
};
const bioAccount = () => { try { return localStorage.getItem(BIO_FLAG); } catch { return null; } };
/** On for this account on this phone. */
export const biometricOn = (accountId: string | null | undefined) => !!accountId && !!nativePlatform() && bioAccount() === accountId;
export async function biometricEnable(pin: string, accountId: string, kind: BiometricKind | null) {
  const b = plugin('NativeBiometric');
  if (!b) throw new Error('Not available on this phone');
  await b.verifyIdentity({ reason: `Turn on ${biometricLabel(kind)} for Kobocent`, title: 'Kobocent', subtitle: `Turn on ${biometricLabel(kind)}`, negativeButtonText: 'Cancel' });
  await b.setCredentials({ username: accountId, password: pin, server: BIO_SERVER });
  try { localStorage.setItem(BIO_FLAG, accountId); } catch { /* ignore */ }
}
export async function biometricDisable() {
  try { localStorage.removeItem(BIO_FLAG); } catch { /* ignore */ }
  await plugin('NativeBiometric')?.deleteCredentials({ server: BIO_SERVER }).catch(() => {});
}
/** After the PIN changes, keep the stored copy in step. */
export async function biometricUpdatePin(pin: string, accountId: string | null | undefined) {
  if (!biometricOn(accountId)) return;
  await plugin('NativeBiometric')?.setCredentials({ username: accountId!, password: pin, server: BIO_SERVER }).catch(() => {});
}
/** Face ID / fingerprint → the stored PIN, or null (cancelled, failed, not set up, or another account's). */
export async function biometricPin(accountId: string | null | undefined, reason: string): Promise<string | null> {
  if (!biometricOn(accountId)) return null;
  const b = plugin('NativeBiometric');
  if (!b) return null;
  try {
    await b.verifyIdentity({ reason, title: 'Kobocent', subtitle: reason, negativeButtonText: 'Use PIN' });
    const c = (await b.getCredentials({ server: BIO_SERVER })) as { username?: string; password?: string };
    return c?.username === accountId && /^\d{6}$/.test(c?.password || '') ? c.password! : null;
  } catch { return null; }
}

// ── QR scanner (2026-10-13) ──
export const scanAvailable = () => !!nativePlatform() && !!plugin('CapacitorBarcodeScanner');
/** Opens the camera; resolves with the QR code's text, or null if cancelled. */
export async function scanQr(instructions: string): Promise<string | null> {
  const s = plugin('CapacitorBarcodeScanner');
  if (!s) return null;
  try {
    // hint 0 = QR code; camera 1 = back; orientation 1 = portrait (the plugin's own JS wrapper normally fills these in).
    const r = (await s.scanBarcode({ hint: 0, scanInstructions: instructions, scanButton: false, scanText: ' ', cameraDirection: 1, scanOrientation: 1 })) as { ScanResult?: string };
    return r?.ScanResult?.trim() || null;
  } catch { return null; }
}
