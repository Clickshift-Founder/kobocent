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
}
