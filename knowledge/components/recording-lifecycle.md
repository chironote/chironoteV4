---
type: component-lifecycle
title: "Recording Lifecycle"
description: "How recording segments rotate, finalize, cancel, and enter the S3/SQS transcription flow, including iPhone WebKit constraints."
resource: "../../src/components/Recording/RecordingManager.jsx"
tags: [recording, mediarecorder, ios, webkit, uploads]
---

# Recording Lifecycle

`RecordingManager` owns microphone acquisition, segment rotation, upload ordering, and the final-audio marker consumed by the existing S3/SQS flow.

On iPhone/iPad, `MediaRecorder.start(1000)` requests periodic MP4 writer flushing. Every nonempty data event is retained in order for the current recorder cycle; these pieces can depend on one another and are never uploaded independently. At `onstop`, the periodic pieces and final data event are assembled into one MP4 Blob and the buffer is cleared before any restart. Four-minute rotation and foreground rotation still define upload boundaries, not the one-second flushing interval.

A stop transaction captures its intent before `MediaRecorder.stop()`. WebKit delivers the final `dataavailable` event asynchronously before `onstop`; a rotation restarts only from that stop lifecycle. A final stop releases tracks only from `onstop`. A stop while paused resumes first and immediately stops once recording is active; it uses no timing delay. An unsolicited stop retains its completed segment as regular audio, preserving the previous behavior without claiming interruption recovery.

Each media event captures its recording identity synchronously. The WebKit stop transaction keeps its intent mutable until `onstop` classifies the assembled segment, so a user stop before either delayed event can still make that pending transaction final. This covers Stop arriving between dataavailable and onstop without renaming already submitted audio. Discard invalidates only the active recording's media/queue/completion work; unmount cancels all sessions. Starting another recording does not cancel already finalized audio. Queue order preserves regular-before-final within each recording, without global regular-chunk priority starving an earlier final.

Periodic flushing targets the MP4 final-writer backpressure failure described in [WebKit bug 299164](https://bugs.webkit.org/show_bug.cgi?id=299164) and [its fix](https://github.com/WebKit/WebKit/pull/51596). That original defect was reported fixed in iOS 26.2; it is a source-backed candidate explanation, not proof of the owner's device failure or a physical-device acceptance result. Verify a full recording's decoded duration and final spoken content on the installed candidate before lifting the production hold.

Queue items retain their original Blob, path, timestamp, owner, settings and visit snapshot until S3 and SQS acknowledge them. Explicit upload-pending, dispatch-pending and acknowledged stages prevent SQS retries from re-uploading an acknowledged object, including ambiguous responses beyond the FIFO deduplication window. This iOS contract uses stable object paths and FIFO IDs; it has no separate recordingJobId/chunkId message fields.

Stable IDs do not extend SQS FIFO's deduplication window: an accepted message with a lost response can be delivered again after that window. Duplicate/billing protection depends on backend durable guards, which these client tests do not validate. A fulfilled S3 task is acknowledged even if cancellation raced its success. Dispatch-only retries read credentials once; upload attempts read before upload and again immediately before dispatch. Auth reads have a 60-second deadline; Amplify has no auth abort API, so late read results are observed but cannot resume an expired queue attempt or publish callbacks. SDK auth work may still finish independently.

Transient connection/auth-refresh failures retry with exponential jitter (initial ceiling 1 second, cap 60 seconds, minimum delay 250ms). A 120-second no-byte-progress watchdog cancels a stalled upload, rather than limiting total duration; dispatch has a 60-second abort limit. The single queue worker awaits request settlement after cancellation. Online events only wake that worker; retry timers also handle WiFi switches without online events. Persistent authorization/validation failures remain visibly blocked for explicit Retry. Each attempt verifies the authenticated owner and obtains dispatch credentials/token after S3 completes. No credentials or tokens are stored in queue items.

HTTP400 throttling, expired credentials and request timeouts are retryable exceptions to HTTP input/auth error blocking. SDK multipart retry progress can decrease before advancing again; the watchdog compares adjacent events rather than requiring a new all-time high. Blocked status/Retry are visible inside the modal as well as the shell.

The waiting dialog offers Record next appointment. Each recording retains its own subscription, note-generation timers, preview and abort state, using the immutable capture timestamp/settings/visit. A completing in the background still follows note generation and authoritative saved-note lookup; history refreshes while A cannot replace B's clipboard, close B's controls or disable B's NoSleep. Transcript timeout/fallback and generation policy are unchanged. This is in-memory process-alive recovery, with no restart storage or completeness guarantee for asynchronous backend transcription.

Opening new recording settings also hands off presentation ownership before B starts. NoSleep release uses a separate capture owner: a detached/failed-start presentation does not leak A's wake lease, and A cannot release a lease transferred to a successfully started B. Credit responses carry the accepted capture session and a component request guard; a late denial still cancels only A's remaining work and reports an earlier-recording error without cancelling B or showing A's credit popup over B. A no-op Start does not invalidate the accepted capture's check. Credit-denial policy is unchanged. Closing during microphone startup cancels that capture before its pending acquisition can become invisible. Start exposes startup/final-stop settling state (also fenced on non-iOS within this client); this waits only for microphone lifecycle, never pending uploads.

iPhone records `video/mp4`, but uploads retain the established `.webm` object name and `audio/webm` metadata used by the current backend ingestion contract. This intentional label mismatch is not changed by recorder lifecycle work; a media-format migration requires coordinated backend validation.

The 2026-10-11 workflow port changes only callback forwarding in RecordingManager: generation state/error and authoritative saved-note readiness reach AppShell. Media stop ordering, background handling, identity cancellation and upload media labels are unchanged. Compact capture lives in Recording.jsx; insertion callbacks preserve dictation text around the selected range.


Exam Layout remains visible for new and unassigned capture: new patients force a checked, disabled gray checkbox and initial-exam metadata; unassigned visits use the editable manual choice. Existing patients retain follow-up/Re-Exam semantics. Manual exam preference is stored separately in `unassignedExamLayout` (initially seeded from legacy `noteSettings`) so a forced capture cannot become manual intent after clearing or reopening. PI is independent. Effective `noteSettings` are written synchronously before RecordingManager freezes its separate settings/visit snapshots; backend ICD rules are unchanged.

A typed, unselected name is checked across matching directory pages, then Start Recording opens the existing PatientDialog confirmation after the Exam/PI options. Create patient & record starts from its click; Record without a patient clears identity, injury and initial-exam linkage while preserving the preceding Exam/PI choices. Duplicate/error feedback retains the draft. Lookup preparation is invalidated on name edits, selection, clear and unmount. Blank unassigned and feature-disabled paths start directly. This is frontend source only; no native build or deployment is implied.

## Recovered generation and saved-note authority

The existing NUL ERROR control can carry `NOTE_RECOVERED` after the backend has
confirmed a saved result that differs from the streamed preview. The stream parser
holds control bytes across arbitrary read boundaries until its JSON completes;
truncated, malformed or oversized controls fail closed. Control text is never
added to the visible clinical preview. Whole-response JSON errors and transcript
error parsing retain their existing one-shot behavior.

Only NOTE_RECOVERED follows the saved-success path: fetch `getSavedNote` for the
captured timestamp, verify ready status, matching timestamp and a version, then
apply that authoritative body and identity. Ordinary EOF uses the same lookup when
patient notes are enabled. Genuine conflicts, interrupted streams and unavailable
or incomplete lookups preserve the preview and report unconfirmed persistence.
Reader cancellation is best effort and cannot block a confirmed saved result.
Saved-note retry accepts an unchanged version only for the explicit recovered
control; ordinary retry still requires its new saved revision.

The current V4 Capacitor client's per-capture sessions remain independent. A
background recovered completion refreshes history without changing the foreground
clipboard. Foreground completion installs the exact saved body/version as its
clean editable baseline. Opening another Patients visit is held while generation
owns the clipboard. No native project or bridge change is included.

Synthetic parser, service, generation-hook/session and application tests cover the
recovery boundary. Browser tests do not establish installed-device acceptance.
Authenticated refresh, physical recording, interrupted connectivity and subsequent
conditional Save still require the platform's normal release checks. This source
patch does not publish a website, native app or extension release.

## Provenance

- [Incremental generation control parser](../../src/components/Recording/noteGenerationErrors.js)
- [Saved generation retry and retrieval](../../src/services/patientNotes.js)


- [Recording manager](../../src/components/Recording/RecordingManager.jsx) (current implementation)
- [Recording lifecycle tests](../../src/components/Recording/RecordingManager.test.js) (delayed-WebKit lifecycle coverage)
- [Recording completion sessions](../../src/components/Recording/useNoteGeneration.js)
- [Completion ownership tests](../../src/components/Recording/useNoteGeneration.test.jsx)
- [Recording context](../../src/components/Recording/Context.md) (component context; current code resolves its older generic chunking description)
