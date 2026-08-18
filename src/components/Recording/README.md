# Recording Components

This folder owns Android/Capacitor conversation recording, audio upload, transcript waiting, note-generation streaming, and realtime dictation.

`RecordingManager.jsx` coordinates the native-aware recording lifecycle. `noteGenerationContract.js` owns the installed-client note-generation boundary: the `transcriptToNoteV2` Function URL, the authenticated four-field JSON body, and ordered UTF-8 response-stream decoding. Its focused test prevents endpoint, body, or streaming regressions.

The audio path remains separate. Recording chunks are uploaded and dispatched to the shared `AudioTranscriptionQueue.fifo`; changing note generation must not create or alter queues, microphone behavior, chunk rotation, lifecycle handling, or dictation.

Maintain the V2 contract fields exactly as `userId`, `timeStamp`, `accessToken`, and serialized `noteSettings`. Append every decoded response chunk in order so the existing streamed-note experience is preserved.
