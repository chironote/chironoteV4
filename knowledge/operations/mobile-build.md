---
type: mobile-build-operations
title: "Capacitor Mobile Build"
description: "Web-to-native synchronization, iOS and Android project constraints, permissions, and build preparation."
resource: "../../capacitor.config.json"
tags: [capacitor, ios, android, build, permissions]
---

# Capacitor Mobile Build

## Capacitor 6.2.2 security patch candidate — October 21

The framework/tool dependencies `@capacitor/android`, `@capacitor/ios`,
`@capacitor/core` and `@capacitor/cli` are pinned to exactly **6.2.2** for
[GHSA-rvm3-566m-v7fv / CVE-2026-103922](https://github.com/advisories/GHSA-rvm3-566m-v7fv).
The previous npm lock and CocoaPods framework resolved 6.2.1. This is the minimum
fixed Capacitor 6 release; existing plugins and the merged iOS 15.0 target remain.
See [privacy boundaries](../security/privacy-boundaries.md) for the security
boundary. Native CocoaPods sync, regression/build checks, independent review,
signed archive, upload and processed Inner Circle availability are distinct gates.
Latest documented TestFlight 1.9 (15) still contains 6.2.1. The initial security
archive 1.8 (14), validated at `54fdc06`, was never uploaded and is superseded by
the subsequent recording fixes. The security branch now incorporates those fixes;
new source validation and fresh live version allocation precede a replacement.
A source patch does not update an installed app or authorize public
App Store promotion. Physical-device recording, navigation and network acceptance
remain required.

Current reconciled runtime `551d9ed5056a98136652c179e20adde146a985c7`
includes base `56eb097` and all recording fixes through TestFlight 1.9 (15).
Fresh checks passed **38 suites / 246 tests**, web build, iOS sync with no Pod
lock drift, and unsigned Release compilation on Xcode 26.6 / SDK 26.5. The
effective minimum remains iOS 15.0; installed core/CLI/iOS/Android are 6.2.2.
Independent review found no material source issue. Existing warnings remain.

No security-patched TestFlight availability is claimed. Browser input was stopped
during the separate Android upload; fresh live Apple version/audience checks,
a newly allocated current-source archive, signing/upload and processed Inner
Circle availability remain pending. [Draft PR #69](https://github.com/chironote/chironoteV4/pull/69)
and the isolated source are preserved. Initial 1.8 (14) export verification
confirmed distribution signing, app/team, privacy manifests, iOS 15.0 and native
6.2.2, but it was never uploaded and predates the later recording fixes; preserve
it only as historical evidence. Its IPA hash is
`d3aed41f65b1e107874b53497e0877fce22879039258159b844b0e6fda5969a3`.
Current evidence: `C:/Users/nikit/Documents/Codex/2026-10-21/task/evidence/ios-recheck/`
and `tester-handoff.json`. The public-release hold remains with its existing owner.

## Production hold — TestFlight 1.8 (13) recording report

The owner clarified the installed TestFlight **1.8 (13)** symptom: a longer
recording produced only about the first **20 seconds / 32 words** in the resulting
note, not a fixed five-second clip. The Apple tester record identifies an iPad
Air (5th generation) on iOS 26.1. The app appeared to complete normally. The
existing AssemblyAI transcript covers 22 seconds / 32 words (timestamps
1326–21740 ms) and roughly matches the final note, so later speech was already
absent before note generation. Whether later speech was absent from captured audio
or omitted by transcription remains unresolved; the full waveform has not been
inspected.

This resembles [WebKit bug 299164](https://bugs.webkit.org/show_bug.cgi?id=299164),
which describes missing MP4 recording content with long, unsliced MediaRecorder
capture. WebKit's follow-up reports the first 20–30 seconds on iOS 26.1 and says
the fix shipped in iOS 26.2. That is a plausible explanation for the symptom,
not evidence that ChiroNote lost the audio in WebKit. The build-13 recorder did not request periodic iOS slices. Build 14 added
one-second MP4 flushing and assembly but failed its device follow-up: about 41
seconds survived. Build 15 also failed: a two-minute test uploaded only 42.37
decoded seconds of MP4/AAC. Same-owner authentication requests carried a
Macintosh user agent, bypassing the shipped iPhone/iPad-only detector and both
earlier iOS fixes. The current source uses native Capacitor platform identity
and one shared iOS condition; no new build has been produced. The integrity hold
remains open pending device completeness verification after that correction.

**Do not submit a build to App Review or release publicly while this recording
integrity hold remains open.** Preserve accepted artifacts and evidence; do not
restart an accepted upload. Public 1.7 remains unchanged. Build 13's recording
runtime matches build 12; its deployment-target change does not establish a fix.
Use synthetic, non-clinical recordings to verify completeness before lifting the
hold.

## TestFlight 1.9 (15) — October 21, 2026

**Device follow-up: failed; not a known-good recording fallback.** The captured
MP4/AAC and matching provider duration establish loss before note generation.
The shipped JavaScript matches its source; platform misclassification bypassed
the intended iOS changes. Private raw evidence is retained outside Git under
`C:/Users/nikit/Documents/Codex/2026-10-21/ios-build15-webm/raw-audio-investigation/`.
PR #74 merged at source commit
d601e4c21188039e78b24c3ad28dc65484803fd7. iOS prefers supported WebM/Opus to
avoid the MP4 writer, retaining the older-device fallback and existing segment
assembly/upload contract. This is a candidate path, not a proven recording fix.

The clean Mac checkout passed the production web build and iOS Capacitor sync.
The full suite passed 38 suites / 246 tests; focused recording and patient-flow
coverage passed 2 suites / 52 tests. OKS and diff checks passed.

Archive: /Users/user297320/Desktop/chironote-ios/webm-release-20261021/ChiroNote-1.9-15.xcarchive
(ai.chironote.app, team LH7497Z687, iOS 15.0 minimum; Apple Development
signature). TestFlight IPA: /Users/user297320/Desktop/chironote-ios/webm-release-20261021/Delivered-15/ChiroNote-1.9-15.ipa
(4,177,276 bytes; SHA-256
e038071d303927fa9dee7a257bc82c9762ec63aadac59608afcbaa9160c7529f). Its Apple
Distribution signature, get-task-allow=false, beta-reports-active=true, and
app/Capacitor/Cordova privacy manifests verified. Export used TestFlight
Internal Only and automatic signing.

Organizer accepted the upload at **3:32 PM PDT**. Apple shows build 1.9 (15) as
**Testing** for Inner Circle (one invitation, 90 days), UUID
f2674026-fc63-4c49-870d-4fe0ef56f364. [Processed build](https://appstoreconnect.apple.com/teams/4f8649c7-593d-4b5c-993f-c1a508200a8c/apps/6756679857/testflight/ios/f2674026-fc63-4c49-870d-4fe0ef56f364).
Tester notes are saved. Windows evidence is under C:/Users/nikit/Documents/Codex/2026-10-21/ios-build15-webm/:
archive15-verification.txt, Delivered-15/verification.txt,
testflight-1.9-15-notes.png, and testflight-1.9-15-testing.png. Device recording
completeness remains pending; the recording-integrity and public-release hold
above remain open. No App Review submission or public release is claimed.

## TestFlight 1.9 (14) — October 21, 2026

**Device follow-up: failed.** The owner reports another truncated recording, with about 41 seconds surviving. Periodic MP4 flushing alone did not resolve the incident. The next candidate prefers supported WebM/Opus; build 14 must not be treated as a known-good recording fallback.

PR #73 merge `367eb6558c1ccfdc0852d56f12c39e3a51d10bef` (recorder `6be3051`,
banner `f699ee3`) was archived with version 1.9/build 14. iOS requests one-second
MediaRecorder slices and assembles each complete stop segment; this is a plausible
WebKit mitigation, not a proven root-cause fix. The clean Mac source checkout was
`/Users/user297320/Desktop/chironote-ios/chironote-ios-tester-20261021`.

The production web build, `npx cap sync ios`, 38 suites / 245 tests, and the 51
focused tests passed. Archive:
`/Users/user297320/Desktop/chironote-ios/recording-release-20261021/ChiroNote-1.9-14.xcarchive`
(verified `ai.chironote.app`, team `LH7497Z687`, iOS 15.0 minimum; Apple Development
signature). TestFlight export:
`/Users/user297320/Desktop/chironote-ios/recording-release-20261021/Delivered-14/ChiroNote-1.9-14.ipa`
(4,177,187 bytes; SHA256
`c6483942da5fdcfe46d33ea1289725807e953bcea7a592fa74efeb1b1b1f26ef`). Its Apple
Distribution signature, `get-task-allow=false`, `beta-reports-active=true`, and
app/Capacitor/Cordova privacy manifests verified. Export used TestFlight Internal
Only and automatic signing; export records are under
`/Users/user297320/Documents/App 2026-10-21 15-14-39`.

Organizer accepted the upload at **3:13 PM PDT**. Build UUID
`3ca05248-94f1-46d9-abac-0a945eea5b2e` is **Testing** for Inner Circle (one
invitation, 90 days remaining). [Processed build](https://appstoreconnect.apple.com/teams/4f8649c7-593d-4b5c-993f-c1a508200a8c/apps/6756679857/testflight/ios/3ca05248-94f1-46d9-abac-0a945eea5b2e).
Saved tester notes request synthetic start/middle/end speech markers, pause/resume,
and a recording longer than four minutes. Physical-device recording completeness
is pending; the public-release hold above remains open. Windows evidence is under
`C:/Users/nikit/Documents/Codex/2026-10-21/ios-build14-recording/`.

## App Store 1.8 (13) upload — October 21, 2026

The owner explicitly authorized public App Store release after PR #67 raised the
minimum OS. Exact archive source is `d5218b86faa17da34ac6a81e910c2b925d0fc59f`;
version/build overrides are `MARKETING_VERSION=1.8`, `CURRENT_PROJECT_VERSION=13`.
The clean Mac checkout and existing real-config web assets were verified. Packaged
web assets match delivered build 12 byte for byte. The earlier 243-test result
covers the unchanged runtime; the changed deployment configuration separately
passed an unsigned native Release build. No new device-test pass is implied.

The logged-in desktop `archive13.command` exited 0. Archive and distribution IPA
verify as `ai.chironote.app`, team `LH7497Z687`, arm64, minimum iOS 15.0, with app,
Capacitor and Cordova privacy manifests. The IPA uses Apple Distribution and Store
provisioning, `get-task-allow=false`, `beta-reports-active=true`, and declares
non-exempt encryption false. Its SHA256 is
`c089dfb07696c7bcadae72b1f93a79b2e96baba52f9fc0f033bf3e7ce80290e9`
(**4,176,316 bytes**). Archive: `tester-release-20261021/ChiroNote-1.8-13.xcarchive`;
package: `tester-release-20261021/Delivered-13/ChiroNote.ipa`, under the same Mac
release root recorded below. Windows evidence remains in `ios-tester-release/`.

Organizer's **App Store Connect** distribution was selected, rather than Internal
Only. The 1.8 App Store draft and factual release notes are saved, retaining the
existing automatic release after approval and immediate automatic-update choices.
Xcode ContentDelivery reports **Upload succeeded with no errors at 1:42:46 PM
PDT**, with delivery state COMPLETE and the build entering PROCESSING. Browser
availability remains unverified after the access interruption below. No submitted
App Review, approval or live public 1.8 is claimed.
Public 1.7 (8) and both prior TestFlight fallbacks remain unchanged.

Access interruption after upload began: the Windows RDP capture became black and
activation failed; later Chrome explicitly blocked automation because another
extension UI was open. The owner was asked to restore the unlocked Windows/
MacinCloud view and dismiss the Chrome extension panel. SSH delivery logs later
confirmed acceptance after analysis completed; no retry was needed. Inspect
Organizer and live Apple history after access returns to record build 13's
processing state. Do not restart the accepted upload or submit build 13 for App
Review while the production hold above remains open.

App Privacy was corrected from six to nine declared data types by adding Name,
Health and Other User Content for the app's patient/clinical-note functionality.
Each addition is declared App Functionality, linked to identity and not used for
tracking; Apple showed Published with no incomplete-setup warning. Existing six
types and the privacy-policy URL were retained. This public metadata correction
is separate from binary availability and is not a full third-party/legal audit.
See [privacy boundaries](../security/privacy-boundaries.md) for the unchanged
Capacitor advisory; neither the target fix nor the public-release request patches it.

## Minimum iOS deployment target — October 21, 2026

The source minimum is **iOS 15.0** in both project and app Debug/Release
configurations and the CocoaPods platform. iOS 13 and 14 are no longer supported
by future builds from this source. This addresses the deployment-target warning
observed during the build-12 upload; SDK requirements remain a separate check.
Build 12 already in TestFlight retains its original iOS 13 minimum. A new signed
archive/upload is required to deliver this change; no public release is implied.
The existing Capacitor security limitation remains separate and unchanged.

Mac verification of source `b96af279` passed CocoaPods install and an unsigned
Release build on Xcode 26.6 with effective App deployment target 15.0. The
regenerated Podfile.lock changes only its Podfile checksum; dependency versions
are unchanged. Evidence is under the existing release root's `target15-check/`.
This verifies native compilation, separate from signing or device acceptance.

## Prior TestFlight build — 1.8 (12), October 21, 2026

At its earlier verification checkpoint, **1.8 (12) Internal was Testing for
unchanged Inner Circle**, with one invitation and 90 days remaining. Apple build
UUID `9d155da0-0f5f-4c38-a389-d5c933b454d3`.
[Processed build](https://appstoreconnect.apple.com/teams/4f8649c7-593d-4b5c-993f-c1a508200a8c/apps/6756679857/testflight/ios/9d155da0-0f5f-4c38-a389-d5c933b454d3).
Recheck live availability before relying on it as a fallback. This superseded the
earlier access-blocked checkpoint below. No new testers, group, public link,
website or public App Store release was performed.

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

At that checkpoint, fallback **1.8 (11)** was Testing in Inner Circle with **85
days** remaining; its archive and hash-verified delivered IPA are preserved.
Recheck live availability before relying on it. Public 1.7 was not changed.
Public promotion remains a separate authorization/review; this tester release
does not establish device or security readiness for that step. The shipped
Capacitor framework is **6.2.1**,
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
15.0, declares microphone and speech usage text, enables background audio, and
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
After PR #73 merged, the primary Windows checkout was fast-forwarded to the
verified `origin/cap-ios` merge `367eb6558c1ccfdc0852d56f12c39e3a51d10bef` and
now matches that remote head. Before reconciliation, five tracked changes,
including a binary patch, and nine original untracked files (14 files total)
were preserved under
`C:/Users/nikit/Documents/Codex/2026-10-21/ios-build14-recording/primary-backup/`.
