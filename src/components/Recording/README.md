# Recording Components

This folder owns the core recording, dictation, audio upload, transcript waiting, and generated-note streaming workflow.

## Files

- `RecordingManager.jsx` is the public hook-style orchestration API consumed by `AuthenticatedApp`.
- `useMediaRecorderController.js` owns microphone access, `MediaRecorder`, chunking, pause/resume, discard, and cleanup.
- `useAudioUploadQueue.js` owns ordered S3 upload and SQS dispatch for audio chunks.
- `recordingLifecycle.js` holds the pure platform and event-classification decisions used by the recorder.
- `useNoteGeneration.js` waits for transcript completion and streams generated note text from Lambda.
- `Recording.jsx` renders the new-note popup, recording settings, language/options persistence, and active recording controls.
- `Dictation.jsx` owns AssemblyAI realtime dictation into clipboard/editor text.
- `DictationPopup.jsx`, `ConfirmationPopup.jsx`, `CreditLimit.jsx`, and `TextStream.jsx` are support UI.
- `recordingConstants.js`, `recordingAuth.js`, and `noteGenerationErrors.js` hold shared constants/auth/error helpers.
- `DictationBackup.jsx`, `Context.md`, and `Dictation.md` are older/reference files.

## Recording Flow

`RecordingManager` composes three focused hooks:

```js
const {
  subscribeToNoteCompletion,
  resetNoteGenerationState,
  cleanupNoteGeneration
} = useNoteGeneration({ timeStampRef, isDiscardingRef, noSleepRef });

const { queueUpload, clearUploadQueue } = useAudioUploadQueue({
  timeStampRef,
  filePathRef,
  onFinalAudioQueued
});
```

The recorder creates timestamp/path refs, records audio, and queues each blob. The upload queue writes each blob to Amplify Storage and notifies SQS. The final audio chunk triggers transcript waiting:

```js
onFinalAudioQueued: (userId, timestamp) => {
  setIsTranscriptCompleted(false);
  subscribeToNoteCompletion(userId, timestamp);
}
```

Once transcript completion is observed, note generation streams text from `NOTE_GENERATION_URL` and forwards partial text through `onTextStreamUpdate`.

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

Regular chunks smaller than `MIN_AUDIO_BLOB_SIZE` are skipped as likely header-only blobs. A non-empty intentional final-stop event is still queued so the backend can finalize from already accepted audio even when the final marker itself contains no speech frames.

## Capacitor Lifecycle

Android uses the four-minute stop/restart interval for periodic chunking and calls `MediaRecorder.start()` without a timeslice. Each uploaded blob is therefore finalized as its own WebM container instead of being a dependent fragment of one long container. Android Pause likewise ends and flushes the current container as a regular chunk, and Resume starts a fresh container. The native app-state bridge suspends timed rotation in the background, rotates once on foreground, and then resumes the interval.

Audio-event state is snapshotted synchronously and processed serially, so asynchronous authentication cannot reorder or relabel the final event. Upload selection always drains every pending regular chunk before the final chunk. Object names carry the `rc2` recording-protocol marker, and SQS messages include stable `recordingJobId`, `chunkId`, and `chunkOrder` values derived from that name for backend idempotency and diagnosis.

The app-state bridge remains centralized in `src/services/nativePlatform.js`; Android runtime microphone permission is bridged by `android/app/src/main/java/com/chironote/app/MainActivity.java`.

This preserves the established WebView implementation and does not add a native foreground recording service.

## Dictation Flow

`Dictation.jsx` uses AssemblyAI `StreamingTranscriber`, an `AudioWorkletProcessor`, 16 kHz mono audio, and a token fetched from Lambda. It is instantiated twice by `AuthenticatedApp`: once for the clipboard and once for the smart editor. The controller streams transcript updates through optional insertion callbacks so parent components can insert dictation at the captured cursor/selection without clearing the existing text.

## Maintenance Notes

- Keep `RecordingManager.jsx` orchestration-only; implementation belongs in the focused hooks.
- Be careful with Safari: `Recording.jsx` starts recording before async subscription checks because `getUserMedia()` must happen inside the user gesture.
- `recordingConstants.js` contains backend URLs, queue URL, timeouts, and retry text. Update dependent backend code together.
- Always clean up media tracks, intervals, subscriptions, and abort controllers when changing this folder. Unmount cleanup is discard-like and must not publish a final chunk.
- Regression-check background/foreground transitions on an installed Android build whenever recorder lifecycle code changes.
- Before an Android release, verify the bundled JavaScript contains `recordingLifecycle` and `getAudioObjectIdentity`; a version bump or UI-only convergence build must not silently reintroduce the older recorder.
