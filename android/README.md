# Loop Puzzle for Android

The existing game is bundled into a small native Android WebView app. It uses AndroidX WebViewAssetLoader with a local HTTPS origin, so ES modules, crypto and localStorage work without a website or server. No INTERNET permission is requested. A current Android System WebView is required.

## Build in GitHub Actions

No Android tooling is needed on your laptop.

1. Push to `main`, or open **Actions → Android debug APK → Run workflow**.
2. Wait for the **build** job to pass.
3. Open the run and download **loop-puzzle-debug-apk** from **Artifacts**.
4. Extract the ZIP and install **loop-puzzle-debug.apk** on an Android 8.0+ device.
5. Allow installation from the browser or file manager used to open the APK when Android asks.

The artifact includes `SHA256SUMS.txt`. The workflow verifies the APK signature before uploading it. Artifacts are kept for 14 days; run the workflow again if a download expires.

The debug key is created automatically by Android's build tools and cached between runs. GitHub may evict caches: if the key changes, Android cannot install the APK over an earlier build. Uninstalling the old build resolves that, but removes its saved game. A permanent signing key stored in GitHub Secrets can be configured later. Debug keys and caches are not suitable for production signing.

The Android app has its own progress storage. Browser progress is not transferred. Rotating the phone preserves the active page; reopening the app restores the puzzle from localStorage. Back closes an open in-game dialog, then exits the app.

## Project layout

- `app/src/main/java/…/MainActivity.java`: WebView, local asset loading, system insets and lifecycle.
- `app/src/main/assets/www/`: generated game assets, excluded from Git.
- `../scripts/prepare-android.mjs`: bundles the game and removes the optional external font request.
- `../.github/workflows/android-debug.yml`: tests, cloud SDK setup, build, lint, signature verification and APK upload.

Build versions are pinned: JDK 17, Gradle 8.11.1, Android Gradle Plugin 8.9.2, compile/target SDK 35, Build Tools 35.0.0. This project currently targets debug testing, not publication in a store.
