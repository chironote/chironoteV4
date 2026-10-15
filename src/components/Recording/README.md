# iOS recording and dictation

`RecordingManager.jsx` owns the existing iOS microphone, chunk upload and WebKit finalization lifecycle. Stop transactions wait for delayed dataavailable/onstop, rotate once on foreground, suspend the rotation timer in background and cancel uploads on discard/unmount. The historical MP4 recorder/WebM-labelled upload contract is preserved; do not change it without backend validation.

`useNoteGeneration.js` owns transcript subscriptions and note streaming. RecordingManager forwards generation status/errors and authoritative saved-note identity to AppShell. EOF previews do not become saved-note identity. RecordingManager.test.js remains the native lifecycle regression gate.

`Recording.jsx` uses compact PatientCapturePicker: existing patient implies follow-up, new name implies initial exam, Re-Exam remains explicit, selected patient collapses to name and reset, and history is automatic. Capture metadata and settings are snapshotted before async startup.

`Dictation.jsx` retains the native token/AudioWorklet pipeline and receives optional onDictationStart/onDictationTextUpdate/onDictationStop callbacks. The shell snapshots the selected range, inserts revised partial transcripts without replacing surrounding text, and never changes clipboard text just to indicate loading. Legacy callers without insertion callbacks keep their previous replacement contract. Pure insertion tests cover surrounding-text preservation and repeated revisions.

This folder also owns recording controls, transcript status, permission explanations and credit dialogs. No live provider/device behavior is established by source tests. Source: cap-ios 2326d34 lifecycle, prod142383e compact capture, 2026-10-11 callback wiring.

The recording lifecycle test isolates unrelated PDF delivery imports so native plugin registration cannot interfere with its real microphone/WebKit timing cases. The dictation insertion suite supplies stable external-service/NoSleep doubles that survive CRA resetMocks, while executing the actual Dictation hook and media setup/callback path.

Recording.css scopes its New Note flex/width rules to `.recording-dialog`, preventing those recording styles from resizing the Clipboard toolbar. Recording and dictation lifecycle behavior is unchanged.


Exam Layout remains visible for new and unassigned capture: new patients force a checked, disabled gray checkbox and initial-exam metadata; unassigned visits use the editable manual choice. Existing patients retain follow-up/Re-Exam semantics. Manual exam preference is stored separately in `unassignedExamLayout` (initially seeded from legacy `noteSettings`) so a forced capture cannot become manual intent after clearing or reopening. PI is independent. Effective `noteSettings` are written synchronously before RecordingManager freezes its separate settings/visit snapshots; backend ICD rules are unchanged.

A typed, unselected name is checked across matching directory pages, then Start Recording opens the existing PatientDialog confirmation after the Exam/PI options. Create patient & record starts from its click; Record without a patient clears identity, injury and initial-exam linkage while preserving the preceding Exam/PI choices. Duplicate/error feedback retains the draft. Lookup preparation is invalidated on name edits, selection, clear and unmount. Blank unassigned and feature-disabled paths start directly. This is frontend source only; no native build or deployment is implied.
