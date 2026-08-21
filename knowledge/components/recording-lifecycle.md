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

## Provenance

- `src/components/Recording/RecordingManager.jsx` (current implementation)
- `src/components/Recording/RecordingManager.test.js` (delayed-WebKit lifecycle coverage)
- `src/components/Recording/Context.md` (component context; current code resolves its older generic chunking description)
