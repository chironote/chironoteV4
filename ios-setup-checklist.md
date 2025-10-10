# iOS Build Preparation Checklist

## ✅ Completed on Windows

- [x] iOS platform added (`npx cap add ios`)
- [x] React app built (`npm run build`)
- [x] Assets synced to iOS (`npx cap sync ios`)
- [x] iOS project structure created in `/ios` folder
- [x] Info.plist updated with required permissions
- [x] iOS documentation added to Context.md

## 🍎 Tasks to Complete on Mac

### Phase 1: Initial Setup

- [ ] Pull latest code from Git
- [ ] Run `npm install`
- [ ] Install CocoaPods: `sudo gem install cocoapods`
- [ ] Install iOS dependencies: `cd ios/App && pod install`
- [ ] Open Xcode: `npx cap open ios`

### Phase 2: Xcode Configuration

- [ ] Select development team (Xcode > Signing & Capabilities)
- [ ] Verify bundle identifier: `com.chironote.app`
- [ ] Add Associated Domains capability
  - Add domain: `applinks:chironote.ai`
- [ ] Verify Info.plist permissions are present
- [ ] Check deployment target (iOS 13.0+)

### Phase 3: Build & Test

- [ ] Build for simulator: `npx cap run ios`
- [ ] Test microphone permission prompt
- [ ] Test recording functionality
- [ ] Test dictation functionality
- [ ] Build for physical device (requires Apple Developer account)

### Phase 4: App Store Preparation (Later)

- [ ] Create App Store Connect listing
- [ ] Upload app icons (1024x1024)
- [ ] Create screenshots for various device sizes
- [ ] Archive and upload to App Store Connect
- [ ] Submit for review

## 📱 iOS-Specific Considerations

### Differences from Android:

1. **Code Signing**: iOS requires developer certificates (Android just needs keystore)
2. **Permissions**: iOS shows system dialog automatically when permission is requested
3. **Background Audio**: Requires UIBackgroundModes configuration
4. **Associated Domains**: Need Apple's AASA file at https://chironote.ai/.well-known/apple-app-site-association

### Known Issues to Watch For:

- **Microphone Access**: First time will show system permission dialog
- **WebView Audio**: iOS WKWebView handles audio differently than Android
- **NoSleep.js**: May behave differently on iOS (test screen wake behavior)
- **File Access**: iOS has stricter file system sandboxing

## 🔗 Useful Resources

- [Capacitor iOS Documentation](https://capacitorjs.com/docs/ios)
- [Apple Developer Documentation](https://developer.apple.com/documentation/)
- [iOS App Distribution Guide](https://developer.apple.com/distribute/)
- [Xcode Help](https://help.apple.com/xcode/)

## 📋 Quick Commands Reference

### Build & Sync
```bash
npm run build
npx cap sync ios
```

### Run on Simulator
```bash
npx cap run ios
```

### Open in Xcode
```bash
npx cap open ios
```

### Clean Build
```bash
cd ios/App
xcodebuild clean
cd ../..
npm run build
npx cap sync ios
```

### Install CocoaPods Dependencies
```bash
cd ios/App
pod install
cd ../..
```

## 🚨 Common First-Time Issues

### "CocoaPods not installed"
```bash
sudo gem install cocoapods
cd ios/App
pod install
```

### "No provisioning profile"
1. Open Xcode
2. Xcode > Settings > Accounts
3. Add your Apple ID
4. Select team in project Signing & Capabilities

### "Module not found" errors
```bash
cd ios/App
pod deintegrate
pod install
cd ../..
npm run build
npx cap sync ios
```

### App won't run on device
1. On iPhone: Settings > General > VPN & Device Management
2. Trust the developer certificate
3. Reinstall the app

## 🎯 What to Test First

1. **App Launch**: Does it open without crashing?
2. **Authentication**: Can you sign in?
3. **Microphone Permission**: Does the permission dialog appear?
4. **Recording**: Can you record audio?
5. **Dictation**: Does real-time dictation work?
6. **Background Audio**: Does recording continue when app is backgrounded?
7. **Credential Manager**: Does iOS Keychain save credentials?

## 📦 Build Outputs

- **Development Build**: Installed directly on device/simulator
- **Archive**: Stored in `~/Library/Developer/Xcode/Archives`
- **IPA**: iOS App Store Package (created during distribution)
- **dSYM**: Debug symbols for crash reporting

## ⚙️ Current Configuration

- **App ID**: com.chironote.app
- **App Name**: ChiroNote
- **Hostname**: chironote.ai
- **Scheme**: https
- **Minimum iOS**: 13.0
- **Capacitor Plugins**: 7 plugins (App, Device, Filesystem, Haptics, Keyboard, SplashScreen, StatusBar)
