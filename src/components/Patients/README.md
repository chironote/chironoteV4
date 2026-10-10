# Patient components

Desktop web has persistent Save; mobile web keeps local edit/copy. The Patients route owns profiles, source diagnosis display and PDF selection. Settings owns Configure Signature.

All clinical requests go through `../../services/patientNotes.js`; server owner verification and conditional Save are authoritative. PatientCapturePicker edits metadata without committing a clinical body. SavedNoteEditor fetches an exact saved version, preserves drafts across failed saves/diagnosis confirmation, and exposes review/suggestion/context status. PatientDialog traps keyboard focus and restores the opener. useDraftGuard registers only in-memory drafts; draftNavigation serializes guarded transitions. CSS supports narrow layouts and visible focus.

Do not add a persistent PHI draft cache, infer patient identity from labels, substitute preview EOF for a saved result, or enable new mobile Save controls. See the repository patient-notes knowledge concept for gates and validation.
