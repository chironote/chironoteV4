# iOS recording and dictation

## Patient creation confirmation — 2026-10-13

Start Recording with an unselected typed name reuses the paginated duplicate guard, then opens Create new patient? with only the name in the highlighted panel. Create patient & record uses prepared initial-exam metadata and synchronously calls capture before subscription lookup. Record without a patient clears identity/name/injury/visit/initial-exam intent and starts directly. Close/Escape retains the typed draft; duplicates and lookup failures preserve input and block capture. Existing selections, blank and flag-off recording remain direct. The scoped green primary action, responsive footer and safe-area modal follow [STYLE](../../../knowledge/development/STYLE.md). Persistence and the WebKit manager lifecycle remain unchanged.

`RecordingManager.jsx` owns the existing iOS microphone, chunk upload and WebKit finalization lifecycle. Stop transactions wait for delayed dataavailable/onstop, rotate once on foreground, suspend the rotation timer in background and cancel uploads on discard/unmount. The historical MP4 recorder/WebM-labelled upload contract is preserved; do not change it without backend validation.

`useNoteGeneration.js` owns transcript subscriptions and note streaming. RecordingManager forwards generation status/errors and authoritative saved-note identity to AppShell. EOF previews do not become saved-note identity. RecordingManager.test.js remains the native lifecycle regression gate.

`Recording.jsx` uses compact PatientCapturePicker: existing patient implies follow-up, new name implies initial exam, Re-Exam remains explicit, selected patient collapses to name and reset, and history is automatic. Capture metadata and settings are snapshotted before async startup.

`Dictation.jsx` retains the native token/AudioWorklet pipeline and receives optional onDictationStart/onDictationTextUpdate/onDictationStop callbacks. The shell snapshots the selected range, inserts revised partial transcripts without replacing surrounding text, and never changes clipboard text just to indicate loading. Legacy callers without insertion callbacks keep their previous replacement contract. Pure insertion tests cover surrounding-text preservation and repeated revisions.

This folder also owns recording controls, transcript status, permission explanations and credit dialogs. No live provider/device behavior is established by source tests. Source: cap-ios 2326d34 lifecycle, prod142383e compact capture, 2026-10-11 callback wiring.

The recording lifecycle test isolates unrelated PDF delivery imports so native plugin registration cannot interfere with its real microphone/WebKit timing cases. The dictation insertion suite supplies stable external-service/NoSleep doubles that survive CRA resetMocks, while executing the actual Dictation hook and media setup/callback path.

Recording.css scopes its New Note flex/width rules to `.recording-dialog`, preventing those recording styles from resizing the Clipboard toolbar. Recording and dictation lifecycle behavior is unchanged.
