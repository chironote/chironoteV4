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

- The patient catch-up candidate includes compact capture, Patients, authoritative clipboard Save on installed phones, diagnosis confirmation, reassignment/deletion and PDF export. Browser mobile Save eligibility is unchanged. App routing blocks unsaved drafts while preserving the native public-route/analytics boundary.
- PDF delivery uses Capacitor Filesystem/Share 6.0.2: verified PDF bytes are written to app Cache under generic filenames, shared with the system sheet, then expired after ten minutes. Startup/foreground/export retries cleanup of expired files. Cancellation/failure attempts immediate cleanup. This is no persistent draft cache. Installed-device handoff/cleanup and recording acceptance remain required.

- Native launches route directly to `/app`; public landing, blog, cookie-consent, route-tracking, and advertising analytics initialization and event helpers are not activated inside the wrapper.
- Android authentication uses a custom Cognito form backed by AndroidX Credential Manager; the website retains Amplify Authenticator. Provider retrieval/save failures fall back to manual sign-in, and raw passwords are never persisted in WebView storage.
- Billing purchasing is intentionally absent from the Android runtime. The Billing screen presents usage only; it does not render price cards or purchase/manage-billing controls, and `/app/pricingplans` redirects to `/app/billing`. Stripe pricing-table scripts and billing-portal requests must remain web-only until an Android billing design is explicitly approved.
- Clipboard actions use the Capacitor clipboard plugin on native platforms and the browser Clipboard API on the website.
- Note history refreshes when the native app returns to the foreground.
- Android recording starts `MediaRecorder` without a timeslice and uses four-minute stop/restart rotation. This produces finalized, independently transcribable WebM containers. Pause flushes the current container and Resume starts a fresh one; recorder events and uploads are serialized through the final marker.
- `MainActivity` bridges Android runtime microphone permission to WebView media permission requests. JavaScript still requests media through `getUserMedia()`.

The app-state bridge preserves the existing WebView recording approach for native integrations outside Android's timeslice scheduler. It is not evidence that Android will keep the WebView alive indefinitely while locked or backgrounded; no foreground recording service is implemented.

## Configuration and Identity

Fresh Play inspection on 2026-10-13 supersedes the unpublished-candidate statements below: Internal 34 (1.34), Clipboard controls restored, is Available to internal testers (released Oct 12) for Early Beta, 1 tester. All-app-bundles inventory has highest uploaded code 34. Production remains 30 (1.30), available on Google Play. Candidate 35 retains package, min SDK 24, compile/target 36, AGP 8.9.1 / Gradle 8.11.1, signing identity and patient flags. It narrowly adapts the approved web patient-creation UI onto remote cap-and 7da14c8, preserving native lifecycle and unrelated primary edits. Publication is recorded separately after validation.

Current Internal testing release 33 (1.33), **1.33 Phone Clipboard layout**, became **Available to internal testers** on 2026-10-11 at 8:04 PM PDT for the unchanged Early Beta list (1 tester). It packages the phone toolbar, empty-note gutter and saved-note spacing correction merged in PR44, commit `af3dae7c899fe4858aa3b724aac5dcaed3fef1d3`, plus only the release-version increment. Minimum SDK 24, compile/target 36, both patient flags, upload certificate and Play automatic protection remain unchanged. Supported devices remain 19,223 with zero additions or losses across every form factor. Production remains 30 (1.30), untouched; prior Internal 32 is preserved as fallback evidence.

Release 33 AAB SHA-256 is 44ADD647AC4F0FF7E365FF7C12EA6D43D6DE41135D2FFE6815CECC3FA048CC3C (27,798,158 bytes). Fresh 37 Jest suites / 147 tests, Android-only sync with 7 plugins, Gradle clean assembleDebug bundleRelease, and package/API/signature verification passed. The already validated production web build was reused and its fingerprint remained unchanged across sync. Synthetic phone/landscape/tablet checks passed for the source fix; installed-device acceptance of this package remains pending. The sole Play warning is the expected missing deobfuscation file with minification disabled.

Release 34 (1.34) is prepared locally from merged PR48, source merge `36e8c1439e44f451c2a1967b242c7064eda9463e`. It packages the Clipboard reconciliation: native Smart Editor is unavailable on installed phones and tablets, phone web keeps the phone layout, and desktop web retains Smart Editor. The verified candidate AAB is 27,799,970 bytes with SHA-256 `8F862771676FFCA67A7AD5192E6B6C2A01DFB59BAE0AF96430F78A9CFE2F444D`; its upload-certificate fingerprint `D69887E2B4CC5A8FCAC0F7782F9F843A89BEE7E999B386A5949E7218A186F7FA` matches published release 33. It targets `com.chironote.app`, min SDK 24 and compile/target SDK 36, with both patient flags enabled. Fresh validation passed 39 Jest suites / 162 tests, feature-enabled production web build, Android-only sync with 7 plugins, Gradle clean assembleDebug bundleRelease and the signed-bundle verifier. The standard CRA build reports lint and stale Browserslist warnings. This is a prepared, unpublished candidate: it has not been uploaded to Play, is not available to testers, and does not establish device acceptance. Play Internal 33 (1.33) remains the latest verified release; Production remains 30 (1.30) and untouched.

### Previous Internal release and compatibility decision

Internal testing release 32 (1.32) became **Available to internal testers** on 2026-10-11 at 5:51 PM PDT for the unchanged one-person Early Beta list. Production remains 30 (1.30), untouched. Both patient feature flags remain enabled. The approved compatibility fix raises minimum SDK to 24 (Android 7.0+) while retaining compile/target 36 and current Play automatic protection. The signed AAB SHA-256 is 335BEA516D4CE904416B1F54280A4F222AFC28E5C674B2562B7EBB3282BC0CB4 (27,797,552 bytes), using the same upload certificate as versions 30/31. Fresh validation passed npm ci, 37 Jest suites / 147 tests, production web compilation, Android-only Capacitor sync, Gradle clean assembleDebug bundleRelease with JDK 21 / SDK 36, package/API/signature and whitespace checks.

Play supports 19,223 devices versus 20,990 previously: phones 13,809 -> 12,339, tablets 7,065 -> 6,769 and TV 6 -> 5. Car 27, Chromebook 77, Android XR 1 and wearable 0 are unchanged. Play attributes all 1,767 exclusions to unsupported framework versions and reports 0 affected installs for every changed form factor; this is the explicitly approved older-Android exclusion. The only other warning is the expected missing deobfuscation file with minification disabled. Play confirms automatic protection on and adds the CHECK_LICENSE permission; hardware features, screen layouts and ABI restrictions are unchanged. Installed-device acceptance remains pending and is not established by publication. Baseline AuthUI lifecycle fixes from 718a02b are unchanged.

Historical candidate 31 retained minimum 22 and was rejected during Play processing because protection requires minimum 24. After reviewing the SDK audit, the user authorized the new minimum and continued Internal testing. Version 32 avoids reusing rejected 31; no app-wide protection setting was changed. The prior signed 31 artifact remains preserved as evidence, not a published release.

- Capacitor application ID: `com.chironote.app`.
- Web assets are built into `build/` and copied into the native project by `cap sync`.
- The configured virtual hostname remains `chironote.ai`. Do not change it casually because origin changes can affect stored authentication state and allowed backend origins.
- The manifest declares `https://chironote.ai/.well-known/assetlinks.json` for app/site credential association. That endpoint still returns the SPA HTML shell as of 2026-08-31, so verified cross-surface credential sharing remains an external website configuration follow-up; do not fabricate the signing fingerprint in this repository.
- `src/amplifyconfiguration.json` and `src/aws-exports.js` are environment-sensitive, ignored files. They must be supplied locally or by an approved build workflow without committing credentials or environment secrets.
- Release signing files stay outside Git. Versioning, signing ownership, Internal testing, and Production promotion are separate release work; record each confirmed track transition and its rollback evidence in the dated knowledge log.
- `src/DataSafetyDisclosuresMap.md` preserves the repository evidence for the later Google Play data-safety review.

## Build and Validation

### SDK baseline and history

`android/variables.gradle` now sets minimum SDK 24, compile SDK 36 and target SDK 36; `android/app/build.gradle` consumes those root variables. The minimum 24 change was newly authorized on 2026-10-11 for release 32, after the history audit below. Minimum SDK determines the oldest supported Android version, while compile/target SDK describe the build API and platform behavior baseline. Application release numbers such as 24 (1.24) are unrelated to API levels.

The 2026-10-11 audit of the non-shallow repository's fetched branches/tags and tracked Gradle/manifest history found no minimum-SDK-24 upgrade or reversal. The first Capacitor commit, `d383121807cb1dcdee41efd6f52b13bf1aa9b4e4` (2025-09-10), introduced minimum 22 and compile/target 34. Android Gradle files were untracked on 2025-09-22 and restored by `e99955193695c1b8a6a19a4abf8c4c6ee11d5dad` (2025-10-10) with minimum 22 and compile/target 35. Commit `716bd6ec11a2b0a8fd2567ab6b64b55c7dbe5883` (2026-08-21) raised compile/target 35 to 36 while retaining minimum 22. This source-history finding does not prove what happened in uncommitted or untracked configurations.

Committed release-28/29 notes and observed Play release 30 details agree on API 22+ and target 36; historical candidate 31 retained that baseline. Its upload blocker was a mismatch with currently enabled automatic protection, not a demonstrated SDK regression. The inspected Play UI does not establish when or by whom protection was enabled. Release 32's approved minimum 24 is a new supported-OS change, not restoration of a documented previous setting.

```powershell
npm install
npm test -- --watchAll=false
npm run build
npx cap sync android
cd android
.\gradlew.bat assembleDebug
```

Run `npx cap sync android` after dependency or Capacitor configuration changes so generated plugin declarations match `package.json`. A successful web build and Gradle build prove packaging; microphone, recording/background transitions, clipboard, authentication, note generation and PDF share-receiver behavior still require installed-device regression. Release 32 was explicitly published to Internal testing to enable that acceptance work; no physical-device pass is claimed.

## Alignment Rule

When production changes, compare `cap-and` to `prod` by path. Treat native directories, Capacitor configuration, package additions, and explicitly documented adapter call sites as the expected delta. Port production behavior into the shared structure; do not revive the historical monolithic mobile app shell or recording manager.

## `cap-and` and `cap-ios` Are Different Release Lines

`cap-and` is the maintained Android convergence line: it contains the current shared application structure, the Android-specific recorder lifecycle and permission bridge, and the Play Internal-testing release workflow. `cap-ios` is a separately split, older iOS preparation line with its own iOS project/Pods, assets, and a divergent recording-finalization implementation. Its iOS dependencies and release path remain deferred and are not made current by an Android `cap sync` or Android validation. Do not treat either line as a drop-in platform equivalent or copy native changes between them without an explicit reconciliation review.

## Provenance

Release 33 state was directly verified in [Google Play Internal release 22](https://play.google.com/console/u/0/developers/7204637354481410807/app/4972877076794873792/tracks/4700756601084891710/releases/22/details). Local artifacts, source33.patch, validation logs, audience/protection/review evidence and publication screenshot are preserved under `C:/Users/nikit/Documents/Codex/2026-10-11/clipboard-layout/release33/`. Source is merged PR44 commit `af3dae7c899fe4858aa3b724aac5dcaed3fef1d3` plus the release-version patch; packaging metadata integration is separate from confirmed Play availability.

Release 34 candidate build and validation evidence is preserved under `C:/Users/nikit/Documents/Codex/2026-10-12/mobile-ui-reconcile/validation/android-release34/`. Play state and tester scope were rechecked by the release coordinator; the candidate itself has not been uploaded or published.

Release 32 state and compatibility were directly verified in [Google Play Internal release 21](https://play.google.com/console/u/0/developers/7204637354481410807/app/4972877076794873792/tracks/4700756601084891710/releases/21/details). The local evidence bundle is `C:/Users/nikit/Documents/Codex/2026-10-11/mobile-catchup/publication/android/`, including source32.patch, validation32 logs and publication screenshots. Source is cap-and dc4ca7d8b2eb1d165d635b47121a1605614ec80d plus the isolated minimum/version patch; source integration is tracked separately from Play availability.

Synthesized from [capacitor.config.json](../../capacitor.config.json), [package.json](../../package.json), [nativePlatform.js](../../src/services/nativePlatform.js), [AuthWrapper.jsx](../../src/components/AppShell/AuthWrapper.jsx), [NativeAuthContainer.jsx](../../src/components/AuthUI/NativeAuthContainer.jsx), [CredentialManagerPlugin.java](../../android/app/src/main/java/com/chironote/app/CredentialManagerPlugin.java), [Billing.jsx](../../src/components/Billing/Billing.jsx), [AuthenticatedApp.jsx](../../src/components/AppShell/AuthenticatedApp.jsx), [AppRoutes.jsx](../../src/components/AppRouting/AppRoutes.jsx), [useMediaRecorderController.js](../../src/components/Recording/useMediaRecorderController.js), [MainActivity.java](../../android/app/src/main/java/com/chironote/app/MainActivity.java), [AndroidManifest.xml](../../android/app/src/main/AndroidManifest.xml), [DataSafetyDisclosuresMap.md](../../src/DataSafetyDisclosuresMap.md), and the `cap-and`/feature-branch Git history. Current implementation takes precedence over older mobile context documents.
