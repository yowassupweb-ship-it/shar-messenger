# Android release (Tauri)

## 1) Prepare release keystore env vars

PowerShell:

$env:ANDROID_RELEASE_KEYSTORE_PATH = "E:\\keys\\shar-release.jks"
$env:ANDROID_RELEASE_KEY_ALIAS = "shar"
$env:ANDROID_RELEASE_STORE_PASSWORD = "<store-password>"
$env:ANDROID_RELEASE_KEY_PASSWORD = "<key-password>"

## 2) Build and sign

From this directory:

npm run android:release

This command does:
1. Build unsigned APK/AAB.
2. Sign APK with release keystore.
3. Verify signature.
4. Produce SHA256 file near signed APK.

## 3) Artifacts

APK unsigned:
- src-tauri/gen/android/app/build/outputs/apk/universal/release/app-universal-release-unsigned.apk

APK signed:
- src-tauri/gen/android/app/build/outputs/apk/universal/release/app-universal-release-signed.apk

APK checksum:
- src-tauri/gen/android/app/build/outputs/apk/universal/release/app-universal-release-signed.apk.sha256

AAB:
- src-tauri/gen/android/app/build/outputs/bundle/universalRelease/app-universal-release.aab

## 4) Notes

- If you run npm run android:sign (without :release), APK will be debug-signed and not suitable for Play Store.
- Current app shell is local (no redirect to remote web page), and it talks directly to backend API.
