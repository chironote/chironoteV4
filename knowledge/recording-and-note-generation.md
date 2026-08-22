# Android Recording and Note Generation

The Android `cap-and` line uses a native-aware monolithic `RecordingManager` for microphone and recording lifecycle behavior. Audio chunks are uploaded and sent to the existing shared `AudioTranscriptionQueue.fifo`. That transcription path is independent from note generation.

After transcript completion, Android posts to the production `transcriptToNoteV2` streaming Function URL. The installed-client JSON body remains `userId`, `timeStamp`, `accessToken`, and serialized `noteSettings`. The response is decoded as UTF-8 chunks and appended in arrival order to preserve partial note streaming.

`src/components/Recording/noteGenerationContract.js` owns this narrow client contract. Endpoint changes must include regression coverage for the exact V2 URL, body fields, and streamed chunk ordering. They must not alter audio queues, transcription functions, microphone permissions, recording lifecycle, dictation, or UI behavior.

Android release `18 (1.18)` published this contract to Google Play Internal testing on 2026-08-17. Play confirmed the release is available to the single tester on the `Early Beta` list with zero supported-device loss. The signed `com.chironote.app` bundle has SHA-256 `390E0D6802EC10AA24BFC3CEDB7A23318ED4A3B197DBE8A7CB4B9EEA66A2FE04`. A later owner-approved Production submission of `20 (1.20)` is in Google review.

The Android build targets and compiles against API 36. This requires Android Gradle Plugin 8.9.1 and Gradle 8.11.1, the documented minimum compatible tooling for API 36. Keep the target-SDK, compile-SDK, AGP, and wrapper versions aligned when updating Android API support.

## Provenance

- `src/components/Recording/RecordingManager.jsx`
- `src/components/Recording/noteGenerationContract.js`
- `src/components/Recording/noteGenerationContract.test.js`
- `src/components/Recording/Context.md`
- `android/app/build.gradle`
- `chironote/lambda-transcript2note` installed-client request and streaming contract reviewed 2026-08-17
