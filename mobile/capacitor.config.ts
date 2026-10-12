import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Kobocent iOS + Android shell (2026-10-12). The app loads the live web app (kobocent.com/app), so every web release
 * reaches the apps at once; native features come from the plugins in package.json, reached from the web code through
 * window.Capacitor (kobocent-web src/lib/native.ts, src/lib/platform.ts). Build steps: mobile/README.md.
 */
const config: CapacitorConfig = {
  appId: 'com.kobocent.app',
  appName: 'Kobocent',
  webDir: 'www',
  server: {
    url: 'https://kobocent.com/app',
    // Only Kobocent pages open inside the app; any other link (t.me, banks, explorers) opens outside it.
    allowNavigation: ['kobocent.com', '*.kobocent.com'],
    // Shown when the phone is offline or kobocent.com can't be reached.
    errorPath: 'offline.html',
  },
  ios: {
    contentInset: 'never',          // the web app already pads for the notch and home bar (safe-area insets)
    backgroundColor: '#F7F3EE',
  },
  android: {
    backgroundColor: '#F7F3EE',
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: { launchShowDuration: 2500, launchAutoHide: true, backgroundColor: '#F7F3EE', showSpinner: false },
    StatusBar: { overlaysWebView: false, style: 'LIGHT', backgroundColor: '#F7F3EE' },
    PushNotifications: { presentationOptions: ['badge', 'sound', 'alert'] },
  },
};

export default config;
