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
- Billing purchasing is intentionally absent from the Android runtime. The Billing screen presents usage only; it does not render price cards or purchase/manage-billing controls, and `/app/pricingplans` redirects to `/app/billing`. Stripe pricing-table scripts and billing-portal requests must remain web-only until an Android billing design is explicitly approved.
- Clipboard actions use the Capacitor clipboard plugin on native platforms and the browser Clipboard API on the website.
- Note history refreshes when the native app returns to the foreground.
- Android recording starts `MediaRecorder` without a timeslice and uses four-minute stop/restart rotation. This produces finalized, independently transcribable WebM containers. Pause flushes the current container and Resume starts a fresh one; recorder events and uploads are serialized through the final marker.
- `MainActivity` bridges Android runtime microphone permission to WebView media permission requests. JavaScript still requests media through `getUserMedia()`.

The app-state bridge preserves the existing WebView recording approach for native integrations outside Android's timeslice scheduler. It is not evidence that Android will keep the WebView alive indefinitely while locked or backgrounded; no foreground recording service is implemented.

## Configuration and Identity

- Capacitor application ID: `com.chironote.app`.
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

## Alignment Rule

When production changes, compare `cap-and` to `prod` by path. Treat native directories, Capacitor configuration, package additions, and explicitly documented adapter call sites as the expected delta. Port production behavior into the shared structure; do not revive the historical monolithic mobile app shell or recording manager.

## `cap-and` and `cap-ios` Are Different Release Lines

`cap-and` is the maintained Android convergence line: it contains the current shared application structure, the Android-specific recorder lifecycle and permission bridge, and the Play Internal-testing release workflow. `cap-ios` is a separately split, older iOS preparation line with its own iOS project/Pods, assets, and a divergent recording-finalization implementation. Its iOS dependencies and release path remain deferred and are not made current by an Android `cap sync` or Android validation. Do not treat either line as a drop-in platform equivalent or copy native changes between them without an explicit reconciliation review.

## Provenance

Synthesized from [`capacitor.config.json`](../../capacitor.config.json), [`package.json`](../../package.json), [`nativePlatform.js`](../../src/services/nativePlatform.js), [`Billing.jsx`](../../src/components/Billing/Billing.jsx), [`AuthenticatedApp.jsx`](../../src/components/AppShell/AuthenticatedApp.jsx), [`AppRoutes.jsx`](../../src/components/AppRouting/AppRoutes.jsx), [`useMediaRecorderController.js`](../../src/components/Recording/useMediaRecorderController.js), [`MainActivity.java`](../../android/app/src/main/java/com/chironote/app/MainActivity.java), [`AndroidManifest.xml`](../../android/app/src/main/AndroidManifest.xml), [`DataSafetyDisclosuresMap.md`](../../src/DataSafetyDisclosuresMap.md), and the `cap-and`/`cap-ios` Git history. Current implementation takes precedence over older mobile context documents.
