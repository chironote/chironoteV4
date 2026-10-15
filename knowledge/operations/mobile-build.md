---
type: mobile-build-operations
title: "Capacitor Mobile Build"
description: "Web-to-native synchronization, iOS and Android project constraints, permissions, and build preparation."
resource: "../../capacitor.config.json"
tags: [capacitor, ios, android, build, permissions]
---

# Capacitor Mobile Build

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
