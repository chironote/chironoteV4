# Recording Components

This folder owns the core recording, dictation, audio upload, transcript waiting, and generated-note streaming workflow.

## Files

- `RecordingManager.jsx` is the public hook-style orchestration API consumed by `AuthenticatedApp`.
- `useMediaRecorderController.js` owns microphone access, `MediaRecorder`, chunking, pause/resume, discard, and cleanup.
- `useAudioUploadQueue.js` owns session-scoped ordered S3 upload and SQS dispatch, including cancellation and fatal submission errors.
- `useNoteGeneration.js` waits for transcript completion and streams generated note text from Lambda.
- `Recording.jsx` renders the new-note popup, recording settings, language/options persistence, and active recording controls.
- `Dictation.jsx` owns AssemblyAI realtime dictation into clipboard/editor text.
- `DictationPopup.jsx`, `ConfirmationPopup.jsx`, `CreditLimit.jsx`, and `TextStream.jsx` are support UI.
- `recordingConstants.js`, `recordingAuth.js`, `recordingMedia.js`, and `noteGenerationErrors.js` hold shared constants, auth, media metadata, and error helpers.
- `recordingTelemetrySchema.js` defines the versioned event vocabulary, field allowlist, recursive privacy rejection, safe codes, retention, and cryptographic ids.
- `recordingTelemetryClient.js` owns authenticated AppSync batching, bounded buffering, retry/cooldown, reconnect, and keepalive delivery.
- `recordingTelemetryContext.js` and `recordingSignalHealth.js` produce privacy-safe build/device/track context and aggregate signal health without retaining audio.
- `recordingBackendContract.js` centralizes the correlated SQS, note-generation, and AppSync status shapes plus the legacy timestamp migration rule.
- Adjacent tests cover media formats, cancellation, SQS failure, emitted-chunk ordering, teardown, telemetry privacy/schema/delivery/signal behavior, and backend correlation contracts.
- `DictationBackup.jsx`, `Context.md`, and `Dictation.md` are older/reference files.

## Recording Flow

`RecordingManager` composes three focused hooks:

```js
const {
  subscribeToNoteCompletion,
  resetNoteGenerationState,
  cleanupNoteGeneration
} = useNoteGeneration({ timeStampRef, isDiscardingRef, noSleepRef });

const { queueUpload, startUploadSession, cancelUploadSession } = useAudioUploadQueue({
  filePathRef,
  onFinalAudioQueued,
  onUploadError
});
```

The recorder creates timestamp/path refs plus one cryptographically random `recordingJobId`, records aggregate-only signal health, and queues each blob with its actual media type and order. The upload queue carries the job id/schema/order and originating app/platform/browser through S3 metadata and SQS. The final SQS acknowledgement triggers transcript waiting:

```js
onFinalAudioQueued: (userId, timestamp, recordingJobId) => {
  setIsTranscriptCompleted(false);
  subscribeToNoteCompletion(userId, timestamp, recordingJobId);
}
```

Job-id AppSync correlation is authoritative. The subscription falls back once to legacy timestamp matching only when the deployed schema lacks the new status fields, and never accepts a mismatched job id. Once transcript completion or an explicit no-speech/fallback outcome is observed, note generation carries the id to `NOTE_GENERATION_URL` and forwards partial text through `onTextStreamUpdate`.

Every stage emits a versioned, allowlisted, PHI-safe event through an authenticated first-party client. Events are buffered and retried without awaiting telemetry in the recording path. Raw audio, transcript/note text, tokens/credentials, names/email, direct patient/user/device identifiers, S3 paths, and raw error messages are rejected or excluded. See [`knowledge/operations/recording-telemetry.md`](../../../knowledge/operations/recording-telemetry.md) for the dictionary, support query, access/retention model, and external backend/release gates.

Discard, fatal upload failure, and unmount invalidate the recording session. Invalidating a session cancels the active Amplify upload, aborts an active SQS request, clears queued chunks, and prevents late callbacks from starting transcript or note work. An upload or SQS failure stops the recorder and returns the user to the main app with a retryable error instead of leaving the preparation UI active.

MediaRecorder data events are serialized before asynchronous user lookup, path numbering, and upload queue insertion. This prevents a final event from overtaking a preceding regular chunk.

## MediaRecorder Details

`useMediaRecorderController` is browser-sensitive:

```js
if (/iphone|ipad/i.test(uaString)) {
  options = { mimeType: 'video/mp4' };
} else if (/firefox/i.test(uaString)) {
  options = { mimeType: 'audio/webm' };
} else if (MediaRecorder.isTypeSupported('audio/webm; codecs="pcm"')) {
  options = { mimeType: 'audio/webm; codecs="pcm"' };
}
```

Chunks smaller than `MIN_AUDIO_BLOB_SIZE` are skipped as likely header-only blobs.

`recordingMedia.js` derives matching upload metadata from the emitted blob or recorder MIME type. Safari MP4 recordings therefore use an `.mp4` object name and the emitted MP4 MIME type; WebM, Ogg, and WAV use corresponding names and content types.

## Dictation Flow

`Dictation.jsx` uses AssemblyAI `StreamingTranscriber`, an `AudioWorkletProcessor`, 16 kHz mono audio, and a token fetched from Lambda. It is instantiated twice by `AuthenticatedApp`: once for the clipboard and once for the smart editor. The controller streams transcript updates through optional insertion callbacks so parent components can insert dictation at the captured cursor/selection without clearing the existing text.

## Maintenance Notes

- Keep `RecordingManager.jsx` orchestration-only; implementation belongs in the focused hooks.
- Be careful with Safari: `Recording.jsx` starts recording before async subscription checks because `getUserMedia()` must happen inside the user gesture.
- A failed or ineligible post-start subscription check must call `discardRecording()`, not `stopRecording()`, so it cannot create a final upload.
- `recordingConstants.js` contains backend URLs, queue URL, timeouts, and retry text. Update dependent backend code together.
- Keep every queued upload tied to its recording session; check session identity after every asynchronous authentication, upload, and SQS boundary.
- Teardown must cancel a session. Only an explicit user stop may create a final audio chunk.
- Never log Cognito access tokens or temporary AWS credentials.
- Never log recording object paths, note settings, subscription payloads, or raw error objects; emit only allowlisted safe codes and request ids.
- Preserve `recordingJobId` across every request/retry/status boundary. Timestamp correlation is migration-only.
- Extend the telemetry allowlist, GraphQL model, tests, and event dictionary together; do not add arbitrary payload fields.
- Keep telemetry delivery bounded and nonblocking. It must never delay capture, upload, or generation.
- Always clean up media tracks, intervals, subscriptions, and abort controllers when changing this folder.
- `CreditLimit.jsx` sends online users to `/app/billing`; keep that destination aligned with the authenticated billing route and legacy `/account` redirect.
