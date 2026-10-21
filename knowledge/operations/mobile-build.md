---
type: mobile-build-operations
title: "Capacitor Mobile Build"
description: "Web-to-native synchronization, iOS and Android project constraints, permissions, and build preparation."
resource: "../../capacitor.config.json"
tags: [capacitor, ios, android, build, permissions]
---

# Capacitor Mobile Build
## Current TestFlight release — October 21, 2026

**1.8 (12) Internal is Testing for unchanged Inner Circle**, one invitation,
90 days remaining. Apple build UUID `9d155da0-0f5f-4c38-a389-d5c933b454d3`.
[Processed build](https://appstoreconnect.apple.com/teams/4f8649c7-593d-4b5c-993f-c1a508200a8c/apps/6756679857/testflight/ios/9d155da0-0f5f-4c38-a389-d5c933b454d3).
This supersedes the earlier access-blocked checkpoint below. No new testers,
group, public link, website or public App Store release was performed.

Exact archived/uploaded source: `d5a3776fd3216374c3e05446e0d12113b924368c`,
which includes recovery PR #63 and preparation record PR #64. Its runtime/package/
native tree equals tested implementation merge `fe1a2d5c`; explicit archive
overrides are `MARKETING_VERSION=1.8` and `CURRENT_PROJECT_VERSION=12`.
Fresh remote and clean Mac HEAD were verified before archiving. The existing
real-configuration web bundle and native sync were used; no placeholder shipped.
All 243 tests, normal production build, clean sync and unsigned native Release
checks passed as recorded below. Existing lint/CRA warnings remain.

Apple browser and Mac desktop access were restored, and Xcode showed the
existing development@chironote.ai account and MYKYTA PREDTECHENSKYI team (Admin).
The exact-HEAD guarded executable `archive12.command`, launched through
`open -a Terminal`, succeeded in the logged-in desktop session on Xcode 26.6
(17F113). No SSH signing attempt, new credentials/certificate, security-setting
change or agreement acceptance was needed. The archive retains bundle
`ai.chironote.app`, arm64 and team `LH7497Z687`; deep/strict codesign, provisioning,
non-exempt encryption declaration false and packaged app/framework privacy checks
passed. Archive development signing is separate from delivered distribution signing.

Organizer's **TestFlight Internal Only** upload was accepted at **12:40 PM PDT**.
Apple retained build 12; processing completed into Testing for the existing group.
Only the established iOS-13-minimum warning for April 2027 was reported.
Export options retain internal-only testing, symbol upload, automatic signing and
automatic version/build management. The delivered IPA verifies with the existing
Apple Distribution identity, Store provisioning valid through August 21, 2027,
`get-task-allow=false`, `beta-reports-active=true`, correct bundle/team/version,
and app/Capacitor/Cordova privacy manifests. No extra compliance answer was needed.

IPA: **4,180,173 bytes**, SHA256
`b5da6b1cf0bd63069e053b631e5f38c782f801f2a848496d1e030c4eb8d436a9`.
Archive:
`/Users/user297320/Desktop/chironote-ios/tester-release-20261021/ChiroNote-1.8-12.xcarchive`.
Export including ExportOptions/DistributionSummary/Packaging log:
`/Users/user297320/Documents/App 2026-10-21 12-40-58`.
A second preserved IPA and inspection are under `tester-release-20261021/Delivered-12`.
The Windows IPA hash matches. Local evidence root remains
`C:/Users/nikit/Documents/Codex/2026-10-21/ios-tester-release/`.

What to Test notes were saved on this exact build. Installed-device acceptance
remains pending: authoritative recovered note and refresh, conditional Save,
failed/interrupted lookup preserving preview, current/background capture
isolation, recording/final audio, pause/background/Wi-Fi handoff and PDF Share.
No provider replay, clinical/customer data test or backend mutation was performed.

Fallback **1.8 (11)** remains Testing in Inner Circle with **85 days** remaining;
its archive and hash-verified delivered IPA are preserved. Do not expire it for
routine replacement. Public 1.7 was not changed. Public promotion remains a
separate authorization/review; this tester release does not establish device or
security readiness for that step. The shipped Capacitor framework is **6.2.1**,
confirmed in the delivered IPA, and remains affected by the pre-existing advisory
recorded in [privacy boundaries](../security/privacy-boundaries.md). No dependency
upgrade/workaround was included; ChiroNote-specific exploitability is unproven.

The React production build is the Capacitor `webDir` (`build`). The documented
mobile sequence is `npm run build`, `npx cap sync <platform>`, then open the
native project with `npx cap open ios` or `npx cap open android`; iOS signing,
CocoaPods, and device builds require a Mac/Xcode environment. `clean-build.ps1`
removes generated web and Android asset directories before rebuilding and
syncing Android.

The shared Capacitor app ID is `com.chironote.app` in
`capacitor.config.json` and Android Gradle. The checked-in Xcode project
currently declares product bundle identifier `ai.chironote.app`. Live App Store
Connect verified that identifier for ChiroNote (Apple ID 6756679857) on October 11,
2026; preserve it for distribution rather than renaming it to the Capacitor ID. iOS targets
13.0, declares microphone and speech usage text, enables background audio, and
declares Capacitor App, Clipboard, Device, Filesystem, Haptics, Keyboard, Splash
Screen, Share, and Status Bar in its Podfile. CocoaPods 1.16.2 resolved Share
6.0.2 on Mac; the checked-in lockfile records that resolution. The October 11
Mac sync preserved the Xcode project settings and the unsigned Debug simulator
build passed on Xcode 26.6. Signed archive and distribution-package verification
subsequently passed; physical-device acceptance remains separate.
Android targets SDK 35, has min SDK 22, and declares
internet, microphone, and audio-setting permissions.

Native startup hides the splash screen, sets a light status bar, and adds the
`native-mobile` body class. Recording code also handles platform-specific
background and WebKit behavior; native permission and lifecycle behavior must be
tested on devices rather than inferred from the web build.

The October 15 in-memory upload-recovery candidate additionally requires installed-iPhone acceptance on slow advancing WiFi, a true upload stall, disconnect/reconnect, two-network handoff and starting/discarding the next appointment while the earlier one completes. Local mocked tests/web compilation do not establish these results. No native sync, Mac/Xcode build, store submission or production-readiness claim accompanies that source change.

The patient workflow adds @capacitor/share 6.0.2, compatible with Capacitor 6. PDF delivery uses Filesystem Cache and the native share sheet; cache expiry is best-effort while suspended and resumes at launch/foreground. Run npm ci, npm run build and npx cap sync ios on Mac, then CocoaPods/Xcode validation. Windows source/build checks cannot validate iOS linking/signing or device behavior. Preserve the existing ai.chironote.app Xcode target; Capacitor 6.2.1 sync left it unchanged in the Mac validation. Verify the registered Apple app identity before reconciling the com.chironote.app Capacitor mismatch or distributing a build.

The app privacy manifest declares only Filesystem file-metadata access inside the app container (FileTimestamp reason C617.1), matching the installed plugin requirement and Apple approved reason. It is linked in the App Resources build phase and was present in the Mac-built simulator app. It does not assert additional collection/tracking/privacy behavior. Confirm it again in the signed archive before distribution.

## TestFlight publishing baseline

The October 11 upload uses source `99ab5d23af59069ca707e6c09df7ff61a3ab39ed`
and the clean Mac sibling checkout `chironote-ios-check`. Both patient feature
flags remain enabled for testing. The original Mac checkout and its two edits
remain preserved. Release archive settings explicitly override stale source
defaults with `MARKETING_VERSION=1.8` and `CURRENT_PROJECT_VERSION=9`; future
numbers must come from live Apple history, not these dated values.

Workspace `ios/App/App.xcworkspace`, scheme `App`, Release configuration and
`generic/platform=iOS` produced `ChiroNote-1.8-9.xcarchive` outside the checkout.
Archive identity, team `LH7497Z687`, privacy manifests and codesign verification
passed. Xcode Organizer's **TestFlight Internal Only** preset uploaded 1.8 (9)
at 6:05 PM PDT. Existing Xcode credentials handled distribution signing;
no new app identity or credentials were created. The delivered IPA verifies as
Apple Distribution, with `get-task-allow=false` and `beta-reports-active=true`.
IPA SHA-256: `1c4b8a80953e732c7ec860388081f7705d412a28fbe2b3fc85b78b1ba36a9a84`.
The package and export settings are preserved under the Mac Documents folder
`App 2026-10-11 18-05-25`; export settings retain symbol upload, automatic signing
and internal-only testing.

Apple accepted the upload with warning 90068: the current iOS 13 minimum must
be raised to 15 for uploads beginning April 2027. This warning did not block the
October upload and is distinct from the SDK used to compile the app. Apple
processing completed, and **1.8 (9) Internal is Testing** for Inner Circle with
one invitation and 90 days remaining, verified October 11. Beta notes for patient
editing, PDF sharing, auth, recording and dictation were saved. Upload acceptance
and tester availability were verified separately; no device installation is claimed.

The existing Internal group is **Inner Circle**, with one tester and automatic
distribution for Xcode builds. Before uploading, previous 1.7 builds 7 and 8
had 41 days remaining; build 7 was Testing and build 8 had an installed tester.
Keep those builds available for fallback. Existing archives alone do not establish
exact old source provenance. Public App Store version 1.7 was not changed.
Installed-phone recording, authentication, saved-note editing and PDF sharing
still require acceptance on physical devices.

## Release provenance

- [App Store Connect ChiroNote](https://appstoreconnect.apple.com/apps/6756679857/distribution/info)
- [TestFlight build history](https://appstoreconnect.apple.com/teams/4f8649c7-593d-4b5c-993f-c1a508200a8c/apps/6756679857/testflight/ios)
- [Processed 1.8 build9](https://appstoreconnect.apple.com/teams/4f8649c7-593d-4b5c-993f-c1a508200a8c/apps/6756679857/testflight/ios/54f4515c-de9e-4679-9531-c6c14abf1111)
- [Build settings](../../ios/App/App.xcodeproj/project.pbxproj)
- [Version and encryption declarations](../../ios/App/App/Info.plist)

Local verification evidence: `C:/Users/nikit/Documents/Codex/2026-10-11/ios-publishing/`.

## Provenance

- [Capacitor config](../../capacitor.config.json)
- [Package scripts](../../package.json)
- [Clean build script](../../clean-build.ps1)
- [iOS checklist](../../ios-setup-checklist.md)
- [iOS pods](../../ios/App/Podfile)
- [Resolved iOS pods](../../ios/App/Podfile.lock)
- [October 11 native validation](../../docs/mobile-catchup-2026-10-11/mac-native-validation.md)
- [Privacy manifest](../../ios/App/App/PrivacyInfo.xcprivacy)
- [Apple approved API reasons](https://developer.apple.com/documentation/bundleresources/app-privacy-configuration/nsprivacyaccessedapitypes/nsprivacyaccessedapitype)
- [iOS permissions](../../ios/App/App/Info.plist)
- [iOS project](../../ios/App/App.xcodeproj/project.pbxproj)
- [Android build](../../android/app/build.gradle)
- [Android versions](../../android/variables.gradle)
- [Android permissions](../../android/app/src/main/AndroidManifest.xml)
- [Native entry point](../../src/index.js)

Generated web bundles, native asset copies, and dependency directories are excluded
from this knowledge layer.

## October 21 recovered-result TestFlight preparation

PR #63 merged into `cap-ios` at `fe1a2d5c33e6eb469268c2da56878a3d0c308806`.
Its complete tree matches reviewed head `3599ba083f2b29b86557171372f5d62c4c5da7ce`.
The source buffers terminal controls, applies confirmed NOTE_RECOVERED saved
body/version to the owning capture, and preserves preview/error and foreground/
background isolation for uncertain results. The wire/API contract is unchanged;
completion receipts are optional/private, so current backend compatibility does
not require atomic deployment. Backend deployment belongs to its separate owner.
No client, backend or public release is implied by this merge.

The release uses the clean Mac checkout
`/Users/user297320/Desktop/chironote-ios/chironote-ios-tester-20261021`, initially
validated at the exact PR head and then pinned to the identical-tree merge.
The existing legitimate ignored Amplify configuration was copied from the prior
verified Mac release checkout; production GraphQL endpoint and required Cognito
configuration were checked locally without exposing secrets. No placeholder
configuration is used for this release.

Passed on Mac: locked `npm ci`, **38 suites / 243 tests**, normal production web
build, `npx --no-install cap sync ios`, and unsigned Release compilation for
`generic/platform=iOS`. Sync and native build left tracked source clean.
Normal web build retains existing ESLint/CRA warnings; strict CI-mode compilation
fails on existing warnings and no configured client GitHub CI exists. No lint
suppression, broad refactor or dependency update was made to conceal that limit.
Unsigned compilation is not signing, upload or physical-device acceptance.

As of this preparation checkpoint SSH is available, but the App Store Connect
browser session is expired and no connected Mac desktop is available. The
launched Windows RDP connection window could not be activated after refreshed
selection/retry. Owner reconnect/browser login and verification of the existing
Xcode account were requested together. No live Apple version/build number,
tester availability, or current expiry has been verified yet; no new build
number, signed archive, upload or release is claimed.

Historical fallback: 1.8 (11) from `bcdfa299d2e67e19a82ee95815374ed2f2a13588`
was Testing for Inner Circle on October 16. Its preserved delivered IPA is
4,178,238 bytes, SHA256
`343b6abf7fb528a7d33d3ec6d23037035f1fbb1c17fb3c289f762cfb188bec10`, under
`/Users/user297320/Desktop/chironote-ios/tester-release-20261015/Delivered-11/`.
Its archive is in the same release root as `ChiroNote-1.8-11.xcarchive`.
Recheck live availability and expiry before labeling it an installable fallback.

Continue by restoring Apple/desktop access, checking current build history/group,
choosing an unused number, staging an exact-HEAD archive command and using the
logged-in desktop session for signing first. Prior SSH signing failed twice;
do not weaken keychain settings or repeat an SSH archive merely to rediscover it.
Reverify bundle/team/profile/privacy/archive and delivered distribution signature,
then upload TestFlight Internal Only and verify exact processed group availability.
Physical recording, authenticated saved-note recovery/refresh, a subsequent
conditional Save, interrupted connectivity and foreground/background capture
isolation remain device acceptance checks. No public App Store promotion is
authorized in this task.

Evidence: `C:/Users/nikit/Documents/Codex/2026-10-21/ios-tester-release/`;
Mac logs/native outputs:
`/Users/user297320/Desktop/chironote-ios/tester-release-20261021/`.
The dirty primary Windows checkout stays at `bf39e30` with its unrelated local
style/bootstrap and knowledge edits preserved; local primary synchronization is
intentionally incomplete under the current preservation boundary. Release source
comes from the isolated, verified merge checkout.
