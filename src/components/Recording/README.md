# Recording Components

This folder owns the core recording, dictation, audio upload, transcript waiting, and generated-note streaming workflow.

## Files

- `RecordingManager.jsx` is the public hook-style orchestration API consumed by `AuthenticatedApp`.
- `useMediaRecorderController.js` owns microphone access, `MediaRecorder`, chunking, pause/resume, discard, and cleanup.
- `useAudioUploadQueue.js` owns ordered S3 upload and SQS dispatch for audio chunks.
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

Chunks smaller than `MIN_AUDIO_BLOB_SIZE` are skipped as likely header-only blobs.

## Dictation Flow

`Dictation.jsx` uses AssemblyAI `StreamingTranscriber`, an `AudioWorkletProcessor`, 16 kHz mono audio, and a token fetched from Lambda. It is instantiated twice by `AuthenticatedApp`: once for the clipboard and once for the smart editor. The controller streams transcript updates through optional insertion callbacks so parent components can insert dictation at the captured cursor/selection without clearing the existing text.

## Maintenance Notes

- Keep `RecordingManager.jsx` orchestration-only; implementation belongs in the focused hooks.
- Be careful with Safari: `Recording.jsx` starts recording before async subscription checks because `getUserMedia()` must happen inside the user gesture.
- `recordingConstants.js` contains backend URLs, queue URL, timeouts, and retry text. Update dependent backend code together.
- Always clean up media tracks, intervals, subscriptions, and abort controllers when changing this folder.
