/**
 * Where the web app is running (2026-10-12): a browser, or inside the iOS / Android app shell (Capacitor — see MOBILE_LAUNCH.md
 * in the backend repo). Store rules differ:
 *  - iOS (App Store 3.1.1 / 3.1.3(b)): premium subscriptions unlocked in the app must be sold through Apple's in-app purchase —
 *    never with crypto, and the app may not point users to buy them elsewhere. Until IAP is wired, the iOS app hides buying.
 *  - iOS (3.1.5(v)): crypto apps may not pay currency for encouraging others to download — the referral-commission offer is
 *    hidden in the iOS app (earned commissions still show).
 * In a browser (including the PWA) nothing changes.
 */
type Cap = { isNativePlatform?: () => boolean; getPlatform?: () => string };
declare global { interface Window { Capacitor?: Cap } }

export function nativePlatform(): 'ios' | 'android' | null {
  if (typeof window === 'undefined') return null;
  const c = window.Capacitor;
  if (!c?.isNativePlatform?.()) return null;
  const p = c.getPlatform?.();
  return p === 'ios' || p === 'android' ? p : null;
}
export const isIOSApp = () => nativePlatform() === 'ios';
