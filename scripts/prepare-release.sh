#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# PROSALE — Production Release Preparation Script
# Builds web assets, syncs Capacitor, compiles signed release APK,
# verifies signature, and outputs release-ready APK with SHA-256 checksum.
# ==============================================================================

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "=================================================="
echo "  PROSALE — Production Release Build System       "
echo "=================================================="

# 1. Environment & Java Detection
if [ -z "${JAVA_HOME:-}" ]; then
  if [ -d "/opt/homebrew/opt/openjdk@21" ]; then
    export JAVA_HOME="/opt/homebrew/opt/openjdk@21"
  elif [ -x "/usr/libexec/java_home" ]; then
    export JAVA_HOME="$(/usr/libexec/java_home -v 21 2>/dev/null || /usr/libexec/java_home 2>/dev/null || true)"
  fi
fi

if [ -n "${JAVA_HOME:-}" ]; then
  echo "✓ Using JAVA_HOME: $JAVA_HOME"
  export PATH="$JAVA_HOME/bin:$PATH"
fi

# Locate apksigner
APKSIGNER_BIN=""
if command -v apksigner >/dev/null 2>&1; then
  APKSIGNER_BIN="apksigner"
elif [ -f "/opt/homebrew/share/android-commandlinetools/build-tools/35.0.0/apksigner" ]; then
  APKSIGNER_BIN="/opt/homebrew/share/android-commandlinetools/build-tools/35.0.0/apksigner"
else
  # Search known SDK paths
  POSSIBLE_APKSIGNER=$(find /opt/homebrew/share/android-commandlinetools/build-tools "$HOME/Library/Android/sdk/build-tools" -name apksigner 2>/dev/null | sort -V | tail -n 1 || true)
  if [ -n "$POSSIBLE_APKSIGNER" ] && [ -x "$POSSIBLE_APKSIGNER" ]; then
    APKSIGNER_BIN="$POSSIBLE_APKSIGNER"
  fi
fi

if [ -n "$APKSIGNER_BIN" ]; then
  echo "✓ Using apksigner: $APKSIGNER_BIN"
else
  echo "⚠️ apksigner not found in default paths; will skip signature verification"
fi

# 2. Extract Version from build.gradle
GRADLE_FILE="$PROJECT_ROOT/android/app/build.gradle"
VERSION_NAME=$(grep 'versionName' "$GRADLE_FILE" | head -n 1 | sed 's/.*versionName *"\([^"]*\)".*/\1/' | tr -d '[:space:]')
VERSION_CODE=$(grep 'versionCode' "$GRADLE_FILE" | head -n 1 | sed 's/.*versionCode *\([0-9]*\).*/\1/' | tr -d '[:space:]')

if [ -z "$VERSION_NAME" ]; then
  VERSION_NAME="1.0.0"
fi
if [ -z "$VERSION_CODE" ]; then
  VERSION_CODE="1"
fi

echo "✓ Target Version Name: $VERSION_NAME"
echo "✓ Target Version Code: $VERSION_CODE"

# 3. Check Keystore Configuration
KEYSTORE_PROPS="$PROJECT_ROOT/android/keystore.properties"
if [ ! -f "$KEYSTORE_PROPS" ]; then
  echo "❌ Error: android/keystore.properties not found!"
  echo "   Release builds require a valid keystore.properties file."
  exit 1
fi
echo "✓ Verified android/keystore.properties exists"

# 4. Build Web Application
echo ""
echo "--- Step 1/4: Building Production Web Assets (Vite + TypeScript) ---"
npm run build

# 5. Sync Capacitor Android
echo ""
echo "--- Step 2/4: Syncing Capacitor Android Assets ---"
npx cap sync android

# 6. Compile Release APK
echo ""
echo "--- Step 3/4: Compiling Signed Release APK (Gradle assembleRelease) ---"
cd "$PROJECT_ROOT/android"
./gradlew assembleRelease
cd "$PROJECT_ROOT"

# 7. Locate Output APK
BUILT_APK="$PROJECT_ROOT/android/app/build/outputs/apk/release/app-release.apk"
if [ ! -f "$BUILT_APK" ]; then
  echo "❌ Error: Release APK was not found at $BUILT_APK"
  exit 1
fi

mkdir -p "$PROJECT_ROOT/release"
TARGET_APK_NAME="PROSALE-v${VERSION_NAME}.apk"
TARGET_APK_PATH="$PROJECT_ROOT/release/$TARGET_APK_NAME"
cp "$BUILT_APK" "$TARGET_APK_PATH"

# 8. Verify APK Signature
echo ""
echo "--- Step 4/4: Verifying Release APK Signature ---"
if [ -n "$APKSIGNER_BIN" ]; then
  "$APKSIGNER_BIN" verify --verbose "$TARGET_APK_PATH"
  echo "✓ Cryptographic signature verified successfully!"
else
  echo "⚠️ apksigner skipped (not found)"
fi

# 9. Release Summary
FILE_SIZE_BYTES=$(wc -c < "$TARGET_APK_PATH" | tr -d '[:space:]')
FILE_SIZE_MB=$(echo "scale=2; $FILE_SIZE_BYTES / 1048576" | bc)
SHA256=$(shasum -a 256 "$TARGET_APK_PATH" | awk '{print $1}')

echo ""
echo "=================================================="
echo "  RELEASE BUILD SUCCESSFUL!                       "
echo "=================================================="
echo "  File:         $TARGET_APK_NAME"
echo "  Path:         $TARGET_APK_PATH"
echo "  Size:         ${FILE_SIZE_MB} MB ($FILE_SIZE_BYTES bytes)"
echo "  Version Name: $VERSION_NAME"
echo "  Version Code: $VERSION_CODE"
echo "  SHA-256:      $SHA256"
echo "=================================================="
echo ""
echo "Next Steps for GitHub Release:"
echo "1. Tag the release:   git tag -a v${VERSION_NAME} -m \"Release v${VERSION_NAME}\""
echo "2. Push tag:          git push origin v${VERSION_NAME}"
echo "3. Create Release:    Go to https://github.com/sahil94arovia/Pro.Sale/releases/new"
echo "                      Select tag: v${VERSION_NAME}"
echo "                      Title: PROSALE v${VERSION_NAME}"
echo "4. Attach Asset:      Upload release/$TARGET_APK_NAME"
echo "                      (Asset MUST be named PROSALE-v${VERSION_NAME}.apk)"
echo "=================================================="
