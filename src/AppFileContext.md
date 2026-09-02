# App.jsx Component Architecture

This document provides a comprehensive overview of `App.jsx`, the central component of the application. It serves as the primary container for all major UI components, manages global state, handles data fetching and real-time updates, and orchestrates interactions between different parts of the application.

---

## Component Breakdown

`App.jsx` acts as a parent controller, importing and managing a wide array of child components:

-   **Authentication**:
    -   `withAuthenticator`: An AWS Amplify Higher-Order Component that wraps the entire application to handle user sign-up, sign-in, and session management.
    -   `Header`: Custom header for the sign-in/sign-up UI.
-   **Core UI Layout**:
    -   `Navbar`: The top navigation bar.
    -   `TogglePanel`: The left-side panel that displays the history of notes and transcripts.
    -   `EditPanel`: The right-side panel for editing content.
    -   `Clipboard`: The central text area where generated notes, transcripts, or dragged content appears.
-   **Popups and Modals**:
    -   `Recording`: The UI for initiating a new recording session.
    -   `Dictation`: The UI for the real-time dictation feature.
    -   `ContentPopup`: A modal to display the full content of a selected note or transcript.
    -   `CreditPopup`: A modal to inform users about credit limits.
    -   `IntroTour`: A guided tour for new users using Shepherd.js.
-   **Functional & Headless Components**:
    -   `RecordingManager`: A headless component/hook that manages the entire recording, uploading, and processing lifecycle.
    -   `TextStream`: A component that handles the real-time display of text streamed from the backend.

---

## Core Functionality

`App.jsx` is responsible for the application's primary logic, state, and data flow.

### State Management

The component uses numerous `useState` hooks to manage the application's UI and data state. Key state variables include:

-   **Panel/Popup Visibility**: `showNotes`, `showEditPanel`, `showRecordingPopup`, `showDictationPopup`, `showContentPopup`. These booleans control which major UI elements are visible.
-   **History Panel State**:
    -   `isCollapsed`: A boolean that controls the visibility of the left-side History Panel. It is initialized based on screen width (`window.innerWidth <= 768`) for a mobile-first experience.
    -   `collapsedWeeks`: A `Set` that stores the timestamps of week groups that the user has manually collapsed, allowing for persistent UI preferences within a session.
-   **Data Storage**:
    -   `notes`: An array to store fetched user notes.
    -   `transcripts`: An array to store fetched user transcripts.
-   **Content Management**:
    -   `selectedItem`: Stores the full object of the currently selected note or transcript for display or editing.
    -   `clipboardContent`: The text displayed in the main clipboard area.
    -   `editContent`: The text being edited in the `EditPanel`.
    -   `streamingText`: The text currently being streamed from the backend during note generation.
-   **Loading & Status Indicators**: `isLoading`, `isDictationLoading`, `isTranscribing`, `isWebSocketConnecting`. These track asynchronous operations to provide feedback to the user.

### Authentication and User Management

Authentication is the entry point to the application's core features.

1.  **Amplify `withAuthenticator`**: The `App` component is wrapped in this HOC. It automatically renders a sign-in/sign-up UI for unauthenticated users and handles the entire authentication flow.
2.  **AuthenticatedApp**: Once a user is successfully authenticated, the `AuthenticatedApp` component is rendered. It receives two crucial props from `withAuthenticator`:
    -   `user`: An object containing the authenticated user's data, including `user.username`.
    -   `signOut`: A function to log the user out.
3.  **User-Specific Data**: The `user.username` is the primary identifier for all user-specific operations. It is passed as the `owner` variable in GraphQL queries (`listNotes`) and subscriptions (`onUpdateNotesByOwner`) to fetch and update data securely for the logged-in user.

### Data Fetching and Real-Time Subscriptions

`App.jsx` handles the initial data load and listens for real-time updates from the backend.

1.  **Initial Fetch (`useEffect`)**: On component mount, an `async` function `fetchNotes` is called.
    -   It uses `client.graphql` with the `queries.listNotes` query to fetch the 120 most recent items associated with the `user.username`.
    -   The fetched items are filtered into two separate state arrays: `notes` and `transcripts`.
    -   It initializes the `collapsedWeeks` state to ensure only the most recent week of notes/transcripts is expanded by default.
2.  **GraphQL Subscriptions**:
    -   The component subscribes to `subscriptions.onUpdateNotesByOwner`, again using the `user.username` as a filter.
    -   When a new or updated note/transcript is pushed from the backend (e.g., after a recording is processed), the `next` callback fires.
    -   The new data is prepended to the appropriate `notes` or `transcripts` array, ensuring the UI updates in real-time without needing a refresh.
    -   A `newItems` set is used to briefly highlight newly added items in the UI.
3.  **Manual Recovery Refresh**:
    -   The History Panel's **Refresh recent history** button calls the same `fetchNotes` function as the initial load, so it re-queries the latest 120 records for the authenticated owner and replaces the displayed note and transcript lists.
    -   While the request is pending, the button is disabled and announces that notes and transcripts are being fetched. If it fails, an in-panel alert asks the user to try again, in addition to the existing service-disruption banner.
    -   This is a recovery path for missed or interrupted subscription updates; normal real-time updates still arrive through `onUpdateNotesByOwner`.

### Recording and Dictation Integration

`App.jsx` initializes and integrates the `RecordingManager` and `Dictation` functionalities, acting as the controller that connects their logic to the UI.

-   **`RecordingManager`**:
    -   It's initialized as a hook: `const recordingManager = RecordingManager(...)`.
    -   `onTextStreamUpdate`: A callback function is passed to the manager. When the backend streams the final note, `RecordingManager` calls this function, which updates the `streamingText` and `clipboardContent` in `App.jsx`.
    -   `onTransitionToMainApp`: Another callback that `RecordingManager` calls when the "Preparing Transcript" phase is over, which then hides the `Recording` popup.
-   **`Dictation`**:
    -   Similar to the recorder, it's initialized as a hook: `const dictation = Dictation(...)`.
    -   It receives `onTextStreamUpdate` and `setClipboardContent` to update the main app's state with the real-time transcribed text.
    -   It also receives `user.username` to correctly associate the dictation session with the user.
    -   A `useEffect` hook syncs the internal loading states of the `Dictation` hook (`isDictationLoading`, `isTranscribing`) with the parent `App.jsx` state, allowing the UI to display global loading indicators.

### History Panel (`TogglePanel`)

The History Panel is a primary feature for user interaction, providing access to all past notes and transcripts. It is managed by the `TogglePanel` component.

-   **Purpose**: To display a chronological, organized, and interactive list of the user's generated content.
-   **Content Grouping**: The panel uses the `groupItemsByWeek` helper function to organize notes and transcripts into collapsible sections based on the week they were created. This prevents the list from becoming overwhelmingly long.
-   **Item Rendering**: Each item in the list is rendered by the `ListItem` component, which displays a concise, readable summary (`noteLabel` or the first sentence) and a formatted timestamp showing the day and time.
-   **Interactivity**:
    -   **Click to View**: Clicking a `ListItem` opens the `ContentPopup` modal, displaying the full content of the selected note or transcript.
    -   **Drag and Drop**: Users can drag a `ListItem` and drop it into the main `Clipboard` area to instantly load its content for viewing or editing.
-   **Responsive Behavior (Mobile Simplification)**:
    -   On screens with a width of 768px or less, the panel is collapsed by default (`isCollapsed` is `true`) to maximize screen real estate for the main content area.
    -   On medium-width screens (780px-1200px), logic within the `togglePanel` and `toggleEditPanel` functions ensures that the History Panel and Edit Panel are mutually exclusive, preventing UI clutter.
    -   On larger screens, both panels can be open simultaneously.

### Label Display and Editing

-   **Display logic (`src/App.jsx`)**:
    -   `ListItem` computes `content` as `item.note` or `item.transcript` (whichever applies), then sets `displayText` to `item.noteLabel || getFirstSentenceOrSubstring(content)`.
    -   `getFirstSentenceOrSubstring(text, maxLength = 89)` behavior:
        -   Returns `'Empty'` if `text` is falsy.
        -   If `text.length <= maxLength`, returns `text` as-is.
        -   Otherwise, takes `text.substring(0, maxLength)`, trims back to the last space when possible, and appends `...`.
        -   If no space exists within the substring, appends `...` directly to the cut string.
    -   Result: history items show a concise label. If no `noteLabel` exists, the first ~89 characters of the content are shown with an ellipsis (cut on word boundary when possible).

-   **Edit flow (`src/App.jsx`)**:
    -   The `ContentPopup` receives `noteLabel` and `onLabelUpdate` props. When a label is edited, it calls `onLabelUpdate(newLabel)`.
    -   `handleLabelUpdate(newLabel)` provides immediate UI feedback through local state updates:
        -   Uses a unique ID of `owner + timestamp` to find and update the matching item in both `notes` and `transcripts` arrays (only the relevant one(s) will match).
        -   Updates `selectedItem.noteLabel` to keep the popup in sync.
        -   Local changes are visible immediately for responsive user experience.

-   **GraphQL Mutation Implementation (`src/graphql/mutations.js` & `src/App.jsx`)**:
    -   **NEW**: Added dedicated `updateNoteLabel` mutation specifically for label updates (cleaner than full record updates).
    -   **PREPARATION STRATEGY**: All backend integration code is commented out to prevent app breakage:
        -   `handleLabelUpdate` function contains commented GraphQL call using `mutations.updateNoteLabel`
        -   Comments include detailed instructions for easy transition when backend is ready
        -   Local schema already includes `noteLabel: String` field (line 14 in `schema.graphql`)
    -   **TRANSITION STEPS** (when ready for backend deployment):
        1. Deploy schema: `amplify push` (adds noteLabel field to production database)
        2. Regenerate GraphQL operations: `amplify codegen` (updates mutations.js with noteLabel support)
        3. Uncomment the backend call in `handleLabelUpdate` function (single line change)
        4. Test full persistence functionality
    -   **CURRENT STATE**: UI editing works locally, changes visible but don't persist between sessions. Ready for seamless backend integration.

---

## Clipboard & SOAP Buttons

The central `Clipboard` also renders the SOAP quick-copy buttons that align with the visible headers inside the textarea.

-   **Structure**:
    -   Container `div.clipboard` is a flex row with two children:
        -   `div.soap-buttons` (fixed ~30px width) on the left
        -   `div.clipboard-content` (flex: 1) containing the `<textarea>`
    -   CSS classes defined in `src/App.css`: `.clipboard`, `.soap-buttons`, `.clipboard-content`, `.soap-button`, `.clipboard-textarea`.

-   **Positioning Logic** (`src/components/Clipboard.jsx`):
    -   The component keeps a `soapPositions` map for `S/O/A/P`.
    -   A hidden measure div mirrors the textarea’s width, font, padding, and line-height to compute pixel height up to each section header (`Subjective:`, `Objective:`, `Assessment:`, `Plan:`).
    -   Each button’s `top` is set to `measuredHeight - scrollTop + verticalOffset` and only rendered when within the visible textarea viewport.
    -   Positions update on content changes (debounced), textarea scroll, and resize via `ResizeObserver`.

-   **Copy Behavior**:
    -   Clicking a SOAP button extracts text from its header to the next header and writes it to the clipboard.
    -   A brief “copied” message is shown; buttons are disabled during dictation/connection states.

-   **Responsive & Accessibility**:
    -   Buttons are visible at all widths (prior mobile-only hide rule was removed).
    -   High-contrast letters, hover feedback, and unobtrusive fixed column ensure easy targeting.

-   **Recent Layout Simplification (spacing fix)**:
    -   Goal: keep buttons consistently left of the textarea at any width.
    -   Changes in `src/App.css`:
        -   `.clipboard-textarea` is now full-width, marginless (`width: 100%; margin: 0`), with `max-width: 100%`.
        -   `.clipboard-content` adds internal padding (`padding: 10px 10px 10px 0`) so spacing is owned by the column, not the textarea.
        -   `.soap-buttons` uses `padding-top: 10px` to align vertically with the textarea’s internal padding.
        -   Leftover media-query margins on `.clipboard-textarea` were removed to keep behavior consistent across breakpoints.

---

## Additional Features and Logic

Beyond the main component interactions, `App.jsx` also contains several other important pieces of logic.

### Keyboard Shortcuts

A `useEffect` hook is dedicated to handling global keyboard shortcuts for improved accessibility and faster navigation:

-   **`Ctrl + \`**: Toggles the visibility of the History Panel (`TogglePanel`).
-   **`Ctrl + B`**: Toggles the visibility of the `EditPanel`.

This provides a power-user-friendly way to interact with the application's main panels without using the mouse.

### Analytics and PWA Redirection

Two specialized components are included at the root of the application to handle initial loading behaviors:

-   **`RouteTracker`**: This component uses a `useEffect` hook tied to the `useLocation` hook from `react-router-dom`. On every route change, it sends a `pageview` event to Google Analytics (`ReactGA.send`) and also calls a custom `trackPageView` function for more descriptive, internal analytics.
-   **`PWARedirect`**: This component checks if the application is running in a Progressive Web App (PWA) context (e.g., installed on a home screen). If it is, and the user is on the landing page (`/`), it automatically redirects them to the main application view (`/app`) for a seamless user experience.

### Custom Authentication UI

The Amplify `withAuthenticator` HOC is configured with custom components and services to enhance the sign-up process:

-   **`components.SignUp.FormFields`**: This custom component injects a `CheckboxField` into the sign-up form. This checkbox requires users to agree to the Terms, Conditions, and Privacy Policy before they can create an account.
-   **`services.validateCustomSignUp`**: This asynchronous function is hooked into the sign-up flow. It checks if the `acknowledgement` checkbox was checked. If not, it throws an error, preventing the user from completing the sign-up process and ensuring legal compliance.
