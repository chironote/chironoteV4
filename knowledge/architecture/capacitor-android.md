---
type: platform-architecture
title: "Capacitor Android Application"
description: "The Android wrapper boundary, native adaptations, build flow, and rules for staying aligned with production web code."
resource: "../../capacitor.config.json"
tags: [android, capacitor, mobile, native, build, release]
---

# Capacitor Android Application

The `cap-and` branch wraps the production React application in Capacitor 6. Shared web application, Amplify, public asset, and knowledge files should remain aligned with `prod`; differences should be limited to native projects, Capacitor package/configuration files, and thin runtime adapters.

## Repository Boundary

- `src/`, `public/`, `amplify/`, and the production concepts under `knowledge/` come from the shared web application.
- `capacitor.config.json`, `android/`, `ios/`, `resources/`, and Capacitor dependencies/scripts are wrapper-owned.
- `src/services/nativePlatform.js` centralizes native detection, clipboard access, and app-state subscriptions so Capacitor imports do not spread through feature code.
- The iOS project is retained, but Android is the active convergence and validation scope. Its historical Podfile still names plugins that are not needed by Android and is not build-ready until the deferred iOS reconciliation is performed.

## Native Runtime Differences

- Native launches route directly to `/app`; public landing, blog, cookie-consent, route-tracking, and advertising analytics initialization and event helpers are not activated inside the wrapper.
- Clipboard actions use the Capacitor clipboard plugin on native platforms and the browser Clipboard API on the website.
- Note history refreshes when the native app returns to the foreground.
- Android recording uses the four-minute `MediaRecorder` timeslice as its only chunk boundary. It does not use the external stop/restart rotation interval, including across pause/resume or native background/foreground transitions.
- `MainActivity` bridges Android runtime microphone permission to WebView media permission requests. JavaScript still requests media through `getUserMedia()`.

The app-state handling preserves the existing WebView recording approach. It is not evidence that Android will keep the WebView alive indefinitely while locked or backgrounded; no foreground recording service is implemented.

## Configuration and Identity

- Capacitor application ID: `com.chironote.app`.
- Google Play releases are identified by both Gradle values in `android/app/build.gradle`: the monotonically increasing internal `versionCode` and the user-visible `versionName`. Before every upload, check the highest version code already used in Play Console and increment it; Play does not permit reuse.
- The Android 15 / API 35 build uses Android Gradle Plugin 8.6.1 with Gradle 8.7. This is the first officially supported AGP line for compiling API 35 and requires JDK 17 or newer.
- Web assets are built into `build/` and copied into the native project by `cap sync`.
- The configured virtual hostname remains `chironote.ai`. Do not change it casually because origin changes can affect stored authentication state and allowed backend origins.
- `src/amplifyconfiguration.json` and `src/aws-exports.js` are environment-sensitive, ignored files. They must be supplied locally or by an approved build workflow without committing credentials or environment secrets.
- Release signing files stay outside Git. Versioning, signing ownership, internal testing, and Google Play Console synchronization are separate release work.
- `src/DataSafetyDisclosuresMap.md` preserves the repository evidence for the later Google Play data-safety review.

## Build and Validation

```powershell
npm install
npm test -- --watchAll=false
npm run build
npx cap sync android
cd android
.\gradlew.bat assembleDebug
```

Run `npx cap sync android` after dependency or Capacitor configuration changes so generated plugin declarations match `package.json`. A successful web build and Gradle build prove packaging, but microphone, recording/background transitions, clipboard, authentication, and note generation still require an installed-device regression before internal distribution.

For Google Play, generate a signed Android App Bundle (`.aab`) and upload it only to the explicitly authorized track. The private beta remains the active **Internal testing** track backed by the one-user `Early Beta` email list. Production promotion is a distinct action and is never implied by an internal-test upload. On 2026-07-19, the exact Play-hosted Internal release `16 (1.16)` was explicitly promoted to Production as a full rollout to the existing one-country audience and submitted for Google review; Production `13 (1.13)` remains the rollback reference until Play completes the review and rollout.

Prefer repeatable CLI signing over Android Studio automation. Keep the upload keystore outside the repository, keep its alias and passwords in user-scoped environment variables or an untracked local properties file, and have the release signing configuration read those values only at build time. Then `gradlew bundleRelease` can produce the signed bundle non-interactively. Never put the keystore, passwords, or signing properties in Git, shell history, command arguments, build logs, or Codex messages. Before upload, verify the bundle signature and inspect its `versionCode`, `versionName`, application ID, and target SDK. Keep Play upload and track publication as separate guarded steps, with Internal testing named explicitly and Production denied by default. Prefer promoting the exact Play-hosted artifact already validated in testing; never upload a local bundle whose signature cannot be verified, even when its version fields match the tested release.

The local Windows setup uses `C:/Users/nikit/.android-keys/chironote-upload.jks`, alias `key0`, and the ignored `android/keystore.properties` file. Only the two blank password values are entered manually. `android/app/build.gradle` validates all four properties before a release build, while debug builds do not use the upload key.

## Alignment Rule

When production changes, compare `cap-and` to `prod` by path. Treat native directories, Capacitor configuration, package additions, and explicitly documented adapter call sites as the expected delta. Port production behavior into the shared structure; do not revive the historical monolithic mobile app shell or recording manager.

## Provenance

Synthesized from [`capacitor.config.json`](../../capacitor.config.json), [`package.json`](../../package.json), [`android/app/build.gradle`](../../android/app/build.gradle), [`android/build.gradle`](../../android/build.gradle), [`android/gradle/wrapper/gradle-wrapper.properties`](../../android/gradle/wrapper/gradle-wrapper.properties), [`nativePlatform.js`](../../src/services/nativePlatform.js), [`AppRoutes.jsx`](../../src/components/AppRouting/AppRoutes.jsx), [`useMediaRecorderController.js`](../../src/components/Recording/useMediaRecorderController.js), [`MainActivity.java`](../../android/app/src/main/java/com/chironote/app/MainActivity.java), [`AndroidManifest.xml`](../../android/app/src/main/AndroidManifest.xml), [`DataSafetyDisclosuresMap.md`](../../src/DataSafetyDisclosuresMap.md), Google Play Console Internal testing and Production submission state verified 2026-07-19, and the merged `prod`/`cap-and` Git history. Current implementation takes precedence over older mobile context documents.
