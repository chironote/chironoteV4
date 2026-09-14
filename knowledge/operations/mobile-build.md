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
includes Capacitor App, Clipboard, Device, Filesystem, Haptics, Keyboard, Splash
Screen, and Status Bar pods. Android targets SDK 35, has min SDK 22, and declares
internet, microphone, and audio-setting permissions.

Native startup hides the splash screen, sets a light status bar, and adds the
`native-mobile` body class. Recording code also handles platform-specific
background and WebKit behavior; native permission and lifecycle behavior must be
tested on devices rather than inferred from the web build.

## Provenance

- [Capacitor config](../../capacitor.config.json)
- [Package scripts](../../package.json)
- [Clean build script](../../clean-build.ps1)
- [iOS checklist](../../ios-setup-checklist.md)
- [iOS pods](../../ios/App/Podfile)
- [iOS permissions](../../ios/App/App/Info.plist)
- [iOS project](../../ios/App/App.xcodeproj/project.pbxproj)
- [Android build](../../android/app/build.gradle)
- [Android versions](../../android/variables.gradle)
- [Android permissions](../../android/app/src/main/AndroidManifest.xml)
- [Native entry point](../../src/index.js)

Generated `build/`, native asset copies, and dependency directories are excluded
from this knowledge layer.
