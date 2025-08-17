# RecordingManager Component Context

## 1. Overview

The `RecordingManager.jsx` file exports the `useRecordingManager` custom hook. This hook acts as a **headless component**, encapsulating all the complex state and logic for the entire audio recording lifecycle. It is the single source of truth for recording state within the application, providing state flags and control functions to any UI component that uses it (e.g., the `Recording` popup).

## 2. Core Functionality & API

The hook manages the recording flow and exposes a simple API to control it.

### State Management

The hook returns the following state variables:

-   `isRecording` (boolean): `true` when the microphone is actively recording.
-   `isPaused` (boolean): `true` when the recording is paused.
-   `isPreparingTranscript` (boolean): `true` after recording stops but before the transcript is ready.
-   `isError` (boolean): `true` if an error occurs (e.g., no microphone access).
-   `error` (object | null): The error object if one occurs.
-   `recordingTime` (number): The elapsed recording time in seconds.

### Control Functions

The hook returns the following functions to manipulate the recording state:

-   `startRecording()`: Initiates the recording process.
-   `stopRecording(onStopCallback)`: Stops the recording, finalizes the audio blob, and invokes the `onStopCallback` with the blob.
-   `pauseRecording()`: Pauses the current recording session.
-   `resumeRecording()`: Resumes a paused recording.
-   `discardRecording()`: Cancels the recording and cleans up all resources.

## 3. External Dependencies

To function correctly, the hook relies on several external libraries and browser APIs. When testing, **these must be mocked** to isolate the hook's logic.

-   **`recordrtc`**: The core library used to capture and process audio from the microphone.
-   **`nosleep.js`**: A utility to prevent the device's screen from turning off during an active recording, which is critical for long sessions.
-   **`navigator.mediaDevices.getUserMedia`**: The standard browser API for requesting microphone permissions and accessing the audio stream.

## 4. Testing Strategy

Testing this hook requires a specific approach due to its nature as a headless component and its external dependencies.

1.  **Use `renderHook`**: The hook should be tested in isolation using the `renderHook` utility from `@testing-library/react`.
2.  **Mock All Dependencies**: Use `jest.mock()` to create mock implementations for `recordrtc`, `nosleep.js`, and `navigator.mediaDevices`. This allows you to control their behavior and assert that they are called correctly.
3.  **Test State Transitions**: For each control function (e.g., `startRecording`), use `act()` to wrap the function call and then assert that the hook's state variables (`isRecording`, `isPaused`, etc.) have been updated as expected.
4.  **Verify Side Effects**: Assert that the methods on your mocked dependencies are called. For example, after calling `startRecording`, check that `RecordRTC.startRecording` and `NoSleep.enable` were called.

This document provides a detailed explanation of the recording feature in the application, which is primarily controlled by the components within `src/components/Recording/`. The core logic resides in `RecordingManager.jsx`, which operates as a headless component, while `Recording.jsx` provides the user interface.

---

## Component Breakdown

-   **`RecordingManager.jsx`**: The engine of the recording feature. It handles audio capture, chunking, uploading to AWS S3, notifying the backend via SQS, listening for transcription completion via GraphQL subscriptions, and streaming the final note from a Lambda function.
-   **`Recording.jsx`**: The user-facing UI component. It displays the recording controls (start, stop, pause), settings (language, note layout), and status indicators (e.g., "Preparing Transcript", "Generating Note"). It receives its state and core functions as props from a parent component that utilizes `RecordingManager`.
-   **`Dictation.jsx`**: While not the primary focus, this component integrates with the recording manager to provide dictation functionality, likely reusing parts of the same audio processing pipeline.

---

## Core Functionality (`RecordingManager.jsx`)

This component manages the entire lifecycle of a recording, from initiation to final note generation.

### State Management

The component's behavior is driven by several key state variables:
-   `isRecording`: `true` when the microphone is actively capturing audio.
-   `isPaused`: `true` when the recording is temporarily paused.
-   `isPreparingTranscript`: `true` after recording stops, while the backend processes the audio into a transcript.
-   `isGeneratingSummary`: `true` after the transcript is ready, while the backend generates the structured note.
-   `isTranscriptCompleted`: `true` when the GraphQL subscription receives confirmation that the transcript is ready.

### The Recording Lifecycle

The process follows a specific sequence of events:

1.  **Initialization (`setupRecorder`)**: When a recording is initiated, this function requests microphone access using `navigator.mediaDevices.getUserMedia`. It creates a `MediaRecorder` instance to handle audio capture.

2.  **Starting (`startRecording`)**: 
    -   Sets `isRecording` to `true`.
    -   Activates `NoSleep.js` via `noSleepRef.current.enable()` to prevent the device screen from turning off.
    -   Generates a unique `timeStampRef.current` which serves as the identifier for the entire conversation.
    -   Starts the `mediaRecorder`, which begins capturing audio.

3.  **Audio Chunking & Uploading (`mediaRecorder.ondataavailable`)**:
    -   The `MediaRecorder` is configured to emit audio data every few seconds. This `ondataavailable` event handler captures the audio as a `Blob`.
    -   Each blob is added to an `uploadQueueRef` array.
    -   The `processUploadQueue` function is called, which works through the queue sequentially to prevent race conditions.

4.  **S3 Upload & SQS Notification (`uploadS3`)**:
    -   For each audio chunk in the queue, `uploadS3` performs two critical actions:
        1.  **Upload to S3**: It uploads the audio blob to an S3 bucket using `uploadData` from Amplify Storage. The file path is unique for each chunk.
        2.  **Notify SQS**: It sends a message to the `AudioTranscriptionQueue.fifo` SQS queue. This message, created with `SendMessageCommand`, includes the `userId`, the conversation `timestamp`, the `path` to the audio file in S3, and a flag `isFinalAudio` to indicate if it's the last chunk. This message triggers the backend transcription service.

5.  **Stopping (`stopRecording`)**:
    -   When the user clicks "Stop", this function is called.
    -   It stops the `mediaRecorder`, which triggers one final `ondataavailable` event for the remaining audio.
    -   The state is updated to `setIsPreparingTranscript(true)`, changing the UI to a loading state.
    -   Crucially, it ensures the final audio chunk is marked with `_final_` in its filename, signaling to the backend that the recording session is complete.

6.  **Discarding (`discardRecording`)**:
    -   If the user cancels, this function immediately stops the recorder, clears the `uploadQueueRef`, and resets all state variables. It sets a flag `isDiscardingRef.current` to prevent any in-flight processing from continuing. It also disables `NoSleep.js` and unsubscribes from any active GraphQL subscriptions.

### Backend Processing & Note Generation

After the final audio chunk is uploaded, the frontend waits for the backend to complete its tasks.

1.  **Waiting for Transcript (`subscribeToNoteCompletion`)**:
    -   Once the final chunk is sent, the frontend subscribes to a GraphQL mutation, `onUpdateNotesByOwner`.
    -   It waits for a message where the note's `timestamp` matches the current conversation's `timeStampRef` and the `isCompleted` flag is `true`.
    -   An **80-second timeout** is implemented as a fallback. If no message is received within this time, the frontend proceeds to the next step anyway to avoid getting stuck.

2.  **Streaming the Summary (`streamResponse`)**:
    -   Once the transcript is confirmed to be ready, this function makes a `POST` request to a specific Lambda URL (`https://xx3olxpcoay5sicmny45g7c5ay0ugvtm.lambda-url.us-east-2.on.aws`).
    -   This request includes the `userId`, `timeStamp`, and any `noteSettings` from `localStorage`.
    -   The Lambda function generates the final, structured note and **streams** the response back.
    -   The frontend reads the stream chunk by chunk, passing the incoming text to the main app via the `onTextStreamUpdate` prop, which displays the note being written in real-time.
    -   `NoSleep.js` is disabled in the `finally` block of this function.

### Timeouts

There are two safety timeouts to prevent the UI from hanging:

1.  **Transcript Wait Fallback (80s)**
    -   Implemented in `subscribeToNoteCompletion(userId, timestamp)`.
    -   If the AppSync subscription does not receive a matching `isCompleted: true` update within 80 seconds, the client:
        -   Unsubscribes from the subscription
        -   Sets an internal flag to proceed
        -   Calls `streamResponse()` to begin note generation
    -   Logging: Console logs indicate the fallback was triggered.

2.  **Generating Note Safety Timeout (4 minutes)**
    -   Implemented in `streamResponse()`.
    -   Purpose: Ensure the "Generating Note" spinner cannot hang indefinitely if the streaming endpoint is slow or fails before the first chunk arrives.
    -   Behavior if no stream chunk arrives within 4 minutes:
        -   Hides the "Generating Note" state (`isGeneratingSummary = false`)
        -   Ensures `isPreparingTranscript = false`
        -   Invokes the parent callback `onTransitionToMainApp()` so the user returns to the main screen
        -   Disables `NoSleep` as part of cleanup
    -   When the first stream chunk arrives, this 4-minute timer is cleared immediately to avoid interfering with normal flow.

Parent contract and parameters:

-   `streamResponse()` posts to the note-generation Lambda with:
    -   `userId` (from Cognito)
    -   `timeStamp` (conversation ID)
    -   `accessToken` (Amplify session token)
    -   `noteSettings` (from `localStorage`)
-   It uses two callbacks provided by the parent of `RecordingManager`:
    -   `onTextStreamUpdate(text: string)`: Receives streamed note text
    -   `onTransitionToMainApp()`: Closes the recording popup to reveal live streaming in the main UI

---

## UI Component (`Recording.jsx`)

`Recording.jsx` is responsible for the user's interaction with the recording feature.

-   **Props**: It accepts functions like `startRecording`, `stopRecording`, `pauseRecording`, `resumeRecording`, and `discardRecording`, along with state variables like `isRecording`, `isPaused`, etc., from its parent.

-   **User Flow & State-based Rendering**: The component renders different views based on the state props:
    -   If `!isRecording`, it shows the initial **Recording Settings** screen, allowing the user to select a language and note layout (`examLayout`, `PILayout`).
    -   If `isRecording`, it displays an active recording interface with a sound wave animation and buttons for "Stop" and "Pause"/"Resume".
    -   If `isPreparingTranscript` or `isGeneratingSummary`, it shows a loading spinner with the corresponding message.

-   **Settings Persistence**: The language and note layout settings chosen by the user are saved to `localStorage` using `useEffect` hooks, so they persist across sessions.
