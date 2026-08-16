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
- `recordingTelemetrySchema.js` and `recordingTelemetryClient.js` own the PHI-safe event contract and authenticated nonblocking delivery.
- `recordingTelemetryContext.js`, `recordingSignalHealth.js`, and `recordingBackendContract.js` own privacy-safe context/signal aggregation and correlated backend request/status shapes.

The manager owns shared refs and high-level UI state, including `isRecording`, `isPaused`, `isPreparingTranscript`, and `isGeneratingSummary`. Its public methods are `startRecording`, `stopRecording`, `pauseRecording`, `resumeRecording`, and `discardRecording`.

### Recording Lifecycle

1. `startRecording()` creates one cryptographically random `recordingJobId`, emits the capture request, requests microphone access, and starts `MediaRecorder`.
2. Applied safe track settings, a per-job device hash, and aggregate RMS/peak/signal duration are recorded without retaining audio or raw device ids.
3. Audio blobs are passed to the ordered upload queue with the job id, MIME type, byte count, and chunk order.
4. S3 metadata and every SQS body carry the job id/schema; the final queue acknowledgement starts transcript waiting.
5. `useNoteGeneration` prefers a matching job-id status record and uses timestamp only as a one-time legacy-schema fallback.
6. The note-generation Lambda request carries the same id and streams text through `onTextStreamUpdate`.
7. Stop, discard, errors, and unmount emit one terminal outcome and clean up tracks, queues, timers, subscriptions, abort controllers, and telemetry delivery.

The first-party telemetry client uses a strict `1.0` allowlist and authenticated AppSync create mutations. It batches briefly in memory, retries with fixed bounds, flushes on reconnect/terminal/page hide, and never blocks recording. Payloads with audio/binary data, transcript/note content, credentials/tokens, names/email, direct patient/user/device ids, or sensitive string patterns are rejected before enqueue.

The AppSync model and 30-day TTL are source definitions until an authorized backend release. External transcription and note Lambdas still need to preserve the id and emit provider/retry/no-speech/quarantine/deletion/notification outcomes. The full support runbook and release gates are in [`knowledge/operations/recording-telemetry.md`](../../../knowledge/operations/recording-telemetry.md).

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

On Windows, the current Jest configuration may require `--testMatch='**/*.test.js'` because the configured absolute glob mixes path separators. The suite covers dictation insertion plus recording media, upload cancellation/order, telemetry privacy/schema/delivery/signal behavior, and backend correlation contracts.

## Maintenance Notes

- Keep `RecordingManager.jsx` orchestration-only.
- Keep conversation recording and realtime dictation lifecycle state separate.
- Preserve the immutable dictation snapshot model when changing cursor behavior.
- Keep the Clipboard and Sidebar folder README files aligned with textarea behavior.
- Coordinate changes to backend constants with the corresponding AWS resources.
- Keep `recordingJobId` authoritative across S3, SQS, AppSync status, generation, retry, and terminal events; timestamp matching is migration-only.
- Keep telemetry allowlisted, content-free, bounded, authenticated, and independent of recording progress.
- Never leave microphone tracks, WebSockets, subscriptions, timers, or abort controllers active after cleanup.
