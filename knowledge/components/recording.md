---
type: feature-architecture
title: "Recording, Dictation, and Note Generation"
description: "Current recording architecture, the 2026 refactor history, browser-specific behavior, failure modes, and maintenance boundaries."
resource: "../../src/components/Recording/RecordingManager.jsx"
tags: [recording, dictation, media-recorder, transcription, note-generation, release-risk]
---

# Recording, Dictation, and Note Generation

Recording is the highest-risk workflow in the web application. It contains two independent microphone systems:

1. **Conversation recording** captures an encounter, uploads ordered chunks, waits for transcription, and streams a generated note.
2. **Realtime dictation** sends 16 kHz mono PCM directly to AssemblyAI and inserts revised partial text into either the Clipboard or Smart Editor.

They share authenticated UI state but do not share audio capture, transport, or lifecycle code.

## Current Conversation-Recording Boundary

`RecordingManager.jsx` is a hook-style public controller instantiated by `AuthenticatedApp`. It should remain orchestration-only.

| Unit | Ownership |
| --- | --- |
| `RecordingManager.jsx` | Shared refs, top-level recording state, hook composition, and the public controller API. |
| `useMediaRecorderController.js` | Microphone access, `MediaRecorder`, four-minute chunk rotation, pause/resume, finalization, discard, stream cleanup, and browser format selection. |
| `useAudioUploadQueue.js` | Ordered Amplify Storage uploads and SQS FIFO dispatch. |
| `useNoteGeneration.js` | AppSync transcript-completion subscription, fallback timeouts, Lambda response streaming, aborts, and user-visible generation failure handling. |
| `recordingConstants.js` | Backend endpoints, queue URL, retry text, chunk interval, blob threshold, and timeout values. |
| `recordingAuth.js` | Cognito user id, access token, and temporary AWS credential access. |
| `noteGenerationErrors.js` | Recognition of Lambda JSON and streamed sentinel errors. |
| `recordingTelemetrySchema.js` | Versioned event vocabulary, payload allowlist, recursive privacy rejection, safe-code normalization, retention, and cryptographic ids. |
| `recordingTelemetryClient.js` | Authenticated nonblocking AppSync batching, bounded memory, retry/cooldown, reconnect, and keepalive delivery. |
| `recordingTelemetryContext.js` / `recordingSignalHealth.js` | Build/platform/browser context, per-job device hashing, safe track settings, and aggregate-only signal analysis. |
| `recordingBackendContract.js` | Correlated SQS/note-generation request shapes, status subscription, and legacy timestamp migration matching. |

The controller exposes `startRecording`, `stopRecording`, `discardRecording`, `pauseRecording`, and `resumeRecording` plus UI state such as `isRecording`, `isPreparingTranscript`, and `isGeneratingSummary`.

## Conversation Lifecycle

1. A user gesture creates one cryptographically random `recordingJobId`, emits `capture.requested`, and starts `getUserMedia()` with a conversation timestamp and unique path stamp retained only for legacy backend compatibility.
2. Applied microphone settings and a job-salted device hash are recorded without raw device identifiers. Aggregate-only signal analysis retains RMS/peak/duration counts but never audio samples.
3. `MediaRecorder` emits chunks. Desktop browsers are rotated by stopping and restarting the recorder every four minutes; Android also receives a four-minute `timeslice` to avoid zero-duration WebM blobs.
4. Blobs smaller than 1,000 bytes are rejected as header-only containers.
5. The upload queue writes chunks to `protected/<userId>/...` in order with job/schema/order and originating app/platform/browser metadata, then sends one FIFO SQS message per object grouped by `recordingJobId`. Every item belongs to that immutable id.
6. The final SQS acknowledgement starts an owner-scoped AppSync subscription. Job-id status correlation is authoritative; a timestamp query is tried once only when the deployed schema is still legacy.
7. Completion, explicit no-speech, subscription error, or a 40-second wait fallback starts the note-generation Lambda with the same job id and schema version.
8. The Lambda response is streamed into the clinical workspace. Generation has a 120-second normal timeout and a 45-second timeout after transcript fallback.
9. Completion, failure, discard, and unmount emit one terminal outcome and release media tracks, intervals, subscriptions, abort controllers, timers, and NoSleep. Discard and unmount invalidate the session, cancel active Amplify/SQS work, and suppress late callbacks.

### PHI-safe operational timeline

Conversation recording emits a strict `1.0` event vocabulary into an authenticated first-party AppSync model. Delivery batches briefly in memory and retries independently of recording; GA4 and console availability are not part of the reliability path. Payload validation rejects clinical text, audio/binary values, credentials/tokens, names/email, direct patient/user/device identifiers, and unsafe strings before an event is queued.

The timeline includes capture health/settings, chunk bytes/order, storage and queue acknowledgements, client-observed transcription/no-speech, note generation, retry, terminal state, and telemetry delivery health. The event vocabulary also reserves backend-owned notification, quarantine, and deletion outcomes. Those backend events are not complete until the external Lambda repositories adopt the contract and an authorized release provisions AppSync, TTL, access, metrics, and alarms.

See [PHI-safe Recording Correlation and Telemetry](../operations/recording-telemetry.md) for the complete dictionary, exact support query, privacy tests, access/retention model, backend handoff, and deployment gates.

### Browser-specific behavior

- iPhone and iPad request `video/mp4` from `MediaRecorder`.
- Firefox requests `audio/webm`.
- Other capable browsers prefer `audio/webm; codecs="pcm"`.
- Android uses `MediaRecorder.start(240000)` because native/WebView recordings were observed with invalid duration metadata without a timeslice.
- Safari intentionally keeps the microphone stream alive between recordings to avoid a repeated permission prompt; it is released on component cleanup.
- Non-Safari streams are released only after the recorder's final `ondataavailable`/`onstop` sequence, because stopping tracks earlier previously truncated substantial audio.

Do not reorder final media cleanup without testing real Chrome, Safari/iOS, Firefox, and Android behavior.

## Why RecordingManager Changed So Much

The current structure is the result of a sequence of production-oriented fixes, not a cosmetic refactor:

| Date | Commit | Durable result |
| --- | --- | --- |
| 2026-02-27 | `62f4ec8` | Removed the former recording test harness and began replacing the earlier manager implementation. This is why current automated coverage is unusually small. |
| 2026-02-28 | `a46b6d7` | Added the main MediaRecorder/upload/fallback update on the web line. |
| 2026-03-02 | `344f224` | Fixed the stop/start race that produced header-only blobs by restarting from `onstop` and rejecting blobs under 1,000 bytes. |
| 2026-03-02 | `7200096` | Delayed track shutdown until media flush and retained Safari streams to preserve microphone permission. |
| 2026-03-15 | `8d6e8b9` | Switched the web app to the current note-generation Lambda URL. |
| 2026-05-18 | `2f02843` | Split the 800-plus-line manager into focused hooks and moved the app shell into feature folders; added cursor-targeted dictation. |
| 2026-07-01 | `7761d93` | Made dictation insertion snapshot-based and pure under React Strict Mode, added the green live caret, and introduced the five current insertion tests. |

The key architectural decision is the May split: platform and failure behavior now belongs in focused hooks, while `RecordingManager` only connects them.

## Realtime Dictation

`Dictation.jsx` creates an AssemblyAI `StreamingTranscriber`, an `AudioWorkletProcessor`, and a `ReadableStream` carrying 16 kHz mono Int16 PCM. `AuthenticatedApp` creates separate controllers for Clipboard and Smart Editor dictation.

When dictation begins, `createDictationInsertion()` captures immutable text before and after the textarea selection. Every revised partial transcript is applied with `applyDictationText()` against that same snapshot. This preserves text after the cursor, intentionally replaces selected text, and prevents identical phrases elsewhere from attracting the insertion point.

The target textarea stays focusable so the browser paints the green live caret, but its change handler rejects manual edits while dictation is active. Never mutate insertion refs from a React state updater; Strict Mode can call updater functions more than once.

## Recording Safety Fixes on 2026-07-15

The pre-publish review found five lifecycle and submission risks. The same review cycle resolved them as follows:

1. `recordingAuth.generateToken()` no longer logs Cognito access tokens.
2. Uploads are session-scoped. Discard, fatal failure, a new recording, and unmount invalidate the old session, cancel the active Amplify upload, abort an active SQS request, and reject late callbacks. Media events are serialized so asynchronous identity lookup cannot let a final chunk overtake an earlier chunk.
3. S3/auth/SQS failures are propagated once to `RecordingManager`, stop the recording, clear the preparation state, and show a specific retry message rather than silently looping or hanging.
4. `recordingMedia.js` derives extension and content type together. Safari MP4 blobs upload as `.mp4` with their emitted MP4 MIME type; WebM, Ogg, and WAV use matching metadata.
5. `cleanupRecorder()` now takes a cancellation path with no final chunk and no React state updates.
6. Failed or zero-credit subscription checks discard the just-started Safari-compatible recorder instead of finalizing and submitting it.

The suite now contains 63 tests across dictation insertion, media mapping, emitted-chunk ordering, upload cancellation, late-callback suppression, SQS failure, MP4 upload metadata, capture/start/unmount cleanup, authenticated-identity failure, telemetry vocabulary/allowlisting/redaction, cryptographic ids/support references, platform/browser/device context, authenticated bounded delivery/auth refresh/cooldown/lifecycle cleanup, aggregate signal health, and backend correlation/schema-migration contracts. It still does not simulate real four-minute browser rotation, a deployed AppSync subscription migration, the external Lambda chain, or native release builds, so the manual platform and backend matrix remains required.

## Minimum Manual Recording Matrix

Before publishing a build with recording changes, verify:

- Chrome desktop: start, pause/resume, stop, note stream, discard during an upload, and a recording longer than four minutes.
- Safari on iPhone/iPad: permission prompt behavior, second recording without a broken stream, final audio completeness, and successful MP4-path transcription.
- Android browser or WebView as applicable: recording longer than four minutes and valid audio duration after every rotation.
- Firefox desktop: WebM capture and note generation.
- Network interruption: S3 failure, SQS failure, transcript timeout, generation timeout, and user recovery.
- Telemetry interruption: capture continues while delivery fails, reconnect flushes the buffered timeline, overflow/delivery failure is visible, and no event contains content or direct identifiers.
- Backend correlation: one synthetic `recordingJobId` appears in S3 metadata, every SQS/retry message, Notes status, transcription/no-speech, generation, quarantine/deletion, notification, and exactly one terminal event.
- Dictation in both textareas: cursor insertion, selection replacement, repeated phrases, stop/restart, and locked manual editing during the live caret.

## Maintenance Rules

- Preserve the manager/hook ownership table above.
- Update backend constants together with the corresponding Lambda and queue deployments.
- Make upload cancellation/session identity explicit before allowing callbacks to mutate UI state.
- Keep `src/components/Recording/README.md` synchronized with file ownership.
- Treat `recordingJobId` as the authoritative correlation key. Timestamp matching is migration-only and must never override a mismatched job id.
- Add telemetry fields only through the versioned allowlist, GraphQL model, rejection tests, and event dictionary; never send free-form error messages or content.
- Keep telemetry delivery nonblocking and bounded. Do not add a recording-path `await` for operational logging.
- Add focused tests whenever a recording race or platform bug is fixed; do not rely on the full browser matrix for every regression.

## Provenance

Synthesized from [`RecordingManager.jsx`](../../src/components/Recording/RecordingManager.jsx), [`useMediaRecorderController.js`](../../src/components/Recording/useMediaRecorderController.js), [`useAudioUploadQueue.js`](../../src/components/Recording/useAudioUploadQueue.js), [`useNoteGeneration.js`](../../src/components/Recording/useNoteGeneration.js), [`recordingTelemetrySchema.js`](../../src/components/Recording/recordingTelemetrySchema.js), [`recordingTelemetryClient.js`](../../src/components/Recording/recordingTelemetryClient.js), [`recordingBackendContract.js`](../../src/components/Recording/recordingBackendContract.js), [`recordingMedia.js`](../../src/components/Recording/recordingMedia.js), the adjacent recording tests, [`Dictation.jsx`](../../src/components/Recording/Dictation.jsx), [`dictationInsertion.js`](../../src/utils/dictationInsertion.js), [`Context.md`](../../src/components/Recording/Context.md), [`README.md`](../../src/components/Recording/README.md), and Git commits `62f4ec8`, `a46b6d7`, `344f224`, `7200096`, `8d6e8b9`, `2f02843`, and `7761d93`. Current implementation takes precedence over older recording reference documents.
