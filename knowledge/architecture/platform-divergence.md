---
type: cross-platform-architecture
title: "Web, Android, and iPhone Codebase Divergence"
description: "Where the three ChiroNote application lines came from, what each owns, and why changes cannot currently be merged mechanically."
resource: "../../public/manifest.json"
tags: [web, android, ios, iphone, capacitor, divergence, synchronization]
---

# Web, Android, and iPhone Codebase Divergence

The three ChiroNote application lines share React ancestry and backend contracts, but they are not synchronized builds of one maintained source tree.

In the available repository history, the website is the `prod` branch. Android and iPhone are represented by the remote branches `cap-and`, `cap-ios`, and the earlier `mobile` line. The expected sibling checkout folders at `C:\Users\nikit\ChiroNote\android` and `C:\Users\nikit\ChiroNote\macintosh` were empty during the 2026-07-15 review, so branch contents are the authoritative evidence currently available.

## Branch Lineage

- The native lines share the web history through commit `6076129`.
- Commit `e999551` (2025-10-10, "Adding ios preparation") added Capacitor, Android platform files, native assets, and a multi-size maskable web manifest on the native line only.
- `mobile` ends at `db886f1` (2025-12-17).
- `cap-ios` ends at `9ac5a58` (2025-12-17).
- `cap-and` continued to `8c68a8c` (2026-02-27) with Android-specific RecordingManager and background handling.
- Website `prod` continued independently through `5083517` (2026-07-12), including the March Lambda change and the May/July recording and dictation refactors.

This means "web is newer" is true for app-shell structure, note generation, and dictation insertion, while "Android is more native-aware" is true for permissions, lifecycle, and packaging. Neither side is a strict superset.

## Current Responsibility Differences

| Area | Website `prod` | Android `cap-and` | iPhone `cap-ios` |
| --- | --- | --- | --- |
| Delivery | CRA build hosted through Amplify/CloudFront. | Capacitor 6 Android project wrapping the React build. | Capacitor 6 Xcode project wrapping the React build. |
| Native project | None. | Gradle project, launcher/splash resources, Android manifest, custom `MainActivity`. | Xcode project, CocoaPods, AppDelegate, Info.plist, icons, and splash assets. |
| Microphone permission | Browser `getUserMedia`; Safari stream reuse. | Android runtime `RECORD_AUDIO` plus WebView `PermissionRequest` bridging. | `NSMicrophoneUsageDescription`, speech description, and iOS background-audio declaration. |
| Background lifecycle | Browser lifecycle only. | Capacitor `appStateChange` pauses chunk rotation in background and resumes/flushes on foreground. | Older Capacitor lifecycle code, but not the later Android stop-reason refinements. |
| Recording architecture | Small manager composing three focused hooks. | Large monolithic manager with native platform imports and Android stop-reason logic. | Older monolithic manager with native platform imports. |
| Note-generation endpoint | Current URL introduced at `8d6e8b9`. | Still uses the earlier Lambda URL. | Still uses the earlier Lambda URL. |
| Dictation insertion | Immutable cursor/selection snapshots with regression tests and a live caret. | Predates the May/July web refactor. | Predates the May/July web refactor. |
| Public/marketing app | Full current public routes, analytics, SEO, blog, and landing-page code. | Native branches removed or substantially changed much of the web marketing/analytics layer. | Same native-line divergence. |
| Manifest | Standard CRA/PWA icons in `public/`. | Seven WebP icon sizes marked maskable for the wrapper/PWA preparation. | Same native-line manifest change. |

## What the Manifest Work Actually Was

The remembered manifest work did not change the current website branch. On the native line, `public/manifest.json` was expanded from favicon/192/512 icons to 48, 72, 96, 128, 192, 256, and 512 pixel maskable icons stored under `icons/`. The same preparation added `capacitor.config.json`, native splash assets, status-bar/keyboard settings, and platform projects.

Two cautions remain before reusing that manifest:

- Icon files are `.webp` but the manifest declares `image/png`.
- Icon URLs use `../icons/...`; resolution and copying must be verified in both the hosted build and Capacitor bundle.

The website's current and live manifest both use `favicon.ico`, `logo192.png`, and `logo512.png`. The manifest itself is therefore not an explanation for the unpublished web changes.

## Shared Contracts That Should Converge

The first synchronization effort should extract and compare contracts before moving UI code:

1. Recording session identity and audio object naming.
2. Actual blob MIME type, file extension, and S3 `contentType`.
3. Four-minute chunk rotation and platform-specific background behavior.
4. Upload ordering, cancellation, retry, and final-chunk semantics.
5. SQS message schema, language, access token, and note settings.
6. Transcript completion subscription and fallback rules.
7. Note-generation endpoint, request body, streaming protocol, error sentinel, and timeouts.
8. Dictation token, PCM format, subscription accounting, and insertion semantics.
9. Authentication and Amplify environment selection.

Once those are explicit, shared React logic can live in platform-neutral modules while thin adapters own browser, Android, and iOS lifecycle differences.

## Recommended Convergence Shape

- Keep a single platform-neutral recording state machine and backend contract package.
- Implement browser, Android/Capacitor, and iOS/Capacitor media/lifecycle adapters behind that contract.
- Keep native manifests, permissions, splash assets, stores, and release signing in platform repositories or platform directories.
- Run the same contract tests against each adapter, including discard during upload and final-chunk failure.
- Maintain a compatibility table for backend endpoints and message schema; a platform must not ship when it points at a different generation contract accidentally.
- Port changes by intent and tests, not by merging the current monolithic native RecordingManagers into the refactored web manager.

## Provenance

Synthesized from current branch `prod`; remote branches `origin/cap-and`, `origin/cap-ios`, and `origin/mobile`; native preparation commit `e999551`; Android tip `8c68a8c`; iPhone tip `9ac5a58`; [`manifest.json`](../../public/manifest.json); and native-branch versions of `capacitor.config.json`, `package.json`, `AndroidManifest.xml`, `MainActivity.java`, `Info.plist`, `AppDelegate.swift`, and `RecordingManager.jsx`. Empty sibling checkout folders were treated as unavailable rather than as evidence of deleted projects.
