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
currently declares product bundle identifier `ai.chironote.app`; treat that as a
configuration divergence to resolve deliberately before release. iOS targets
13.0, declares microphone and speech usage text, enables background audio, and
declares Capacitor App, Clipboard, Device, Filesystem, Haptics, Keyboard, Splash
Screen, Share, and Status Bar in its Podfile. CocoaPods 1.16.2 resolved Share
6.0.2 on Mac; the checked-in lockfile records that resolution. The October 11
Mac sync preserved the Xcode project settings and the unsigned Debug simulator
build passed on Xcode 26.6. Signing and physical-device acceptance remain separate.
Android targets SDK 35, has min SDK 22, and declares
internet, microphone, and audio-setting permissions.

Native startup hides the splash screen, sets a light status bar, and adds the
`native-mobile` body class. Recording code also handles platform-specific
background and WebKit behavior; native permission and lifecycle behavior must be
tested on devices rather than inferred from the web build.

The patient workflow adds @capacitor/share 6.0.2, compatible with Capacitor 6. PDF delivery uses Filesystem Cache and the native share sheet; cache expiry is best-effort while suspended and resumes at launch/foreground. Run npm ci, npm run build and npx cap sync ios on Mac, then CocoaPods/Xcode validation. Windows source/build checks cannot validate iOS linking/signing or device behavior. Preserve the existing ai.chironote.app Xcode target; Capacitor 6.2.1 sync left it unchanged in the Mac validation. Verify the registered Apple app identity before reconciling the com.chironote.app Capacitor mismatch or distributing a build.

The app privacy manifest declares only Filesystem file-metadata access inside the app container (FileTimestamp reason C617.1), matching the installed plugin requirement and Apple approved reason. It is linked in the App Resources build phase and was present in the Mac-built simulator app. It does not assert additional collection/tracking/privacy behavior. Confirm it again in the signed archive before distribution.

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
