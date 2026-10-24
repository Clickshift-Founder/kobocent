/**
 * App links (2026-10-24): which kobocent.com links open the iOS / Android app when it is installed, instead of the browser.
 * One list for the three places that need it: /.well-known/apple-app-site-association (iOS Universal Links),
 * /.well-known/assetlinks.json (Android App Links — the intent filter in mobile/scripts/android-setup.sh uses the same
 * prefixes) and native.ts, which opens the link's page inside the app.
 */
export const APP_ID_ANDROID = 'com.kobocent.app';
export const APP_ID_IOS = 'com.kobocent.app';
export const APP_LINK_HOST = 'kobocent.com';
/** Path prefixes that open the app. Everything else (landing page, legal pages, /api) stays in the browser. */
export const APP_LINK_PREFIXES = ['/app', '/signin', '/signup'];

/** A link's in-app path (path + query + hash) if it is one of ours, else null. Never another host. */
export function appPathFromLink(link: string): string | null {
  try {
    const u = new URL(link);
    if (u.protocol !== 'https:' || (u.host !== APP_LINK_HOST && u.host !== `www.${APP_LINK_HOST}`)) return null;
    if (!APP_LINK_PREFIXES.some(p => u.pathname === p || u.pathname.startsWith(`${p}/`) || u.pathname.startsWith(`${p}?`))) return null;
    return `${u.pathname}${u.search}${u.hash}`;
  } catch {
    return null;
  }
}
