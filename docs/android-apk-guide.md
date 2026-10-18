# DocuVault — Installable Android APK & Mobile Distribution Guide

This guide details how to build, test, and distribute the **DocuVault Android APK** (`DocuVault-v1.0.0.apk`) to your project guides, classmates, and evaluators.

---

## 📱 Mobile Architecture Specification

DocuVault's mobile client is built on **Capacitor 8** and **React Native Web / Vite**, creating a native Android application package (`com.digivault.app`) with full hardware and OS integration:

| Feature | Implementation Mechanism | Android Integration |
| :--- | :--- | :--- |
| **Document Uploads** | Standard `<input type="file" accept="image/*,application/pdf">` + `FileProvider` | Triggers native Android Camera and Document Picker automatically |
| **Real-Time Updates** | React Query background polling (`refetchInterval: 12000`) | Syncs notifications, documents, and family shares every 12s |
| **Biometrics** | Haptic tactile vibration (`navigator.vibrate`) + WebAuthn Platform Authenticator | Fingerprint & Face ID animation with 4-digit Quick PIN fallback |
| **Notifications** | Spring Boot Expiry Scheduler + Alerts Center + Android System Notifications | Daily scan at 08:00 AM for 30d, 7d, 1d document expirations |
| **Session & Logins** | Stateless HMAC-SHA256 JWT stored in native persistent storage | Quick Demo ("Rajesh Sharma") or full email/password registration |
| **Document DNA** | SHA-256 cryptographic file hashing engine | Bit-level tamper detection on all uploaded documents |
| **QR Code Sharing** | ZXing Base64 QR generation + Camera QR reader | Secure time-bounded link sharing with PIN & view limits |

---

## 🛠️ Native Android Project Details

- **Android Project Directory**: [`mobile/android/`](file:///d:/Applications/Projects/Vishanth_frirend/Digi-App/mobile/android/)
- **Package Name (Application ID)**: `com.digivault.app`
- **Minimum Android SDK**: `24` (Android 7.0 Nougat+)
- **Target Android SDK**: `36` (Android 15+)
- **Manifest Permissions Configured** in [`AndroidManifest.xml`](file:///d:/Applications/Projects/Vishanth_frirend/Digi-App/mobile/android/app/src/main/AndroidManifest.xml):
  - `android.permission.INTERNET`
  - `android.permission.ACCESS_NETWORK_STATE`
  - `android.permission.CAMERA`
  - `android.permission.READ_EXTERNAL_STORAGE` / `READ_MEDIA_IMAGES`
  - `android.permission.USE_BIOMETRIC` & `USE_FINGERPRINT`
  - `android.permission.POST_NOTIFICATIONS`
  - `android.permission.VIBRATE`
- **Assets Synced**: All minified web assets, fonts, icons, and stylesheets are embedded in `mobile/android/app/src/main/assets/public/`.

---

## 🚀 3 Ways to Generate and Share the APK

### Method 1: Automatic Cloud Build via GitHub Actions (Recommended)
This repository includes an automated workflow in [`.github/workflows/build-apk.yml`](file:///d:/Applications/Projects/Vishanth_frirend/Digi-App/.github/workflows/build-apk.yml):

1. Push this repository to GitHub.
2. In your GitHub repository, click the **Actions** tab.
3. Select **"Build DocuVault Android APK"** and click **Run workflow**.
4. GitHub automatically:
   - Sets up JDK 17 & Android SDK 34
   - Compiles web assets (`npm run build:mobile`)
   - Executes `./gradlew assembleDebug`
   - Generates and uploads **`DocuVault-v1.0.0.apk`** under the Action's **Artifacts** section.
5. Download `DocuVault-v1.0.0.apk` and share it via WhatsApp, Google Drive, or email with your evaluators and classmates!

---

### Method 2: Android Studio (Local Graphical Build)
If you or your evaluator have [Android Studio](https://developer.android.com/studio) installed:

1. Open Android Studio.
2. Click **Open** and navigate to:
   ```
   d:/Applications/Projects/Vishanth_frirend/Digi-App/mobile/android
   ```
3. Allow Gradle to sync dependencies.
4. Click **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**.
5. Once complete, click **locate** or find the file at:
   ```
   mobile/android/app/build/outputs/apk/debug/app-debug.apk
   ```
6. Rename `app-debug.apk` to `DocuVault-v1.0.0.apk`.

---

### Method 3: Command-Line Build (via Gradle Wrapper)
If the Android SDK is installed on your command line:

```bash
cd mobile/android

# On Windows:
gradlew.bat assembleDebug

# On Linux / macOS:
./gradlew assembleDebug
```
Output path: `mobile/android/app/build/outputs/apk/debug/app-debug.apk`.

---

### Alternative: Instant WebAPK PWA Install (Zero File Download Needed)
If you want evaluators to install the app onto their Android phone in 10 seconds without having to download or transfer an `.apk` file:

1. Deploy the app to your public URL (or open `http://<your-ip>:5173` on the same Wi-Fi).
2. Open the URL in **Google Chrome for Android**.
3. Chrome will automatically display an **"Install DocuVault"** prompt or tap Chrome's three dots (`⋮`) → **Install app** / **Add to Home screen**.
4. Android will create an official standalone application tile with the DocuVault icon and splash screen.

---

## 📋 Evaluator Feature Verification Checklist

| Evaluator Test Case | Expected Behavior |
| :--- | :--- |
| **Instant Demo Login** | Tap "⚡ Instant Demo Access" on the login screen to sign in as Rajesh Sharma without typing passwords. |
| **Document Upload** | Tap `+ Upload Document`. Tap the upload zone to choose either Camera or Files. Fill in metadata, then tap Upload. Document appears instantly in Personal Locker. |
| **Real-Time Updates** | Status counts and notification alerts update automatically every 12 seconds. |
| **Biometric Lock** | In Profile, toggle "Biometric / App Lock". When app locks, tap "Unlock with Biometrics" to test haptic pulse and sensor verification (or use 4-digit PIN `1234`). |
| **Document DNA Check** | Open any document card, tap the DNA shield icon to trigger real-time SHA-256 verification against the registered database fingerprint. |
| **Break-Glass Emergency** | Tap the "Emergency" tab to view Emergency Medical Info (Blood Group O+, Allergies, Contacts). Tap "Emergency Access" to view audited access protocols. |
