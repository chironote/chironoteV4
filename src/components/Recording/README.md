# Recording Components

Exam Layout stays visible for new and unassigned patients. New patients force a checked, disabled, gray control and retain initialExam metadata; unassigned patients can edit the checkbox without creating initial-exam linkage. Existing patients retain follow-up/Re-Exam. The nonclinical `manualExamLayout` localStorage key preserves manual preference across patient changes and popup reopening, falling back to previous `noteSettings.examLayout` on first use. Forced patient settings never overwrite that preference. Effective noteSettings are written synchronously before startRecording freezes separate settings/visit snapshots; PI remains independent. Capture-disabled builds retain the legacy options and ignore the separate preference.

With capture enabled, Start Recording with a typed, unselected name reuses the picker's paginated duplicate check and opens Create new patient? The highlighted panel contains only the name. Closing retains the draft; Create patient & record starts synchronously with prepared initial-exam metadata before subscription checks. Record without a patient clears identity, display name, injury date and visit type while preserving the earlier Exam Layout and PI choices without initial-exam linkage. Duplicate/failing/stale lookups cannot start capture. Existing selections, blank input and flag-off capture remain direct. Confirmation spacing and green primary styling are scoped; Android ID compatibility, cancellable microphone acquisition and native lifecycle remain intact.

Capture now collapses a selected patient to their name and × reset. Existing selections default to follow-up with a Re-Exam option; a new name uses initial exam, and capture automatically includes saved history. `RecordingManager` forwards durable saved-note and generation-state callbacks to the shared clipboard. This port preserves Android's microphone-start cancellation, four-minute finalized containers, pause-flush/resume-new-container, foreground rotation and serialized uploads. Generation cleanup releases the clipboard busy state without accepting preview text as saved.

This folder owns the core recording, dictation, audio upload, transcript waiting, and generated-note streaming workflow.

## Files

- `RecordingManager.jsx` is the public hook-style orchestration API consumed by `AuthenticatedApp`.
- `useMediaRecorderController.js` owns microphone access, `MediaRecorder`, chunking, pause/resume, discard, and cleanup.
- `useAudioUploadQueue.js` owns ordered S3 upload and SQS dispatch for audio chunks.
- `recordingLifecycle.js` holds the pure platform and event-classification decisions used by the recorder.
- `useNoteGeneration.js` waits for transcript completion and streams generated note text from Lambda.
- `Recording.jsx` renders the new-note popup, recording settings, patient selection and recording options, and active recording controls.
- `Dictation.jsx` owns AssemblyAI realtime dictation into clipboard/editor text.
- `DictationPopup.jsx`, `ConfirmationPopup.jsx`, `CreditLimit.jsx`, and `TextStream.jsx` are support UI.
- `recordingConstants.js`, `recordingAuth.js`, and `noteGenerationErrors.js` hold shared constants/auth/error helpers.
- `DictationBackup.jsx`, `Context.md`, and `Dictation.md` are older/reference files.

## Recording Flow

### Connection recovery while the app stays open

Finalized Blobs remain in the in-memory queue through missing credentials, transient refresh/network/service errors and network changes. Items move through upload-pending, dispatch-pending and acknowledged stages; only both acknowledgements release their audio. S3 acknowledgement permanently advances the item to dispatch-only retries, including ambiguous SQS responses beyond FIFO dedup's window. Every attempt preserves the original bytes, path, timestamp, rc2 job/chunk/order, noteSettings and visitMetadata. Current credentials/token are obtained after upload immediately before dispatch and checked against the original owner; tokens are never retained or logged.

One worker waits for each SDK attempt (including cancellation) to settle. Retries use exponential full jitter (initial ceiling 1 second, maximum 60 seconds). The upload watchdog cancels after 120 seconds without advancing byte progress, not after 120 seconds total; the small SQS request has a 60-second abort limit and one SDK attempt. Persistent authorization/validation errors retain a visibly blocked item for explicit Retry audio; repeated token rejection blocks after three attempts. Online events only wake the scheduler; timed retries work without them. Retry never discards audio. Ordering is regular-before-final within each recording; newer appointments cannot starve an earlier ready final.

Continue in background releases the transcript/generation overlay so the next appointment can record. Each recorder session owns its data-event chain, chunk counter and discard marker; each completed submission owns its original transcript subscription, timeout, generation abort controller and immutable capture. Capture timestamps are allocated once with a monotonic uniqueness guard, including same-tick starts or a backward clock. Delayed final data/onstop events stay with their session while the next capture can start. Starting B does not cancel A; discarding B removes only B. A's ordinary generation and saved-note acknowledgement still run, but its text, saved-note selection, popup and keep-awake callbacks cannot affect B. Background completion points to Recent Notes rather than selecting over the current clipboard. The existing transcript wait/fallback and note-generation timeout policy is unchanged; submission acknowledgement is not proof that all server chunks have transcribed.

This is memory-only recovery, with no restart/process-death persistence and no backend changes. Sign-out/unmount disposes pending work. Physical Android slow Wi-Fi, handoff, reconnect, background/foreground and next-appointment checks remain release gates. Mock tests cover transport/session behavior; they do not verify deployed duplicate/billing guards.

The awaited start result carries a session-bound discard action. The UI's delayed subscription-hours check cancels only the appointment it started, including its pending audio/generation, and cannot discard a newer appointment or display its credit popup. The eligibility policy itself is unchanged.

Amplify Storage 6.7.11 has a multipart cancellation race before its internal configuration await completes. `scripts/patch-amplify-upload-cancel.cjs` adds a permanent cancelled-task fence to the installed ESM and CJS handlers and skips remote cleanup before an upload ID exists. `postinstall`, `pretest` and `prebuild` apply/verify this idempotent patch against the exact version and upstream file hashes; unknown dependency changes fail closed for review. This preserves Amplify's signing, progress, multipart/container bytes and key semantics without introducing another upload transport. `amplifyUploadCancel.test.js` executes both installed runtime factories with mocked services to cover cancellation before configuration resolves and during later setup, plus normal initialization and patch drift detection. The queue does not use SDK pause/resume; this patch addresses cancellation only.

`RecordingManager` composes three focused hooks:

```js
const {
  subscribeToNoteCompletion,
  resetNoteGenerationState,
  cleanupNoteGeneration
} = useNoteGeneration({ isForeground, noSleepRef, ...callbacks });

const { queueUpload, clearUploadQueue } = useAudioUploadQueue({
  onFinalAudioQueued
});
```

The recorder creates timestamp/path refs, records audio, and queues each blob. The upload queue writes each blob to Amplify Storage and notifies SQS. The final audio chunk triggers transcript waiting:

```js
onFinalAudioQueued: (userId, timestamp, capture) => {
  subscribeToNoteCompletion(userId, timestamp, capture);
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

Audio-event state is snapshotted synchronously and processed serially within its recorder session, so starting another appointment cannot relabel a delayed final event. Upload selection drains every pending regular chunk of a recording before its final chunk. Object names carry the `rc2` recording-protocol marker, and SQS messages include stable `recordingJobId`, `chunkId`, and `chunkOrder` values derived from that name for backend idempotency and diagnosis.

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

## Patient notes integration

With patient capture enabled, `Recording` uses `Patients/PatientCapturePicker` for an existing patient, new patient, or unassigned visit. It freezes patient/date/visit-type metadata independently of noteSettings and starts microphone access within the user gesture before asynchronous auth or network work. `RecordingManager` and the upload queue retain that snapshot for the complete session; cancellation and account changes invalidate late callbacks. Updated captures request automatic transcription language selection. `useNoteGeneration` associates the stream with the exact Notes key and obtains a durable saved-note acknowledgement before treating the preview as saved. A partial or unconfirmed stream remains visible with recovery guidance.

`REACT_APP_PATIENT_NOTES_ENABLED` enables patient features; `REACT_APP_PATIENT_CAPTURE_ENABLED=false` independently stops new patient capture. Do not log transcripts, generated notes, patient metadata, auth tokens, or upload paths. Patient service contracts and draft guards are maintained in `Patients` and `src/services/patientNotes.js`.

Recorder New Note CSS is scoped to `.recording-dialog` so importing Recording styles cannot stretch or reshape the Clipboard toolbar. This does not change the recording lifecycle.

### Recovered saved results

Per-timestamp sessions and foreground ownership remain in place; a background
recovery cannot replace the current clipboard. The foreground application installs
the exact saved body/version as its clean editable baseline. Opening another
Patients visit is held while generation owns the clipboard, matching history drops.

Stream controls are parsed incrementally. NOTE_RECOVERED retrieves the authoritative saved body/version; true errors preserve a preview with unconfirmed persistence. Cancellation cannot block saved-result retrieval. See the recording knowledge concept and regression tests.
