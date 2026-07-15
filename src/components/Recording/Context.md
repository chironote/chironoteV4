# Recording and Dictation Context

## Overview

This folder owns two independent microphone workflows:

1. Conversation recording captures audio chunks, uploads them, waits for a backend transcript, and streams a generated clinical note.
2. Realtime dictation streams microphone audio directly to AssemblyAI and inserts the evolving transcript into the Clipboard or Smart Editor.

`RecordingManager.jsx` and `Dictation.jsx` expose hook-style controller APIs. They are instantiated by `AppShell/AuthenticatedApp.jsx`; the rendered controls live in `Recording.jsx`, `ClipboardButtons.jsx`, and `Sidebar/EditPanel.jsx`.

## Conversation Recording Architecture

`RecordingManager.jsx` is orchestration only. It composes three focused hooks:

- `useMediaRecorderController.js` owns microphone access, `MediaRecorder`, pause/resume, chunk creation, discard, and media cleanup.
- `useAudioUploadQueue.js` uploads chunks to Amplify Storage in order and sends SQS notifications.
- `useNoteGeneration.js` waits for transcript completion over GraphQL and streams the generated note from Lambda.

The manager owns shared refs and high-level UI state, including `isRecording`, `isPaused`, `isPreparingTranscript`, and `isGeneratingSummary`. Its public methods are `startRecording`, `stopRecording`, `pauseRecording`, `resumeRecording`, and `discardRecording`.

### Recording Lifecycle

1. `startRecording()` requests microphone access and starts `MediaRecorder`.
2. Audio blobs are passed to the ordered upload queue.
3. Each successful upload is announced to SQS; the final chunk starts transcript waiting.
4. `useNoteGeneration` listens for the matching completed note record.
5. The note-generation Lambda streams text through `onTextStreamUpdate`.
6. Stop, discard, errors, and unmount all clean up tracks, queues, timers, subscriptions, and abort controllers.

Backend URLs, queue configuration, timeouts, and retry messages live in `recordingConstants.js`. Authentication helpers live in `recordingAuth.js`, and user-facing error normalization lives in `noteGenerationErrors.js`.

## Realtime Dictation Architecture

`Dictation.jsx` does not reuse the conversation recording/upload pipeline. It uses:

- AssemblyAI `StreamingTranscriber`
- an `AudioWorkletProcessor`
- 16 kHz mono PCM audio
- a short-lived token fetched from Lambda
- its own subscription-hour accounting

`AuthenticatedApp` creates two controller instances: one targets the Clipboard and one targets the Smart Editor. Each instance reports full revised transcript text through `onDictationTextUpdate`.

### Cursor-Safe Text Insertion

When dictation starts, `AuthenticatedApp` captures the target textarea selection with `createDictationInsertion()` from `src/utils/dictationInsertion.js`. The snapshot stores immutable text before and after the selected range.

Every partial transcript is applied with `applyDictationText()`:

```js
const update = applyDictationText(insertionSnapshot, dictatedText);
setText(update.text);
```

Rebuilding from the original snapshot ensures revised AssemblyAI turns replace only the live dictated segment. Text after the cursor is preserved, selected text is intentionally replaced, and repeated phrases elsewhere in the note cannot attract the insertion range.

Do not mutate insertion refs inside React state updater callbacks. React Strict Mode may invoke updater callbacks twice in development, which previously caused text following the cursor to be consumed on the second invocation.

### Live Insertion Caret

While transcription is active, Clipboard and Smart Editor textareas receive the `dictation-caret` class and are programmatically focused at the end of the live dictated segment. `App.css` renders the native caret in green. The fields remain technically focusable so browsers paint the caret, but their change handlers reject manual edits during dictation. The green caret class is removed immediately when transcription stops.

## Validation

Run:

```powershell
npm test -- --watchAll=false
npm run build
```

`src/utils/dictationInsertion.test.js` covers middle insertion, growing partial transcripts, duplicate phrases, intentional selection replacement, and end-of-text fallback.

## Maintenance Notes

- Keep `RecordingManager.jsx` orchestration-only.
- Keep conversation recording and realtime dictation lifecycle state separate.
- Preserve the immutable dictation snapshot model when changing cursor behavior.
- Keep the Clipboard and Sidebar folder README files aligned with textarea behavior.
- Coordinate changes to backend constants with the corresponding AWS resources.
- Never leave microphone tracks, WebSockets, subscriptions, timers, or abort controllers active after cleanup.
