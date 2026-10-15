---
type: component-readme
title: "Recording Components"
description: "Recording, upload, transcript, note-generation, and dictation component ownership and maintenance guidance."
resource: "../../src/components/Recording/README.md"
tags: [chironote, component, recording]
---


> Source: [README.md](../../src/components/Recording/README.md)

# Recording Components

## Patient creation confirmation

Exam Layout is visible and editable for unassigned capture and visible, checked, disabled and gray for selected new patients. Initial-exam metadata remains automatic only for new patients; an unassigned exam layout does not create patient/visit linkage. Existing patients retain follow-up/Re-Exam. Manual preference lives separately in nonclinical localStorage `manualExamLayout`, initialized from legacy noteSettings when absent, so forced patient settings cannot become manual intent across clearing or reopening. Before microphone start, effective noteSettings are written synchronously; the recorder freezes settings separately from visitMetadata before permission awaits, and generation uses those session snapshots. PI remains independent in all paths. Capture-disabled builds keep legacy noteSettings behavior.

Android adapts the approved 2026-10-13 web patient-creation pattern: one pale green full-width Create New Patient row, typed name and darker + Add affordance, with 8px result spacing. A typed unselected Start Recording checks every matching directory page using normalized names, then opens Create new patient? with a name-only highlighted panel. Closing retains the draft. Create patient & record passes provisional identity and initialExam into the established capture contract and starts microphone access synchronously before subscription awaits. Record without a patient clears identity/name/injury/type metadata while preserving the Exam Layout and PI choices made before confirmation. Existing selection, blank and disabled capture remain direct; duplicate/failing/stale checks preserve input and block capture. This UI changes no backend, patient flags or native recorder lifecycle. Sources: [picker](../../src/components/Patients/PatientCapturePicker.jsx), [Recording](../../src/components/Recording/Recording.jsx), adjacent tests and [style authority](../development/STYLE.md).

Compact capture defaults existing patients to follow-up (with Re-Exam) and new names to initial exam, always using saved history. RecordingManager forwards saved-record and generation-state callbacks to the clipboard. Generation cleanup releases editor busy state. Android finalized containers, four-minute rotation, permission-start cancellation, pause/resume/background ordering and upload serialization remain unchanged by the patient port.

This folder owns the core recording, dictation, audio upload, transcript waiting, and generated-note streaming workflow.

## Files

- `RecordingManager.jsx` is the public hook-style orchestration API consumed by `AuthenticatedApp`.
- `useMediaRecorderController.js` owns microphone access, `MediaRecorder`, chunking, pause/resume, discard, and cleanup.
- `useAudioUploadQueue.js` owns ordered S3 upload and SQS dispatch for audio chunks.
- `recordingLifecycle.js` owns pure recorder lifecycle and chunk-classification decisions.
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

Regular chunks smaller than `MIN_AUDIO_BLOB_SIZE` are skipped as likely header-only blobs. Non-empty final-stop markers are retained so already accepted audio can still be finalized when the marker has no speech frames.

## Capacitor Lifecycle

Android uses one four-minute stop/restart scheduler and starts `MediaRecorder` without a timeslice. This makes every separately uploaded blob a finalized WebM container rather than a dependent fragment of a longer container. Pause also stops and flushes the current container as a regular chunk; Resume starts a fresh container. Event state is snapshotted synchronously, event handling is serialized, and the upload queue drains every regular chunk before the final chunk. Object names carry an `rc2` protocol marker, and SQS messages carry stable recording, chunk, and order identities.

This preserves the established WebView implementation and does not add a native foreground recording service.

## Production and Internal Release Parity

Google Play Production `24 (1.24)` and Internal testing `27 (1.27)` use the same recording, native lifecycle, upload, transcription, and note-generation source. The source range from recording-fix commit `74e4df6` through Internal release commit `c9b54de` changes no files under `src/components/Recording`, `src/services/nativePlatform.js`, or `android/app/src/main`; the later releases catch up the authenticated product UI and Clipboard presentation. The retained signed AABs verify as `com.chironote.app` with SHA-256 `E36D72900C2EA079F1F2BC4686859F199CDD98F92C894E3C3809B14D862FB0F8` for `24 (1.24)` and `EB8B92E229A69FA690620BCCC5F683AA609656C10F12F6B7DB259ED8E343EA8E` for `27 (1.27)`. On 2026-08-29, the exact Internal `27 (1.27)` bundle was submitted to the United States Production track at the existing 100% rollout with managed publishing off; Play reported `Changes in review`, so availability remains pending Google approval.

## Dictation Flow

`Dictation.jsx` uses AssemblyAI `StreamingTranscriber`, an `AudioWorkletProcessor`, 16 kHz mono audio, and a token fetched from Lambda. It is instantiated twice by `AuthenticatedApp`: once for the clipboard and once for the smart editor. The controller streams transcript updates through optional insertion callbacks so parent components can insert dictation at the captured cursor/selection without clearing the existing text.

## Maintenance Notes

- Keep `RecordingManager.jsx` orchestration-only; implementation belongs in the focused hooks.
- Be careful with Safari: `Recording.jsx` starts recording before async subscription checks because `getUserMedia()` must happen inside the user gesture.
- `recordingConstants.js` contains backend URLs, queue URL, timeouts, and retry text. Update dependent backend code together.
- Always clean up media tracks, intervals, subscriptions, and abort controllers when changing this folder. Unmount cleanup is discard-like and does not publish final audio.
- Regression-check background/foreground transitions on an installed Android build whenever recorder lifecycle code changes.
- Verify the release bundle contains the lifecycle and object-identity helpers so an unrelated convergence build cannot revive an older recorder implementation.

## Provenance

Derived from [README.md](../../src/components/Recording/README.md), [useMediaRecorderController.js](../../src/components/Recording/useMediaRecorderController.js), [recordingLifecycle.js](../../src/components/Recording/recordingLifecycle.js), [useAudioUploadQueue.js](../../src/components/Recording/useAudioUploadQueue.js), [nativePlatform.js](../../src/services/nativePlatform.js), and [MainActivity.java](../../android/app/src/main/java/com/chironote/app/MainActivity.java).

