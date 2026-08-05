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
- `recordingMedia.test.js`, `useAudioUploadQueue.test.js`, and `useMediaRecorderController.test.js` cover media formats, cancellation, SQS failure, emitted-chunk ordering, and teardown behavior.
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

The recorder creates timestamp/path refs plus an immutable recording session id, records audio, and queues each blob with its actual media type. The upload queue writes each blob to Amplify Storage and notifies SQS. The final audio chunk triggers transcript waiting:

```js
onFinalAudioQueued: (userId, timestamp) => {
  setIsTranscriptCompleted(false);
  subscribeToNoteCompletion(userId, timestamp);
}
```

Once transcript completion is observed, note generation streams text from `NOTE_GENERATION_URL` and forwards partial text through `onTextStreamUpdate`.

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
- Always clean up media tracks, intervals, subscriptions, and abort controllers when changing this folder.
- `CreditLimit.jsx` sends online users to `/app/billing`; keep that destination aligned with the authenticated billing route and legacy `/account` redirect.
