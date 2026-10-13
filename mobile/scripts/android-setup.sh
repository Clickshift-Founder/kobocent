#!/usr/bin/env bash
# Kobocent Android project settings, applied on Codemagic after `npx cap add android`, 2026-10-13.
#  - Release signing from the upload keystore Codemagic holds (CM_KEYSTORE_PATH, CM_KEYSTORE_PASSWORD, CM_KEY_ALIAS,
#    CM_KEY_PASSWORD — set by `android_signing` in codemagic.yaml)
#  - versionCode = Codemagic build number (Play needs a higher number on every upload)
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
echo "Android project configured: versionCode ${VC}, release signing"
