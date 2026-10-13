#!/usr/bin/env bash
# Kobocent Android project settings, applied on Codemagic after `npx cap add android`, 2026-10-13.
#  - Release signing from the upload keystore Codemagic holds (CM_KEYSTORE_PATH, CM_KEYSTORE_PASSWORD, CM_KEY_ALIAS,
#    CM_KEY_PASSWORD — set by `android_signing` in codemagic.yaml)
#  - versionCode = Codemagic build number (Play needs a higher number on every upload)
#  - permissions, minSdk 26, notification icon, google-services.json (push, fingerprint unlock, QR scanner)
# Run from mobile/:  bash scripts/android-setup.sh
set -euo pipefail
GRADLE=android/app/build.gradle

VC="${BUILD_NUMBER:-1}"
sed -i.bak -E "s/versionCode [0-9]+/versionCode ${VC}/" "$GRADLE"
sed -i.bak -E "s/versionName \"[^\"]+\"/versionName \"${APP_VERSION:-1.0.0}\"/" "$GRADLE"

if ! grep -q "KOBOCENT_SIGNING" "$GRADLE"; then
cat >> "$GRADLE" <<'GRADLE'

// KOBOCENT_SIGNING — release builds are signed with the upload key Codemagic holds (mobile/scripts/android-setup.sh)
android {
    signingConfigs {
        release {
            if (System.getenv("CM_KEYSTORE_PATH")) {
                storeFile file(System.getenv("CM_KEYSTORE_PATH"))
                storePassword System.getenv("CM_KEYSTORE_PASSWORD")
                keyAlias System.getenv("CM_KEY_ALIAS")
                keyPassword System.getenv("CM_KEY_PASSWORD")
            }
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
        }
    }
}
GRADLE
fi
# ── Native features (2026-10-13): push (Firebase), fingerprint unlock, QR scanner ──
MANIFEST=android/app/src/main/AndroidManifest.xml
add_perm() { grep -q "android.permission.$1\"" "$MANIFEST" || sed -i.bak "s#<application#<uses-permission android:name=\"android.permission.$1\" />\n    <application#" "$MANIFEST"; }
add_perm USE_BIOMETRIC
add_perm CAMERA
add_perm POST_NOTIFICATIONS
# The QR scanner library needs Android 8.0+ (API 26).
sed -i.bak -E "s/minSdkVersion = [0-9]+/minSdkVersion = 26/" android/variables.gradle
# Small notification icon: the transparent mark (Android draws it as a silhouette) + the brand colour.
mkdir -p android/app/src/main/res/drawable-nodpi
cp assets/notification-icon.png android/app/src/main/res/drawable-nodpi/ic_stat_kobocent.png
if ! grep -q "default_notification_icon" "$MANIFEST"; then
  META='<meta-data android:name="com.google.firebase.messaging.default_notification_icon" android:resource="@drawable/ic_stat_kobocent" /><meta-data android:name="com.google.firebase.messaging.default_notification_channel_id" android:value="kobocent" />'
  sed -i.bak "s#</application>#${META}</application>#" "$MANIFEST"
fi
# Firebase config for push (Codemagic group kobocent_android: GOOGLE_SERVICES_JSON = the file's contents, or base64 of it).
# Capacitor's app/build.gradle applies the google-services plugin only when this file exists.
if [ -n "${GOOGLE_SERVICES_JSON:-}" ]; then
  if echo "$GOOGLE_SERVICES_JSON" | head -c 1 | grep -q "{"; then printf '%s' "$GOOGLE_SERVICES_JSON" > android/app/google-services.json
  else echo "$GOOGLE_SERVICES_JSON" | base64 -d > android/app/google-services.json; fi
  echo "google-services.json written (push on)"
else
  echo "GOOGLE_SERVICES_JSON not set — the app builds, but notifications stay off on Android"
fi

echo "Android project configured: versionCode ${VC}, release signing, permissions, push"
