# ChiroNote Application Context

## 1. Application Overview

ChiroNote is a sophisticated clinical documentation tool designed for practitioners to streamline their note-taking process. It's a React-based Single Page Application (SPA) powered by an AWS Amplify backend. The core functionality revolves around recording audio from clinical encounters, transcribing it into text, and leveraging that text to generate structured SOAP notes. The app also supports real-time dictation and robust editing capabilities, effectively acting as a zero-shot tool to transform spoken language into organized clinical notes. The entire backend, including authentication, database, and API, is managed through AWS services.

## 2. Core Technologies

- **Frontend**: React.js, React Router, `@aws-amplify/ui-react`
- **Backend**: AWS Amplify
- **API**: GraphQL (managed by AWS AppSync)
- **Database**: Amazon DynamoDB (managed by Amplify)
- **Authentication**: Amazon Cognito
- **Real-time Communication**: AWS AppSync Subscriptions (via WebSockets)
- **Audio Processing**: Likely involves AWS Transcribe for transcription, potentially orchestrated by AWS Lambda functions triggered from the frontend.

## 3. High-Level Project Structure

- `amplify/`: Contains all the backend definitions managed by the Amplify CLI. This includes the GraphQL schema, definitions for authentication, and other backend resources.
- `src/`: The heart of the React application.
  - `App.jsx`: The root component, responsible for orchestrating the entire authenticated user experience, managing global state, and handling data fetching.
  - `components/`: Contains all the modular React components that make up the UI.
    - `Recording/`: Components related to audio recording, dictation, and transcription streaming.
    - `Account/`: User account and subscription management.
    - `AuthUI/`: Custom authentication components.
    - `Navbar/`, `TogglePanel/`, `EditPanel/`: Core UI layout components.
  - `graphql/`: Auto-generated and custom GraphQL queries, mutations, and subscriptions.
  - `utils/`: Utility functions, such as analytics trackers.
- `public/`: Static assets and the main `index.html` file.

## 4. Backend Architecture (AWS Amplify)

The backend is built on a serverless architecture using AWS Amplify, which provisions and manages the underlying AWS services:

- **Authentication**: `Amazon Cognito` handles user sign-up, sign-in, and session management. The frontend integrates with this using the `withAuthenticator` HOC and other Amplify Auth utilities.
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

The application employs a two-tiered routing structure using `react-router-dom` to create a clear separation between public-facing content and the secure, authenticated core application.

### Tier 1: Public-Facing Router (`App` component)

The main `App` component, rendered directly by `index.js`, sets up the top-level router. Its primary responsibility is to define the authentication boundary:

- **`'/'` (Root Path)**: Redirects to `/chiropractic-soap-notes-demo` for SEO optimization.
- **`'/chiropractic-soap-notes-demo'` (Landing Page)**: This route renders the `<LandingPage />` component. It is completely public and does not require any authentication. This is the main entry point for new and logged-out users.
- **`'/app/*'` (Protected Path)**: This route is a wildcard that matches any URL starting with `/app`. It renders the `<ProtectedApp />` component, which acts as the gateway to the entire authenticated application.
- **`'*'` (Catch-all Path)**: A fallback route that redirects any unrecognized URL back to `/chiropractic-soap-notes-demo`, preventing users from landing on a broken page.

### Tier 2: Authenticated Application (`ProtectedApp` and `AuthenticatedApp`)

This tier handles all functionality once a user is logged in.

- **Authentication Gate (`ProtectedApp` & `AuthWrapper`)**: The `<ProtectedApp />` component's sole purpose is to render `AuthWrapper`. This wrapper component uses the `withAuthenticator` Higher-Order Component (HOC) from AWS Amplify. `withAuthenticator` wraps the entire `AuthenticatedApp` and automatically handles the authentication flow. If a user is not logged in, it displays the Cognito-powered sign-in/sign-up UI. Only after a successful login does it render the `AuthenticatedApp` component, passing in user details and a `signOut` function as props.

- **Internal Routing (`AuthenticatedApp`)**: Once inside `AuthenticatedApp`, a second, nested `<Routes>` block manages navigation within the secure part of the application. Routes here are relative to `/app`. For example:
  - `path="/"`: Renders the main dashboard (Clipboard, Panels, etc.).
  - `path="/account"`: Renders the `<Account />` component.
  - `path="/feedback"`: Renders the `<Feedback />` component.

This layered approach ensures that the business logic and state of the core application (`AuthenticatedApp`) are never loaded or accessible until a user has been verified by the Amplify authentication layer, providing a robust security model.

## 7. Key Component Responsibilities

While `App.jsx` orchestrates the application, several other key components encapsulate major pieces of functionality:

- **`RecordingManager.jsx`**: This is a headless component (acting as a custom hook) that contains all the complex state and logic for the audio recording lifecycle. It manages starting, stopping, pausing, and discarding recordings, and it controls the UI state flags (`isRecording`, `isPreparingTranscript`, etc.) that are consumed by the `Recording` popup component. It is the single source of truth for the recording process.

- **`Dictation.jsx`**: Similar to the `RecordingManager`, this is a headless component/hook that manages the real-time dictation feature. It handles the WebSocket connection for streaming transcription, manages its own set of states (`isTranscribing`, `isDictationLoading`), and exposes the core `toggleDictation` function to the rest of the app.

- **`TogglePanel.jsx`**: The collapsible left-side panel. Its primary job is to display the lists of notes or transcripts and allow the user to switch between them. It renders the `ListItem` components and handles user selections.

- **`EditPanel.jsx`**: The collapsible right-side panel. This component provides a dedicated space for editing text, separate from the main `Clipboard`. It contains its own text area and logic for interacting with the clipboard content.

- **`Clipboard.jsx`**: The central text area of the application. This is the user's primary workspace, where text from transcriptions, dictation, or manual edits is displayed and manipulated. Includes SOAP+T section buttons (Subjective, Objective, Assessment, Plan, Treatment) that allow quick copying of individual note sections.

- **`ContentPopup.jsx`**: The modal used to display the full, detailed content of a selected note or transcript. It also contains the logic for the inline editing of a note's title (`noteLabel`). Also includes SOAP+T section buttons for copying individual sections from saved notes.

## 8. Styling and UI Approach

The application's visual design and styling are guided by a few key principles:

- **Centralized CSS**: The vast majority of styles are located in a single, global stylesheet: `src/App.css`. This file contains rules for nearly every component, creating a centralized place for the application's look and feel.

- **Minimalist & Functional Design**: The UI prioritizes a clean, text-focused, and uncluttered experience. The design philosophy favors function over form to ensure practitioners can focus on their documentation tasks without distraction.

- **Iconography**: The application uses [Google's Material Symbols (Rounded)](https://fonts.google.com/icons?selected=Material+Symbols+Rounded) for all icons. This provides a consistent, modern, and easily recognizable visual language throughout the UI.

- **Responsive Layout**: The app is designed to be responsive.   Account for silly mistakes llms do such as occasionally missing a comma or a period. Its most notable responsive feature is the automatic collapsing and toggling of the side panels (`TogglePanel`, `EditPanel`) on medium and small screens to maximize the usable space for the main clipboard area, ensuring a good user experience on tablets and mobile devices.

## 9. Blog System

The application includes a fully functional blog system accessible from all landing pages. The blog is designed to be easily maintainable, with a simple process for adding new posts.

### Blog Structure

- **Location**: `src/components/Blog/`
- **Routes**: 
  - `/blog` - Main blog listing page
  - `/blog/:slug` - Individual post pages
- **Navigation**: "Blog" link appears in all 3 landing pages (left of "Video" on desktop, top of mobile menu)

### Key Files

- **`BlogList.jsx`**: Main blog listing page that displays all posts as clickable cards
- **`BlogPost.jsx`**: Individual post viewer with back navigation and logo
- **`Blog.css`**: Complete styling for all blog pages (responsive design)
- **`Post 1.jsx`, `Post 2.jsx`, etc.**: Individual blog post files
- **`README.md`**: Detailed documentation for the blog system

### Adding a New Blog Post

To add a new blog post, follow these three steps:

#### Step 1: Create the Post File

Create a new file in `src/components/Blog/` named `Post X.jsx` (where X is your post number). Use this structure:

```jsx
import React from 'react';

// Post metadata
const metadata = {
  title: "Your Post Title Here",
  synopsis: "A brief 1-2 sentence description for the blog listing page.",
  slug: 'your-post-url-slug',  // URL will be: /blog/your-post-url-slug
};

// Post content component
function PostXContent() {
  return (
    <div>
      <p>Your content goes here...</p>
      
      <h2>Section Heading</h2>
      <p>More content...</p>
      
      <h3>Subsection</h3>
      <ul>
        <li>Bullet point 1</li>
        <li>Bullet point 2</li>
      </ul>
      
      <blockquote>
        "Use blockquotes for emphasized text or quotes"
      </blockquote>
      
      <p>
        You can add <a href="/app">links</a> and <strong>bold text</strong>.
      </p>
    </div>
  );
}

// Export with metadata and component
export default {
  ...metadata,
  component: PostXContent,
};
```

#### Step 2: Register in BlogList.jsx

Open `src/components/Blog/BlogList.jsx`:

1. Add import at the top:
```jsx
import Post2 from './Post 2';
```

2. Add to the `BLOG_POSTS` array:
```jsx
const BLOG_POSTS = [
  Post1,
  Post2,  // Your new post
  // Add more posts here
];
```

#### Step 3: Register in BlogPost.jsx

Open `src/components/Blog/BlogPost.jsx`:

1. Add import at the top:
```jsx
import Post2 from './Post 2';
```

2. Add to the `POST_MAP` object:
```jsx
const POST_MAP = {
  [Post1.slug]: Post1,
  [Post2.slug]: Post2,  // Your new post
};
```

That's it! The new post will automatically appear on the blog listing page and be accessible at its unique URL.

### Available Styling

The blog CSS automatically styles these elements:

- `<p>` - Paragraphs (18px, comfortable line-height)
- `<h2>` - Major section headings (32px, bold, black)
- `<h3>` - Subsection headings (24px, green #075715)
- `<ul>` / `<ol>` - Lists with proper spacing
- `<li>` - List items
- `<a>` - Links (green with hover effect)
- `<blockquote>` - Quoted text (left border, italic)
- `<img>` - Images (responsive, rounded corners)
- `<strong>` / `<b>` - Bold text
- `<em>` / `<i>` - Italic text
- `<hr>` - Horizontal dividers

### Design Features

- Clean layout with bold 3px black borders on post cards
- Logo positioned in top-right corner
- "Welcome to our Blog" header
- Fully responsive (desktop → tablet → mobile)
- Hover effects on post cards
- Back button returns to blog list
- Logo click returns to landing page

## 10. Markdown Scrubber System

The application includes an automatic markdown formatting removal system to ensure clean text output suitable for EHR systems.

### Purpose

LLM-generated content often includes markdown formatting (headings, bold, italics, etc.) which is undesirable when copying into Electronic Health Records. The markdown scrubber automatically removes all markdown syntax before text enters the clipboard or is copied.

### Implementation

- **Location**: `src/utils/markdownStripper.js`
- **Key Function**: `stripMarkdown(text)` - Removes all common markdown formatting

### What Gets Stripped

- Headings (#, ##, ###, etc.)
- Bold (**text** or __text__)
- Italics (*text* or _text_)
- Strikethrough (~~text~~)
- Code blocks (```code```)
- Inline code (`code`)
- Links ([text](url))
- Blockquotes (>)
- List markers (*, -, +, 1., 2., etc.)
- Horizontal rules (---, ***, ___)

### Where It's Applied

1. **Automatic Streaming Cleanup** (Primary): Text is cleaned as it streams into the clipboard from:
   - EditPanel's "Apply Changes" feature (main source of markdown)
   - RecordingManager's note generation
   - Dictation transcription

2. **Copy Operations**: All clipboard copy operations strip markdown:
   - Main copy button in toolbar
   - SOAP+T section buttons (S, O, A, P, T) in main clipboard
   - SOAP+T section buttons in ContentPopup
   - Keyboard shortcuts (Ctrl+C)

### Files Using Markdown Scrubber

- `src/App.jsx` - Strips markdown in `handleTextStreamUpdate` and `extractPlainText`
- `src/components/Clipboard.jsx` - Strips markdown in `copySection` for SOAP+T buttons
- `src/components/ContentPopup.jsx` - Strips markdown in `handleSectionCopy` for SOAP+T buttons

### User Experience

The markdown removal is completely transparent to users. Text appears clean in the clipboard textarea without any markdown syntax, ready for direct pasting into EHR systems.

## 11. Critical Android Audio Duration Fix

### Problem

After a recent Android system update, the MediaRecorder API on Android devices began producing audio blobs with `duration = 0`, causing the app to crash during audio processing. This issue was critical as it affected all Android users, including active medical practitioners using the app for clinical documentation.

### Root Cause

Android's WebView implementation changed how MediaRecorder handles audio blob metadata. When `MediaRecorder.start()` is called without a `timeslice` parameter, the resulting audio blobs have valid size but zero duration, which caused crashes in downstream processing.

### Solution

An Android-specific fix was implemented in `RecordingManager.jsx` that:

1. **Detects Android devices** using user agent detection:
   ```javascript
   const isAndroid = useRef(/android/i.test(navigator.userAgent)).current;
   ```

2. **Uses timeslice parameter for Android only**:
   - Android: `mediaRecorderRef.current.start(10000)` - 10 second timeslice
   - Other platforms: `mediaRecorderRef.current.start()` - no timeslice

3. **Applied in three locations**:
   - `startRecording()` function (line 511-515)
   - Recording interval restart logic (line 525-529)
   - `resumeRecording()` function (line 556-560)

### Technical Details

The timeslice parameter forces MediaRecorder to fire `ondataavailable` events every 10 seconds with proper duration metadata. This ensures:
- Audio blobs have valid duration property on Android
- No crashes during audio processing
- Backend can properly handle audio files
- **No impact on other platforms** (iOS, web browsers)

### Platform-Specific Behavior

- **Android**: Uses 10-second timeslice, creates more frequent chunks with proper metadata
- **iOS**: Uses original implementation (no timeslice)
- **Web browsers**: Uses original implementation (no timeslice)

This fix ensures the app remains stable on Android devices while preserving existing behavior on all other platforms.
