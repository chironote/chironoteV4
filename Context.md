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

### Android Permissions Fix

**Critical Issue:** When converting a web app to Capacitor, `getUserMedia` fails with DOMException because Android WebView requires additional permissions beyond what browsers handle automatically.

**Solution:** Add these permissions to `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.RECORD_VIDEO" />
```

**Why these are needed:**
- `MODIFY_AUDIO_SETTINGS` - Required for audio stream control in WebView
- `CAMERA` - Required by WebView even for audio-only `getUserMedia` calls
- `RECORD_VIDEO` - Required for MediaRecorder API functionality

This resolves the "Error accessing microphone [object DOMException]" that appears in logcat when the web app is packaged as a Capacitor app.
