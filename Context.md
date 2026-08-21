# ChiroNote Application Context

## 1. Application Overview

ChiroNote is a sophisticated clinical documentation tool designed for practitioners to streamline their note-taking process. It's a React-based Single Page Application (SPA) powered by an AWS Amplify backend. The core functionality revolves around recording audio from clinical encounters, transcribing it into text, and leveraging that text to generate structured SOAP notes. The app also supports real-time dictation and robust editing capabilities, effectively acting as a zero-shot tool to transform spoken language into organized clinical notes. The entire backend, including authentication, database, and API, is managed through AWS services.

## 2. Core Technologies

- **Frontend**: React.js, React Router, Custom Authentication UI
- **Backend**: AWS Amplify
- **API**: GraphQL (managed by AWS AppSync)
- **Database**: Amazon DynamoDB (managed by Amplify)
- **Authentication**: Amazon Cognito with Custom Sign-In UI (Gen 1 Amplify Auth)
- **Real-time Communication**: AWS AppSync Subscriptions (via WebSockets)
- **Audio Processing**: Likely involves AWS Transcribe for transcription, potentially orchestrated by AWS Lambda functions triggered from the frontend.

## 3. High-Level Project Structure

- `amplify/`: Contains all the backend definitions managed by the Amplify CLI. This includes the GraphQL schema, definitions for authentication, and other backend resources.
- `src/`: The heart of the React application.
  - `App.jsx`: The root component, responsible for orchestrating the entire authenticated user experience, managing global state, and handling data fetching.
  - `components/`: Contains all the modular React components that make up the UI.
    - `Recording/`: Components related to audio recording, dictation, and transcription streaming.
    - `Account/`: User account and subscription management.
    - `AuthUI/`: Custom authentication components replacing AWS Hosted UI.
    - `Navbar/`, `TogglePanel/`, `EditPanel/`: Core UI layout components.
  - `graphql/`: Auto-generated and custom GraphQL queries, mutations, and subscriptions.
  - `utils/`: Utility functions, such as analytics trackers.
- `public/`: Static assets and the main `index.html` file.

## 4. Backend Architecture (AWS Amplify)

The backend is built on a serverless architecture using AWS Amplify, which provisions and manages the underlying AWS services:

- **Authentication**: `Amazon Cognito` handles user sign-up, sign-in, and session management. The frontend integrates with this using custom authentication components built with Gen 1 Amplify Auth functions (`signIn`, `getCurrentUser`, `signOut`) from `aws-amplify/auth`, replacing the AWS Hosted UI for better mobile compatibility.
- **API & Database**: An `AWS AppSync` GraphQL API serves as the interface between the frontend and the database. The database itself is `Amazon DynamoDB`, where all notes and transcripts are stored. The schema is defined in `amplify/backend/api/chironotev4/schema.graphql`. The schema includes a `noteLabel` field for custom note titles.
- **Real-time Functionality**: `AppSync Subscriptions` are used to push real-time updates to the client. For example, when a new note is created or a transcription is finished, the `onUpdateNotesByOwner` subscription pushes the new data to the app, which then updates the UI without needing a manual refresh.
- **Audio Transcription**: While not explicitly defined in `App.jsx`, the flow suggests that audio is sent to a service like `AWS Transcribe`. This is likely handled by a combination of frontend logic in `RecordingManager.jsx` and potentially an AWS Lambda function to process the audio file and update the DynamoDB table with the resulting transcript via a GraphQL mutation.

## 5. Frontend State Management & Data Flow (`App.jsx`)

The `AuthenticatedApp` component within `App.jsx` is the central hub for the application's state and logic after a user logs in. State is managed primarily through React hooks (`useState`, `useEffect`, `useRef`).

### Key State Variables:

- `notes` & `transcripts`: Two arrays that hold the user's note and transcript data, fetched from DynamoDB.
- `showNotes`: A boolean that toggles the view in the left panel (`TogglePanel`) between the notes list and the transcripts list.
- `isCollapsed` & `showEditPanel`: Booleans that control the visibility of the left and right side panels, respectively, allowing for a responsive layout.
- `showRecordingPopup`, `showDictationPopup`, `showContentPopup`: Booleans that manage the visibility of the primary modals for recording, dictation, and viewing content.
- `selectedItem`: An object holding the full data for a note or transcript when a user clicks on it. This is used to populate the `ContentPopup`.
- `clipboardContent`: The text displayed in the main central text area (`Clipboard.jsx`). This is the primary workspace for the user.
- `editContent`: The text being edited in the right-hand `EditPanel`.
- `streamingText`: Holds the real-time text being generated during dictation or transcription.
- `isLoading`, `queryLoaded`: Booleans to manage the UI's loading state during initial data fetch.

### Core Data Flow:

1.  **Initial Load**: On mount, `useEffect` triggers `fetchNotes`. This function calls the `listNotes` GraphQL query via the Amplify `client`, fetching the user's 100 most recent notes and transcripts from DynamoDB and populating the `notes` and `transcripts` state arrays.
2.  **Display**: The `TogglePanel` component renders the `notes` or `transcripts` array as a list of `ListItem` components, grouped by week using the `groupItemsByWeek` helper function.
3.  **User Interaction**:
    - Clicking a `ListItem` calls `toggleContentPopup`, setting the `selectedItem` and displaying the full content in a modal.
    - Clicking the "New Note" button triggers `setShowRecordingPopup(true)`, opening the recording interface.
4.  **Recording & Transcription (`RecordingManager.jsx`)**:
    - The recording process is initiated. Upon completion, the audio is processed.
    - A GraphQL mutation (e.g., `createNote`) is called, creating a new entry in DynamoDB, often with just the transcript initially.
5.  **Real-time Updates**: The `useEffect` that sets up the `onUpdateNotesByOwner` subscription listens for changes. When the transcription is complete and the database record is updated, AppSync pushes the updated item to the frontend. The subscription's `next` handler receives this data and updates the `notes` or `transcripts` state, causing the UI to re-render with the new item, often highlighted.
6.  **Editing**: A user can drag content to the `Clipboard` or `EditPanel`. Changes made in the `EditPanel` are saved via a GraphQL mutation (e.g., `updateNote`).

This architecture creates a reactive and seamless user experience, where backend processing and data updates are reflected in the UI automatically and efficiently.

## 6. Routing & Authentication Boundary

The application employs a streamlined routing structure using `react-router-dom` that immediately redirects users to the authenticated application.

### Simplified Router (`App` component)

The main `App` component, rendered directly by `index.js`, sets up the top-level router with direct authentication flow:

- **`'/'` (Root Path)**: This route immediately redirects to `/app` using `<Navigate to="/app" replace />`. There is no landing page - users go directly to the authentication flow.
- **`'/app/*'` (Protected Path)**: This route is a wildcard that matches any URL starting with `/app`. It renders the `<ProtectedApp />` component, which acts as the gateway to the entire authenticated application.
- **`'*'` (Catch-all Path)**: A fallback route that redirects any unrecognized URL back to the root path, which then redirects to `/app`.

### Tier 2: Custom Authentication & Authenticated Application

This tier handles authentication flow and all functionality once a user is logged in.

- **Custom Authentication System**: The `<ProtectedApp />` component renders the `<AuthContainer />` component, which implements a custom authentication flow instead of AWS Hosted UI. Key components include:
  - **`AuthContainer.jsx`**: Main authentication wrapper that manages auth state using `getCurrentUser` and `signOut` from `aws-amplify/auth`. Listens to auth events via AWS Amplify Hub and conditionally renders either the sign-in form or the authenticated app.
  - **`SignInForm.jsx`**: Custom sign-in interface that uses `signIn` from `aws-amplify/auth` (Gen 1 Amplify) for authentication. Features a modern UI matching ChiroNote's design with the logo positioned above a glass-like form container.
  - **`AuthUI.css`**: Styling for the custom authentication interface with enhanced visual design, including semi-transparent backgrounds, backdrop blur effects, and improved shadows for a premium appearance.

- **Authentication Flow**: When users are not authenticated, they see the custom `SignInForm` with email/password fields. The form uses Gen 1 Amplify auth functions (`signIn`, `getCurrentUser`) instead of the hosted UI. After successful authentication, `AuthContainer` passes user details and `signOut` function to `AuthenticatedApp`.

- **Internal Routing (`AuthenticatedApp`)**: Once inside `AuthenticatedApp`, a second, nested `<Routes>` block manages navigation within the secure part of the application. Routes here are relative to `/app`. For example:
  - `path="/"`: Renders the main dashboard (Clipboard, Panels, etc.).
  - `path="/account"`: Renders the `<Account />` component.
  - `path="/feedback"`: Renders the `<Feedback />` component.

This custom authentication approach provides better mobile compatibility (especially for Android Credential Manager integration) while maintaining the security model where business logic is only accessible after authentication verification.

## 7. Key Component Responsibilities

While `App.jsx` orchestrates the application, several other key components encapsulate major pieces of functionality:

- **`RecordingManager.jsx`**: This is a headless component (acting as a custom hook) that contains all the complex state and logic for the audio recording lifecycle. It manages starting, stopping, pausing, and discarding recordings, and it controls the UI state flags (`isRecording`, `isPreparingTranscript`, etc.) that are consumed by the `Recording` popup component. It is the single source of truth for the recording process.

- **`Dictation.jsx`**: Similar to the `RecordingManager`, this is a headless component/hook that manages the real-time dictation feature. It handles the WebSocket connection for streaming transcription, manages its own set of states (`isTranscribing`, `isDictationLoading`), and exposes the core `toggleDictation` function to the rest of the app.

- **`TogglePanel.jsx`**: The collapsible left-side panel. Its primary job is to display the lists of notes or transcripts and allow the user to switch between them. It renders the `ListItem` components and handles user selections.

- **`EditPanel.jsx`**: The collapsible right-side panel. This component provides a dedicated space for editing text, separate from the main `Clipboard`. It contains its own text area and logic for interacting with the clipboard content.

- **`Clipboard.jsx`**: The central text area of the application. This is the user's primary workspace, where text from transcriptions, dictation, or manual edits is displayed and manipulated.

- **`ContentPopup.jsx`**: The modal used to display the full, detailed content of a selected note or transcript. It also contains the logic for the inline editing of a note's title (`noteLabel`).

## 8. Styling and UI Approach

The application's visual design and styling are guided by a few key principles:

- **Centralized CSS**: The vast majority of styles are located in a single, global stylesheet: `src/App.css`. This file contains rules for nearly every component, creating a centralized place for the application's look and feel.

- **Minimalist & Functional Design**: The UI prioritizes a clean, text-focused, and uncluttered experience. The design philosophy favors function over form to ensure practitioners can focus on their documentation tasks without distraction.

- **Iconography**: The application uses [Google's Material Symbols (Rounded)](https://fonts.google.com/icons?selected=Material+Symbols+Rounded) for all icons. This provides a consistent, modern, and easily recognizable visual language throughout the UI.

- **Responsive Layout**: The app is designed to be responsive. Its most notable responsive feature is the automatic collapsing and toggling of the side panels (`TogglePanel`, `EditPanel`) on medium and small screens to maximize the usable space for the main clipboard area, ensuring a good user experience on tablets and mobile devices.

## 9. Capacitor Mobile App Build Process

ChiroNote is also deployed as a native mobile app using Capacitor. The correct build process is:

1. **Sync web assets to native platforms:**
   ```bash
   npx cap sync android
   ```

2. **Build the native app:**
   ```bash
   npx cap build android
   ```

3. **Open in Android Studio for final APK generation:**
   ```bash
   npx cap open android
   ```

The APK will be generated in `android/app/build/outputs/apk/debug/app-debug.apk`.

## 10. Capacitor-Specific Code Implementations

### Clipboard API Implementation (iOS/Android Fix)

**Issue:** On iPhone and some Android devices, using the web `navigator.clipboard.writeText()` API caused URL-encoded characters (like `%20` for spaces) to appear in pasted text, making copied content unusable.

**Root Cause:** iOS and Android have different clipboard handling compared to web browsers. The web Clipboard API doesn't always properly encode text for native platforms, resulting in URL-encoded output when pasting.

**Solution:** Implemented Capacitor's native Clipboard plugin (`@capacitor/clipboard`) which provides proper clipboard handling across all platforms.

**Implementation:**

**App.jsx:**
- Added `Clipboard` import from `@capacitor/clipboard`
- Created `copyToClipboard()` helper function that detects platform and uses appropriate API
- Updated `handleCopy()` to use async/await with `copyToClipboard()`
- Updated `handleCopyPaste()` to use the new clipboard helper

**ContentPopup.jsx:**
- Added `Clipboard` import from `@capacitor/clipboard`
- Updated `handleSectionCopy()` to use Capacitor Clipboard API for native platforms
- Maintains backward compatibility with web clipboard API for browsers

**Clipboard.jsx:**
- Added `Clipboard` import from `@capacitor/clipboard`
- Updated `copySection()` SOAP button functionality to use Capacitor Clipboard API
- Ensures consistent clipboard behavior across all copy operations

**Key Code Pattern:**
```javascript
import { Capacitor } from '@capacitor/core';
import { Clipboard } from '@capacitor/clipboard';

const copyToClipboard = async (text) => {
  if (Capacitor.isNativePlatform()) {
    // Use Capacitor Clipboard for iOS/Android
    await Clipboard.write({ string: text });
  } else {
    // Use web clipboard API for browsers
    await navigator.clipboard.writeText(text);
  }
};
```

**Impact:**
- ✅ Fixes %20 encoding issue on iPhone
- ✅ Ensures proper text encoding across all platforms
- ✅ Maintains web browser compatibility
- ✅ Applies to all copy operations: main clipboard copy, ContentPopup copy, and SOAP section buttons

### Microphone Permission Handling

Both `Dictation.jsx` and `RecordingManager.jsx` have been updated to handle Capacitor's native platform requirements for microphone access:

**Dictation.jsx:**
- Added `Capacitor` import from `@capacitor/core`
- Implemented `requestMicrophonePermission()` function that detects native platform
- Enhanced `getMediaStream()` with platform-aware logging and error handling
- Provides specific error messages for mobile permission issues

**RecordingManager.jsx:**
- Added `Capacitor` import from `@capacitor/core`
- Enhanced `setupRecorder()` function with native platform detection
- Added logging for microphone access debugging on mobile devices
- **Background Recording Protection**: Implements app state detection to prevent recording interruption when app is backgrounded

**Key Implementation Pattern:**
```javascript
import { Capacitor } from '@capacitor/core';

// Check if running on native platform
if (Capacitor.isNativePlatform()) {
  console.log('Running on native platform, requesting microphone access...');
}

// Enhanced getUserMedia with better error handling
const stream = await navigator.mediaDevices.getUserMedia({
  audio: { /* audio constraints */ }
});
```

This ensures proper microphone permission handling across web and native mobile platforms, resolving DOMException errors that occur when `getUserMedia` fails on mobile devices.

### Background Recording Continuity (Android & iOS)

**Problem:** Recording is segmented into 4-minute chunks for progressive upload. When the app is backgrounded during a chunk transition (stop/start cycle), Android WebView suspends microphone access, resulting in empty transcripts for subsequent chunks.

**Solution:** `RecordingManager.jsx` now detects app state changes and adapts recording behavior:

**Implementation:**
```javascript
import { App as CapacitorApp } from '@capacitor/app';

// Listen for app state changes
CapacitorApp.addListener('appStateChange', ({ isActive }) => {
  if (!isActive && isRecording) {
    // BACKGROUNDED: Stop chunking interval, continue recording as one continuous blob
    clearInterval(recordingIntervalRef.current);
    // Recording continues without interruption
  } else if (isActive && isRecording) {
    // FOREGROUNDED: Save background chunk and resume 4-minute chunking
    mediaRecorder.stop();
    mediaRecorder.start();
    // Restart chunking interval
  }
});
```

**Behavior:**
- **Foreground**: Normal 4-minute chunking for progressive upload and memory management
- **Background**: Stops chunking, lets MediaRecorder accumulate audio in a single blob
- **Return to Foreground**: Saves the background recording chunk, resumes normal chunking

**iPhone lifecycle safety:** On iPhone/iPad, a four-minute rotation waits for the
recorder's `stop` event before starting the next MP4 segment. Finalization also
waits for the final `dataavailable`/`stop` sequence before stopping microphone
tracks, and a stop requested while paused resumes only long enough to flush the
recorder. This prevents a rotation or pause/resume boundary from producing an
incomplete final chunk.

**Trade-offs:**
- ✅ **Prevents data loss** - No empty transcripts from failed chunk transitions
- ✅ **iOS compatibility** - Works with existing `UIBackgroundModes` audio configuration
- ✅ **Android compatibility** - Avoids WebView microphone suspension during chunk cycles
- ⚠️ **Memory usage** - Background period accumulates larger blob (acceptable for clinical recordings)
- ⚠️ **Note**: Android WebView may still suspend microphone after extended background time (device/manufacturer dependent)

**Logging:** Comprehensive console logging tracks state transitions for debugging:
```
[RecordingManager] App backgrounded during recording - STOPPING chunking interval
[RecordingManager] Recording will continue without interruption until user returns
[RecordingManager] ✓ Chunking interval cleared - continuous recording active
```

### Android Permissions Configuration

**Required Permissions in `android/app/src/main/AndroidManifest.xml`:**

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
```

**Why these are needed:**
- `INTERNET` - Required for all network communication (API calls, WebSockets, etc.)
- `RECORD_AUDIO` - Core microphone access (requested at runtime via MainActivity.java)
- `MODIFY_AUDIO_SETTINGS` - Required for audio stream control in WebView

**Note:** Earlier versions included `CAMERA` permission as a workaround for WebView compatibility issues. This is **no longer needed** as of v1.2 due to proper runtime permission handling in `MainActivity.java`.

### Android Runtime Permission Request (AAB Fix - v1.2)

**Critical Issue Resolved:** AAB (Android App Bundle) builds were not requesting microphone permissions at runtime, while debug APK builds worked correctly. Users had to manually grant permissions in Settings for AAB builds to function.

**Root Cause:** The `MainActivity.java` WebView permission handler (`onPermissionRequest`) was immediately granting WebView-level permissions without first checking or requesting Android runtime permissions. Debug APKs have lenient permission handling that sometimes auto-granted permissions, but release AABs enforce strict Android 6.0+ (API 23+) runtime permission requirements.

**Solution Implemented:** Modified `android/app/src/main/java/com/chironote/app/MainActivity.java` to implement proper two-layer permission handling:

**Layer 1 - Android Runtime Permissions:**
- Check if app has `RECORD_AUDIO` permission using `ContextCompat.checkSelfPermission()`
- If not granted, store the WebView permission request and call `ActivityCompat.requestPermissions()`
- This triggers the Android system permission dialog
- Handle user's decision in `onRequestPermissionsResult()` callback

**Layer 2 - WebView Permissions:**
- Only grant WebView permissions (`request.grant()`) after Android runtime permissions are confirmed
- Enforce audio-only behavior by granting only `RESOURCE_AUDIO_CAPTURE` when video is not requested
- Deny WebView permission if user denies Android runtime permission

**Key Code Pattern:**
```java
@Override
public void onPermissionRequest(final PermissionRequest request) {
    // Check Android runtime permission first
    if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) 
            != PackageManager.PERMISSION_GRANTED) {
        // Store request and show Android system dialog
        mPendingPermissionRequest = request;
        ActivityCompat.requestPermissions(this, 
            new String[]{Manifest.permission.RECORD_AUDIO}, 
            REQUEST_AUDIO_PERMISSION);
        return;
    }
    // Permission already granted, proceed with WebView grant
    request.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
}

@Override
public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
    // Handle user's permission decision
    if (allGranted) {
        mPendingPermissionRequest.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
    } else {
        mPendingPermissionRequest.deny();
    }
}
```

**Impact:**
- ✅ AAB builds now properly show Android system permission dialog on first microphone access
- ✅ Behavior matches APK builds exactly
- ✅ No JavaScript code changes required - fix is entirely in native Android layer
- ✅ Eliminated need for `CAMERA` permission in manifest
- ✅ Users see only the permissions the app actually uses (microphone only)

**Reference:** Solution based on [Google's official Android PermissionRequest sample](https://github.com/googlesamples/android-PermissionRequest) and Stack Overflow best practices for WebView runtime permissions.

### Android MediaRecorder Zero-Duration Audio Fix (CRITICAL)

**Critical Production Issue:** Recent Android system updates caused the MediaRecorder API to produce audio blobs with `duration=0`, crashing the app for all Android users including active medical practitioners during audio playback attempts.

**Root Cause:** Android WebView's MediaRecorder changed behavior - calling `start()` without a timeslice parameter produces blobs with valid size but **zero duration metadata**. This causes audio players to fail when attempting to process the file.

**Solution Implemented in `RecordingManager.jsx`:**

**1. Android Device Detection (Line 36):**
```javascript
// Android fix: Detect Android devices for timeslice parameter
// Recent Android WebView updates cause MediaRecorder to produce audio blobs with duration=0 without timeslice
const isAndroid = useRef(/android/i.test(navigator.userAgent)).current;
```

**2. Conditional Timeslice Usage:**
- **Android devices**: `mediaRecorderRef.current.start(240000)` (240-second/4-minute timeslice)
- **Other platforms**: `mediaRecorderRef.current.start()` (no timeslice)

**3. Applied in 5 Critical Locations:**
- `startRecording()` function - Initial recording start
- Recording interval restart (4-minute chunk cycle)
- `resumeRecording()` function - After pause
- Background app state handling - Foreground chunk save
- Background app state handling - Interval restart

**Example Implementation:**
```javascript
// Android fix: Use timeslice parameter to ensure proper audio duration metadata
// Without timeslice, Android produces blobs with size > 0 but duration = 0
// Using 240-second timeslice to match chunk cycle and enable proper transcription
if (isAndroid) {
  mediaRecorderRef.current.start(240000); // 240-second (4-minute) timeslice for Android
} else {
  mediaRecorderRef.current.start(); // No timeslice for other platforms
}
```

**Why This Works:**
- The 240-second (4-minute) timeslice forces regular `ondataavailable` events with proper duration metadata
- Matches the existing 4-minute chunk cycle architecture
- Android WebView correctly calculates duration when timeslice is specified
- Enables backend transcription system to process properly-sized chunks
- Minimizes audio quality degradation by reducing chunk boundaries

**Platform Behavior:**
- **Android Capacitor app**: Uses 240-second (4-minute) timeslice for proper metadata
- **iOS Capacitor app**: Uses original behavior (no timeslice)
- **Web version**: Uses original behavior (no timeslice)

**Impact:**
- ✅ Fixes zero-duration crashes on all Android devices
- ✅ Creates audio chunks every 4 minutes with proper metadata
- ✅ Enables backend transcription system to process chunks (can't transcribe 10-second chunks)
- ✅ Preserves audio quality - no word loss or dropouts
- ✅ Zero impact on iOS, web browsers, or other platforms
- ✅ Preserves all existing functionality including pause/resume and background recording
- ✅ No additional dependencies required

**Trade-offs:**
- ✅ Timeslice matches existing 4-minute chunk cycle (no additional chunking)
- ✅ Preserves audio quality by minimizing chunk boundaries
- ✅ No additional S3 uploads beyond existing architecture
- ✅ Minimal performance impact - acceptable for clinical note-taking use case

**Audio Quality & Transcription Considerations:**
- Initial implementation used 10-second timeslice which caused two critical issues:
  1. **Audio quality degradation** - Frequent chunk boundaries led to audio data loss and missing words
  2. **Backend transcription failure** - Transcription system cannot process 10-second chunks
- 240-second timeslice resolves both issues while maintaining zero-duration fix
- Aligns with existing recording architecture for optimal performance

**CRITICAL:** This fix must be preserved in all future updates to `RecordingManager.jsx`. Any changes to recording logic that use `mediaRecorderRef.current.start()` MUST include the conditional timeslice parameter.

## 11. History Refresh on App Resume

**Location:** `App.jsx` (lines 289-338)

The app automatically refreshes notes/transcripts history when returning to the foreground using a queue-based system:

- **Web/Browser:** Listens to `visibilitychange` events
- **Native Mobile:** Uses Capacitor's `appStateChange` listener
- **Refresh Queue:** Prevents overlapping operations via `refreshQueueRef` and `isProcessingRefreshRef`
- **Execution:** Calls `fetchNotes({ showLoading: false })` for non-intrusive background refresh

This ensures users always see current data when resuming the app across both web and native platforms.

## 12. iOS Platform Configuration & Build Process

### iOS Platform Structure

The iOS platform is located in the `ios/` directory with the following structure:

```
ios/
├── App/                              # Main Xcode project directory
│   ├── App/                         # App source files
│   │   ├── AppDelegate.swift       # iOS app lifecycle management
│   │   ├── Info.plist              # iOS app configuration & permissions
│   │   ├── Assets.xcassets/        # App icons and launch images
│   │   ├── Base.lproj/             # Launch screen storyboard
│   │   ├── public/                 # Web assets (synced from build/)
│   │   └── capacitor.config.json   # Capacitor config (synced)
│   ├── App.xcodeproj/              # Xcode project file
│   ├── App.xcworkspace/            # Xcode workspace (use this!)
│   └── Podfile                     # CocoaPods dependencies
└── capacitor-cordova-ios-plugins/  # Capacitor plugin bridge
```

**IMPORTANT:** Always open `App.xcworkspace`, NOT `App.xcodeproj`, when working in Xcode.

### Required iOS Permissions (Info.plist)

The following permissions are configured in `ios/App/App/Info.plist`:

#### 1. Microphone Permission (REQUIRED)
```xml
<key>NSMicrophoneUsageDescription</key>
<string>ChiroNote needs microphone access to record clinical notes and provide real-time dictation for your documentation.</string>
```

**Why:** Required for `getUserMedia()` API calls in Recording and Dictation components.  
**User Experience:** iOS shows system permission dialog on first microphone access attempt.

#### 2. Speech Recognition Permission (RECOMMENDED)
```xml
<key>NSSpeechRecognitionUsageDescription</key>
<string>ChiroNote uses speech recognition to provide accurate transcription of your clinical notes.</string>
```

**Why:** Enhances iOS's native speech recognition capabilities for better dictation accuracy.  
**User Experience:** Separate permission dialog, shown if speech recognition features are used.

#### 3. Background Audio Mode
```xml
<key>UIBackgroundModes</key>
<array>
    <string>audio</string>
</array>
```

**Why:** Allows audio recording to continue when app moves to background.  
**Impact:** Essential for clinical workflows where recording may span multiple app states.

#### 4. App Transport Security
```xml
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <false/>
</dict>
```

**Why:** Enforces HTTPS-only connections for security.  
**Note:** Set to `false` since all API endpoints use HTTPS.

#### 5. Encryption Declaration
```xml
<key>ITSAppUsesNonExemptEncryption</key>
<false/>
```

**Why:** Required for App Store submission.  
**Note:** Set to `false` because app uses standard HTTPS encryption (no custom crypto).

### iOS Build Process

#### Prerequisites (Must be done on Mac):
1. **macOS**: Version 10.15 (Catalina) or later
2. **Xcode**: Latest version from Mac App Store
3. **CocoaPods**: Install with `sudo gem install cocoapods`
4. **Apple Developer Account**: Free for testing, $99/year for App Store

#### Initial Setup (One-time):
```bash
# 1. Clone/pull project on Mac
git pull origin main

# 2. Install npm dependencies
npm install

# 3. Install iOS native dependencies
cd ios/App
pod install
cd ../..
```

#### Standard Build Process:

**Option A: Command Line (Quick Testing)**
```bash
# 1. Build React app
npm run build

# 2. Sync to iOS
npx cap sync ios

# 3. Run on simulator
npx cap run ios

# 4. Or open in Xcode for more control
npx cap open ios
```

**Option B: Xcode (Full Control)**
```bash
# 1. Build and sync
npm run build
npx cap sync ios

# 2. Open Xcode
npx cap open ios

# 3. In Xcode:
#    - Select target device (simulator or physical)
#    - Click Run button (▶️)
```

#### Clean Build (After major changes):
```bash
# 1. Clean iOS build
cd ios/App
xcodebuild clean
cd ../..

# 2. Remove derived data
rm -rf ~/Library/Developer/Xcode/DerivedData/App-*

# 3. Rebuild
npm run build
npx cap sync ios
```

### Code Signing & Provisioning

#### Development Testing:
1. Open `ios/App/App.xcworkspace` in Xcode
2. Select **App** target in project navigator
3. Go to **Signing & Capabilities** tab
4. Select your **Team** from dropdown (requires Apple Developer account)
5. Xcode automatically creates development provisioning profile

#### Distribution Configuration:
- **App Store**: Requires App Store distribution certificate & provisioning profile
- **Ad Hoc**: For testing on specific devices without App Store
- **Enterprise**: For internal company distribution (requires Enterprise account)

### Associated Domains (Credential Manager Integration)

For iOS Keychain integration matching Android's Credential Manager:

#### 1. Add Capability in Xcode:
1. Select **App** target
2. Click **+ Capability**
3. Add **Associated Domains**
4. Add domain: `applinks:chironote.ai`

#### 2. Create Apple App Site Association File:
**Location:** `https://chironote.ai/.well-known/apple-app-site-association`

```json
{
  "webcredentials": {
    "apps": ["TEAMID.com.chironote.app"]
  },
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "TEAMID.com.chironote.app",
        "paths": ["*"]
      }
    ]
  }
}
```

**Note:** Replace `TEAMID` with your actual Apple Developer Team ID.

### iOS-Specific Code Implementations

The app already includes iOS-compatible code via Capacitor platform detection:

**Dictation.jsx:**
- Uses `Capacitor.isNativePlatform()` for platform detection
- Handles iOS-specific microphone permission flows
- Provides iOS-specific error messages

**RecordingManager.jsx:**
- Enhanced `setupRecorder()` with iOS platform logging
- iOS-compatible getUserMedia constraints
- iOS-specific debugging for microphone access

**App.jsx:**
- Uses `@capacitor/app` for iOS lifecycle events
- Handles iOS app state changes for history refresh
- iOS-specific background/foreground detection

### Troubleshooting iOS Issues

#### Issue: "Microphone Permission Denied"
**Cause:** User denied permission or permission not configured in Info.plist  
**Solution:**
1. Verify NSMicrophoneUsageDescription exists in Info.plist
2. Delete app and reinstall to reset permissions
3. Or: Settings > ChiroNote > Enable Microphone

#### Issue: "CocoaPods Not Installed"
**Cause:** CocoaPods not available on Mac  
**Solution:**
```bash
sudo gem install cocoapods
cd ios/App
pod install
```

#### Issue: "No Provisioning Profile"
**Cause:** Not signed into Apple Developer account in Xcode  
**Solution:**
1. Xcode > Settings > Accounts
2. Add Apple ID
3. Select team in project Signing & Capabilities

#### Issue: "Build Failed - Module Not Found"
**Cause:** Outdated pods or derived data  
**Solution:**
```bash
cd ios/App
pod deintegrate
pod install
cd ../..
npm run build
npx cap sync ios
```

#### Issue: "App Won't Install on Device"
**Cause:** Certificate trust issue  
**Solution:**
1. On iOS device: Settings > General > VPN & Device Management
2. Trust developer certificate
3. Reinstall app

### iOS vs Android Key Differences

| Feature | iOS | Android |
|---------|-----|---------|
| **IDE** | Xcode (Mac only) | Android Studio (any OS) |
| **Language** | Swift/Objective-C | Java/Kotlin |
| **Signing** | Certificates & Profiles | Keystore file |
| **Permissions** | Auto-prompt on first use | Explicit runtime request |
| **Background** | Requires capability | Requires permission |
| **File System** | Sandboxed strictly | More flexible |
| **WebView** | WKWebView | Android WebView |
| **Distribution** | TestFlight or Ad Hoc | APK or AAB file |

### App Store Submission Checklist

When ready to submit to App Store:

1. **App Store Connect Setup:**
   - Create app listing at https://appstoreconnect.apple.com
   - Configure metadata (description, keywords, screenshots)
   - Upload app icons (1024x1024 PNG)

2. **Archive in Xcode:**
   - Select "Any iOS Device (arm64)"
   - Product > Archive
   - Wait for archive to complete

3. **Distribute:**
   - Open Organizer (Window > Organizer)
   - Select archive
   - Click "Distribute App"
   - Choose "App Store Connect"
   - Upload for TestFlight or review

4. **Submit for Review:**
   - Complete App Store Connect questionnaire
   - Submit for review
   - Wait 24-48 hours for initial review

### iOS Build Outputs

- **Development:** Installed directly on device/simulator (no file)
- **Archive:** `.xcarchive` file in `~/Library/Developer/Xcode/Archives`
- **IPA:** Generated during distribution (iOS App Store Package)
- **dSYM:** Debug symbols for crash reporting

### Minimum iOS Version

Current minimum deployment target: **iOS 13.0**

This can be changed in Xcode:
1. Select App target
2. General tab
3. Deployment Info > iOS Deployment Target

**Recommendation:** Keep at iOS 13.0+ for maximum device compatibility while maintaining modern API support.
