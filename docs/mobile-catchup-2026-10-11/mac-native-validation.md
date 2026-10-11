# Mac native validation — 2026-10-11

The isolated Mac checkout started at cap-ios merge commit
`9b8793fb28fe02ce559a10e0bd42ff6c3b19274c` (PR #39). The original Mac checkout
and its existing Amplify/Xcode edits were preserved.

- Node 26.3.0, npm 11.16.0, CocoaPods 1.16.2, Xcode 26.6 (17F113).
- `npm ci` and the production web build completed; existing npm/lint warnings remain.
- `npx --no-install cap sync ios` passed with nine plugins, including Share 6.0.2.
- `git diff --exit-code -- ios/App/App.xcodeproj/project.pbxproj` passed after sync.
- The only tracked native change was Podfile.lock: Share's pod/dependency/source/checksum
  and the Podfile checksum. Existing pod versions and checksums stayed unchanged.
- `xcodebuild -workspace ios/App/App.xcworkspace -scheme App -configuration Debug
  -sdk iphonesimulator -destination "generic/platform=iOS Simulator"
  -derivedDataPath ../chironote-ios-derived-data CODE_SIGNING_ALLOWED=NO build`
  completed with **BUILD SUCCEEDED**. The existing CocoaPods Embed Frameworks
  script emitted its missing-output/dependency-analysis warning.
- `ChiroNote.app/PrivacyInfo.xcprivacy` exists in the built simulator product;
  Capacitor and Cordova framework privacy manifests are present as well.

This is an unsigned simulator build. A signed archive, Apple app-record/build-number
verification, and physical-device recording, background, autofill and PDF-share
acceptance remain required before distribution. No store submission or backend
mutation was performed. Neither bundle identifier was changed.
