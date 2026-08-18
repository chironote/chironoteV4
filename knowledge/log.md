# Knowledge Update Log

## 2026-08-17

- **Android V2 note generation:** Recorded that Android preserves the existing shared audio-transcription queue and four-field authenticated request while switching post-transcription note generation to the production `transcriptToNoteV2` streaming endpoint. Focused endpoint, request-body, and ordered-stream regression coverage passed. Signed release `18 (1.18)` (`com.chironote.app`, SHA-256 `390E0D6802EC10AA24BFC3CEDB7A23318ED4A3B197DBE8A7CB4B9EEA66A2FE04`) is available to the single `Early Beta` Internal tester with no device-support loss; Production and other tracks were untouched.
