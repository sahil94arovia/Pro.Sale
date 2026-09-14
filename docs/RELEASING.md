# PROSALE — Production Release & Distribution Guide

This document outlines the standard operating procedure for building, signing, and releasing new production updates of the **PROSALE Android Tablet Application** using the GitHub Releases manual distribution system.

---

## 1. Overview & Architecture

PROSALE uses a **manual-only, local-first** update distribution model.

- **Source of Updates**: GitHub Releases (`https://github.com/sahil94arovia/Pro.Sale/releases`)
- **App Update Notification**:
  - Manual check via **Settings > Updates > Check Updates** or **About Modal > Check Updates**
  - Non-intrusive background check on launch (limited to once every 12 hours)
- **User Control**:
  - The user is shown release notes, new version number, and file size.
  - The app **never** auto-downloads, auto-installs, or forces an update.
  - The user can tap **"Later"** to dismiss or **"Download Update"** to open the browser / system download manager.
- **In-Place Upgrade**:
  - Installing the new signed APK replaces the existing package in-place.
  - **All local data (LocalStorage, IndexedDB, GST settings, invoices, offline cache) remains 100% intact.**

---

## 2. Prerequisites

1. **Node.js & npm** (Node 20+ recommended)
2. **JDK 21** (`/opt/homebrew/opt/openjdk@21` or standard system Java)
3. **Android SDK & Build Tools** (including `apksigner`)
4. **Permanent Release Keystore**:
   - Location: `/Users/sahil/prosale-release.jks`
   - Alias: `prosale`
   - Config file: `android/keystore.properties` (strictly gitignored)

> ⚠️ **CRITICAL SECURITY NOTE**: Never commit `prosale-release.jks`, `keystore.properties`, or any passwords to Git or GitHub.

---

## 3. Version Bump Procedure

When publishing an update, versions must be bumped in two places:

### A. Android Gradle (`android/app/build.gradle`)

```groovy
defaultConfig {
    applicationId "com.prosale.app"
    minSdkVersion rootProject.ext.minSdkVersion
    targetSdkVersion rootProject.ext.targetSdkVersion
    versionCode 2       // <-- Increment by 1 for each release
    versionName "1.0.1" // <-- Semantic version (X.Y.Z)
    ...
}
```

### B. Application Service (`src/services/updateService.ts`)

```typescript
export const CURRENT_VERSION = '1.0.1'; // <-- Match versionName
export const CURRENT_VERSION_CODE = 2;   // <-- Match versionCode
```

---

## 4. Automated Build Script

To build, package, and verify the signed release APK automatically, run:

```bash
./scripts/prepare-release.sh
```

This script will:
1. Build production web assets (`npm run build`)
2. Sync Capacitor Android project (`npx cap sync android`)
3. Compile signed release APK (`cd android && ./gradlew assembleRelease`)
4. Verify cryptographic signature using `apksigner`
5. Copy the APK to `release/PROSALE-v<VERSION>.apk`
6. Print the file size and SHA-256 checksum

---

## 5. Manual Build Commands (Alternative)

If you prefer to run the steps manually:

```bash
# 1. Build web bundle
npm run build

# 2. Sync Capacitor
npx cap sync android

# 3. Build release APK
cd android
export JAVA_HOME="/opt/homebrew/opt/openjdk@21"
./gradlew assembleRelease
cd ..

# 4. Copy to release directory
mkdir -p release
cp android/app/build/outputs/apk/release/app-release.apk release/PROSALE-v1.0.1.apk

# 5. Verify cryptographic signature
/opt/homebrew/share/android-commandlinetools/build-tools/35.0.0/apksigner verify --verbose release/PROSALE-v1.0.1.apk
```

---

## 6. GitHub Release Publication

Follow these exact steps to publish the release to GitHub:

### Step 1: Git Tag & Push

```bash
git tag -a v1.0.1 -m "Release v1.0.1"
git push origin v1.0.1
```

### Step 2: Create GitHub Release

1. Navigate to: `https://github.com/sahil94arovia/Pro.Sale/releases/new`
2. Select the tag: `v1.0.1`
3. Release Title: `PROSALE v1.0.1`
4. Release Notes description:
   ```markdown
   ## What's Changed in PROSALE v1.0.1
   - Performance improvements and optimizations
   - Enhanced offline invoice printing and PDF exports
   - Updated CBIC GST statutory validations
   ```

### Step 3: Attach the APK Asset

- Drag and drop `release/PROSALE-v1.0.1.apk` into the **"Attach binaries by dropping them here or selecting them"** box.
- Ensure the filename ends with `.apk` (recommended: `PROSALE-v1.0.1.apk`).
- Click **"Publish release"**.

---

## 7. Update Verification on Tablet

Once published:

1. Open PROSALE on the Android tablet.
2. Open **Settings > Updates** or tap **App Info > Check Updates**.
3. Tap **"Check for Updates"**.
4. The app will fetch the latest release metadata from GitHub API, compare versions, and present the **Update Available Modal** with:
   - Current Version vs Latest Version
   - Release Notes
   - APK File Size
   - "Later" and "Download Update" actions
5. Tapping **"Download Update"** opens the direct APK URL in the browser / system download manager.
6. Once downloaded, opening the APK prompts the Android package installer to perform an **in-place update**.
7. Re-open PROSALE — verify all previous invoices, settings, and database items are intact!
