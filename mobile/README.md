# Kobocent iOS and Android apps

The apps are a Capacitor shell around the live web app (`https://kobocent.com/app`). Every web release reaches the apps
straight away; you rebuild the apps only when this folder changes (plugins, icons, config) or for a store version bump.
Store rules and the launch plan: `MOBILE_LAUNCH.md` in the backend repo.

## What you need

| | Android | iOS |
|---|---|---|
| Computer | Windows, Mac or Linux | **a Mac** (Xcode only runs on macOS), or a cloud Mac build (Codemagic, GitHub Actions macOS runner) |
| Tools | Node 20+, Android Studio (with JDK 17+) | Node 20+, Xcode 16+, CocoaPods (`sudo gem install cocoapods`) |
| Account | Google Play Console (organization, ClickShift Inc.) | Apple Developer Program (organization, ClickShift Inc.) |

## First build

```bash
cd mobile
npm install
npx cap add android          # creates mobile/android — commit it
npx cap add ios              # Mac only — creates mobile/ios — commit it
```

### Icons and splash

Put a **1024×1024 PNG** of the Kobocent mark at `mobile/assets/icon-only.png` (the backend's `public/kobocent-logo.png`
is 600×600 — export the mark at 1024 from the source artwork), and a **2732×2732** splash at `mobile/assets/splash.png`
(mark centred on cream `#F7F3EE`; `splash-dark.png` on `#1C1815`). Then:

```bash
npm run assets && npx cap sync
```

### Sign-in (native, required)

Google blocks its sign-in inside app webviews, so the apps sign in natively (`@capgo/capacitor-social-login`); the web
code calls it (kobocent-web `src/lib/native.ts`) and sends the token to the same backend routes.

1. **Google Cloud console** (same project as the web client ID):
   - Create an **Android** OAuth client: package `com.kobocent.app` + the SHA-1 of your signing key
     (`cd android && ./gradlew signingReport`, and later the Play App Signing SHA-1 from Play Console).
   - Create an **iOS** OAuth client: bundle ID `com.kobocent.app`.
   - Backend `.env`: `GOOGLE_APP_CLIENT_IDS=<android client id>,<ios client id>` (the web one stays `GOOGLE_CLIENT_ID`).
   - Vercel: `NEXT_PUBLIC_GOOGLE_IOS_CLIENT_ID=<ios client id>`.
   - iOS: in Xcode → Info → URL Types, add the iOS client's **reversed client ID** as a URL scheme.
2. **Sign in with Apple** (iOS): Xcode → Signing & Capabilities → **+ Sign in with Apple**. Backend `.env`:
   `APPLE_CLIENT_IDS=com.kobocent.app,<web Services ID>`.

### iOS settings (Xcode → Info.plist)

- `ITSAppUsesNonExemptEncryption` = `NO` (standard HTTPS only — skips the export-compliance question each upload).
- Display name `Kobocent`; version / build numbers.

### Push notifications (to finish before submission)

The plugin is installed; sending needs keys: Firebase project (FCM) for Android (`google-services.json` →
`android/app/`), and an APNs key for iOS (Xcode → **+ Push Notifications**). The backend native sender and the web
registration call are the next build step (today's notifications go by Web Push and Telegram).

### Links that open the app (later)

Universal Links / App Links need `apple-app-site-association` and `assetlinks.json` under
`https://kobocent.com/.well-known/` with the Apple Team ID and the Android signing SHA-256 — add them once the
developer accounts exist.

## Run

```bash
npx cap open android     # Android Studio → Run on a phone (USB debugging) or an emulator
npx cap open ios         # Xcode → choose your iPhone → Run
```

Test on real phones: sign up with Google (and Apple on iPhone), connect Telegram, the PIN lock, a small send, a bill,
going offline (you should see "You’re offline"), the Android back button, light and dark mode.

## Store builds

- **Android**: Android Studio → Build → Generate Signed App Bundle (`.aab`) → upload to Play Console → Internal testing.
  Keep the upload keystore and its passwords safe (losing it means support tickets to Google). Check Play's current
  *target API level* requirement and upgrade Capacitor (`npx cap migrate`) if the generated project targets an older one.
- **iOS**: Xcode → Product → Archive → Distribute → App Store Connect → TestFlight.

## What the app adds over the website (Apple 4.2)

Native sign-in (Google, Apple), splash screen, status bar that follows the theme, Android back button, offline screen,
no browser bars. Still to add before submission: native push, Face ID / fingerprint unlock in place of typing the PIN,
QR scanner for wallet addresses, links that open the app.
