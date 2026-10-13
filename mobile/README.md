# Kobocent iOS and Android apps

The apps are a Capacitor shell around the live web app (`https://kobocent.com/app`): every web release reaches both apps
at once. **Codemagic builds both apps in the cloud** (`codemagic.yaml` at the repo root), so a Windows laptop is enough —
no Mac, and Android Studio is optional (only for trying the app on an emulator). The iOS and Android projects are generated
fresh on every build and configured by `mobile/scripts/`, so nothing native is committed.

Store rules and the overall plan: `MOBILE_LAUNCH.md` in the backend repo. Icons: `mobile/assets/` (icon-only.png = the
App Store icon on cream; logo.png = the transparent mark used for the Android adaptive icon and the splash screen).

---

## While the D-U-N-S number is pending (2026-10-13)

None of this needs D-U-N-S, Apple or Play:
1. **Android Studio + upload key + SHA-1** — Step 5.1.
2. **Google Cloud** — Step 3.1 (consent screen), 3.2 (iOS client: only the bundle ID is required; Team ID can be added
   later) and 3.3 (Android client with the upload key's SHA-1).
3. **Codemagic** — sign up, add the repo, upload the keystore as `kobocent_upload_key` (Step 5.2), then start
   **Android → test APK (no store)** by hand. Download the `.apk` from the build's artifacts onto an Android phone and
   open it (allow "install unknown apps"). This is the real app, Google sign-in included once the backend has
   `GOOGLE_APP_CLIENT_IDS` — use it for testing and for store screenshots.
4. **Firebase** (console.firebase.google.com) — project **Kobocent** (link it to the same Google Cloud project) → add an
   Android app `com.kobocent.app` with the SHA-1 → download `google-services.json` and keep it for native push.
5. **The company website for Apple's check** — Apple verifies the organisation through a website on the company's own
   domain and an email on it. Make sure that site is live and shows the legal name.
6. **Reviewer demo account**, screenshots, and the counsel letter (Step 6).

---

## Step 1 — Accounts (needs ClickShift Inc.'s D-U-N-S number)

1. **D-U-N-S number** for ClickShift Inc. — check or request free at Apple's D-U-N-S lookup
   (developer.apple.com/enroll/duns-lookup). Takes up to ~2 weeks if it has to be created. The legal name must match the
   company documents exactly.
2. **Apple Developer Program** (developer.apple.com/programs/enroll) → enroll as an **Organization**, ClickShift Inc.,
   $99/year. Apple calls to verify; you need authority to sign for the company and a website on the company's domain.
3. **Google Play Console** (play.google.com/console/signup) → **Organization** account, ClickShift Inc., $25 once,
   D-U-N-S required; identity verification takes a few days.
4. **Codemagic** (codemagic.io) → sign up with GitHub → add the `kobocent` repository.

## Step 2 — Apple setup (all in a browser)

In **developer.apple.com → Certificates, Identifiers & Profiles**:
1. **Identifiers → + → App IDs → App**: description `Kobocent`, Bundle ID (explicit) **`com.kobocent.app`**.
   Tick **Sign In with Apple** and **Push Notifications**. Save.
2. **Identifiers → + → Services IDs**: `com.kobocent.web` (this is Sign in with Apple on the website). Enable Sign In with
   Apple → Configure → primary App ID `com.kobocent.app`, domain `kobocent.com`, return URL `https://kobocent.com/signin`.
3. **Keys → +**: name `Kobocent APNs`, tick **Apple Push Notifications service** → download the `.p8` (once only — keep it
   safe; needed for native push later).

In **appstoreconnect.apple.com**:
4. **Apps → + New App**: iOS, name **Kobocent**, language English, bundle ID `com.kobocent.app`, SKU `kobocent-ios`.
   Note the **Apple ID** number it shows (App Information) → that is `APP_STORE_APPLE_ID`.
5. **Users and Access → Integrations → App Store Connect API → +**: name `Codemagic`, access **App Manager** → download
   the `.p8` and note the **Issuer ID** and **Key ID**.

Server settings:
- Backend `.env`: `APPLE_CLIENT_IDS=com.kobocent.app,com.kobocent.web`
- Vercel: `NEXT_PUBLIC_APPLE_CLIENT_ID=com.kobocent.web` (turns on "Continue with Apple" on the website)

## Step 3 — Google sign-in clients (console.cloud.google.com, the project that has the website's client ID)

1. **APIs & Services → OAuth consent screen**: app name **Kobocent**, support email `support@kobocent.com`, logo,
   home page `https://kobocent.com`, privacy policy `https://kobocent.com/legal`, authorised domain `kobocent.com`,
   publishing status **In production**.
2. **Credentials → Create credentials → OAuth client ID → iOS**: bundle ID `com.kobocent.app` (Team ID is optional —
   add it later from developer.apple.com → Membership). Copy the **Client ID** and the **iOS URL scheme** (starts `com.googleusercontent.apps.`).
3. **Credentials → Create credentials → OAuth client ID → Android**: package `com.kobocent.app` + **SHA-1** of the upload
   key (Step 5 shows how to get it). After the first Play upload, add a **second Android client** with the **App signing
   key SHA-1** from Play Console → Test and release → App integrity. (One client per SHA-1.)

Where the values go:
- Backend `.env`: `GOOGLE_APP_CLIENT_IDS=<iOS client ID>,<Android client ID(s)>` (the website's stays `GOOGLE_CLIENT_ID`)
- Vercel: `NEXT_PUBLIC_GOOGLE_IOS_CLIENT_ID=<iOS client ID>`
- Codemagic group `kobocent_ios`: `GOOGLE_IOS_URL_SCHEME=<iOS URL scheme>`

## Step 4 — Codemagic for iOS

1. **Team settings → Team integrations → Developer Portal → Manage keys → Add key**: name **`Kobocent App Store Connect`**
   (exactly — `codemagic.yaml` uses this name), Issuer ID, Key ID, the `.p8` from Step 2.5.
2. **Team settings → Code signing identities → iOS certificates → Generate certificate** (Apple Distribution, using the
   key above). Then **iOS provisioning profiles → Fetch profiles** → pick the App Store profile for `com.kobocent.app`
   (create it on developer.apple.com → Profiles → + → App Store Connect if none exists).
3. **App settings → Environment variables**, group **`kobocent_ios`**: `GOOGLE_IOS_URL_SCHEME`, `APP_STORE_APPLE_ID`.
4. Build: push a tag, e.g. `git tag ios-1.0.0-1 && git push origin ios-1.0.0-1` — or start **ios-testflight** by hand in
   Codemagic. About 20 minutes later the build is in **TestFlight**; install the TestFlight app on an iPhone to test.
   (You need an iPhone to test, not a Mac.)

## Step 5 — Codemagic for Android

1. **Upload key** (once — this proves future updates come from you; losing it means a support process with Google):
   install **Android Studio** (it includes Java), then in a terminal:
   ```
   "C:\Program Files\Android\Android Studio\jbr\bin\keytool" -genkeypair -v -keystore kobocent-upload.jks -alias kobocent -keyalg RSA -keysize 2048 -validity 10000
   ```
   Store the `.jks` file and both passwords in a password manager and a second safe place. Its **SHA-1** (for Step 3):
   ```
   "C:\Program Files\Android\Android Studio\jbr\bin\keytool" -list -v -keystore kobocent-upload.jks -alias kobocent
   ```
2. Codemagic → **Team settings → Code signing identities → Android keystores → Add**: upload the `.jks`, reference name
   **`kobocent_upload_key`**, the passwords and alias `kobocent`.
3. **Play publishing access**: Google Cloud → IAM → Service accounts → create `codemagic-publisher` → Keys → add JSON key.
   Play Console → Users and permissions → Invite the service account's email with **Release apps to testing tracks**.
   Codemagic group **`kobocent_android`**: `GCLOUD_SERVICE_ACCOUNT_CREDENTIALS` = the whole JSON (mark secret).
4. Build: tag `android-1.0.0-1` or start **android-play** by hand. **The very first `.aab` must be uploaded by hand**
   (Play Console → your app → Testing → Internal testing → Create release → upload the `.aab` from the Codemagic build's
   artifacts); after that Codemagic publishes to internal testing itself.
5. Testers: Play Console → Internal testing → Testers → add emails → they install from the opt-in link.

**Android Studio (optional):** to try the app on your laptop: `cd mobile && npm install && npx cap add android &&
npx cap open android` → Run on an emulator or a phone with USB debugging. Builds for the store still go through Codemagic.

## Step 6 — Store listings and forms (browser)

| | App Store Connect | Play Console |
|---|---|---|
| Privacy policy URL | `https://kobocent.com/legal` | same |
| Account deletion | in-app: Settings → Delete account | in-app + web link `https://kobocent.com/delete-account` |
| Privacy | App Privacy questionnaire (MOBILE_LAUNCH.md §6) | Data safety form (same facts) |
| Category / rating | Finance; age 18+ | Finance; content rating questionnaire; target audience 18+ |
| Finance forms | — | **Financial features declaration** → crypto exchange / software wallet |
| Countries | **Nigeria only** at launch | **Nigeria only** at launch |
| Reviewer access | Sign-in information: a demo Google account + notes for each screen | App access: same demo account |
| Licensing | Review notes + attach the counsel opinion letter | have the letter ready if Google asks |
| Screenshots | 6.9" and 6.5" iPhone | phone screenshots, feature graphic 1024×500 |

**Demo account:** create a Google account for the reviewers (e.g. a new Gmail), sign up on Kobocent with it, connect a
Telegram, set the PIN, and leave ~$5 of USDC so they can try a send. Put the email, password and PIN in the review notes.

## What the app adds over the website (Apple 4.2)

Native sign-in (Google, Apple), splash screen, status bar that follows the theme, Android back button, offline screen, no
browser bars. Still to add before submission: native push, Face ID / fingerprint unlock in place of typing the PIN, QR
scanner for wallet addresses, links that open the app.

Inside the apps (store rules): no Earn, no crypto-paid subscriptions on iOS until in-app purchase is wired, no referral
commission offer on iOS (`src/lib/platform.ts`, `src/features/yield/earnStatus.js` in the backend).
