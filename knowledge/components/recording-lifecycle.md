---
type: component-lifecycle
title: "Recording Lifecycle"
description: "How recording segments rotate, finalize, cancel, and enter the S3/SQS transcription flow, including iPhone WebKit constraints."
resource: "../../src/components/Recording/RecordingManager.jsx"
tags: [recording, mediarecorder, ios, webkit, uploads]
---

# Recording Lifecycle

`RecordingManager` owns microphone acquisition, segment rotation, upload ordering, and the final-audio marker consumed by the existing S3/SQS flow.

On iPhone/iPad, a stop transaction captures its intent before `MediaRecorder.stop()`. WebKit delivers the final `dataavailable` event asynchronously before `onstop`; a rotation restarts only from that stop lifecycle. A final stop releases tracks only from `onstop`. A stop while paused resumes first and immediately stops once recording is active; it uses no timing delay.

Each media event captures its recording identity and stop intent synchronously. Rotation blobs remain regular chunks; a user stop that arrives before the delayed data event makes that pending transaction final. Discard and unmount invalidate the recording generation, preventing delayed media events from uploading or restarting. Uploads are queued so regular chunks precede the final chunk.

iPhone records `video/mp4`, but uploads retain the established `.webm` object name and `audio/webm` metadata used by the current backend ingestion contract. This intentional label mismatch is not changed by recorder lifecycle work; a media-format migration requires coordinated backend validation.

The 2026-10-11 workflow port changes only callback forwarding in RecordingManager: generation state/error and authoritative saved-note readiness reach AppShell. Media stop ordering, background handling, identity cancellation and upload media labels are unchanged. Compact capture lives in Recording.jsx; insertion callbacks preserve dictation text around the selected range.


Exam Layout remains visible for new and unassigned capture: new patients force a checked, disabled gray checkbox and initial-exam metadata; unassigned visits use the editable manual choice. Existing patients retain follow-up/Re-Exam semantics. Manual exam preference is stored separately in `unassignedExamLayout` (initially seeded from legacy `noteSettings`) so a forced capture cannot become manual intent after clearing or reopening. PI is independent. Effective `noteSettings` are written synchronously before RecordingManager freezes its separate settings/visit snapshots; backend ICD rules are unchanged.

A typed, unselected name is checked across matching directory pages, then Start Recording opens the existing PatientDialog confirmation after the Exam/PI options. Create patient & record starts from its click; Record without a patient clears identity, injury and initial-exam linkage while preserving the preceding Exam/PI choices. Duplicate/error feedback retains the draft. Lookup preparation is invalidated on name edits, selection, clear and unmount. Blank unassigned and feature-disabled paths start directly. This is frontend source only; no native build or deployment is implied.

## Provenance

- [Recording manager](../../src/components/Recording/RecordingManager.jsx) (current implementation)
- [Recording lifecycle tests](../../src/components/Recording/RecordingManager.test.js) (delayed-WebKit lifecycle coverage)
- [Recording context](../../src/components/Recording/Context.md) (component context; current code resolves its older generic chunking description)
