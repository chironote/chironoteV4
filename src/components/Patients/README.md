# Patient components

Android keeps native edit/copy behavior with no new clinical-body Save. The original checkout’s four focused AuthUI files were ported to preserve restored-session cleanup and safe error handling. Version/signing/release changes were not imported.

All clinical requests go through `../../services/patientNotes.js`; server owner verification and conditional Save are authoritative. PatientCapturePicker edits metadata without committing a clinical body. SavedNoteEditor fetches an exact saved version, preserves drafts across failed saves/diagnosis confirmation, and exposes review/suggestion/context status. PatientDialog traps keyboard focus and restores the opener. useDraftGuard registers only in-memory drafts; draftNavigation serializes guarded transitions. CSS supports narrow layouts and visible focus.

Do not add a persistent PHI draft cache, infer patient identity from labels, substitute preview EOF for a saved result, or enable new mobile Save controls. See the repository patient-notes knowledge concept for gates and validation.
