# Settings Components

`Settings.jsx` displays the server-backed `hoursSavedLifetime` metric and owns the Custom Instructions card, persisted-state loading, focus refresh, and job-aware polling. It does not display current-period `hoursSaved` or any generated SOATP prompt fields.

`CustomInstructionsDialog.jsx` uses `ProductDialog`, edits only the original natural-language source, protects dirty text, blocks dismissal and duplicate submission during the initial deliberate compile period, and labels progress messages as approximate. The user can leave after roughly 30 seconds, but success appears only after AppSync reports `READY` for the server's current job and remains visible until the user closes it. Validation errors are associated with the textarea; compilation and transport failures are announced as form-level errors. Focus returns to the card action after dismissal.

Networking is isolated in `src/services/customInstructions.js`. It imports the generated `getMyCustomInstructions`, `startMyCustomInstructionsCompilation`, and `disableMyCustomInstructions` documents and uses the authenticated Amplify GraphQL client; no direct Lambda URL or browser-held compile request is used. The checked-in frontend schema snapshot and generated documents match the installed Cognito-authenticated AppSync contract and request only the safe source/status projection. A same-text retry reuses its idempotency key, and an uncertain start response triggers a status reload so an already-persisted job can be recovered.

Polling runs about every three seconds for 30 seconds, then every nine seconds, pauses with honest return-later guidance after five minutes, and resumes from persisted server state on window focus or progress-dialog reopen. Older overlapping reads cannot overwrite newer state, and status-refresh errors remain visible without converting approximate progress into success.

Custom Instructions is available by default, including builds with no `REACT_APP_CUSTOM_INSTRUCTIONS_ENABLED` setting. An explicit `false` (case-insensitive, whitespace-trimmed) is the emergency opt-out and renders the non-interactive Unavailable state without issuing Custom Instructions requests. The previous opt-in default hid the editor in production despite the working backend. On 2026-09-26, the production Cognito/AppSync/queue/provider path reached READY with a synthetic account, verified source preservation and disable behavior, and the temporary login was removed. The production note consumer's custom-profile flag and the queue worker mapping were both confirmed enabled. See the release knowledge for evidence and rollback.

## Patient notes integration

When patient notes are enabled, Settings adds Configure Signature. `Patients/SignatureSettings.jsx` edits exactly the clinician name and NPI with Save/Cancel and uses `src/services/patientNotes.js`; only the authenticated patient API may persist these account fields. This is the printed name/NPI beneath each exported visit, not an electronic signature.

## Patient UI correction

SignatureSettings matches the existing settings-card surface, previews the configured name and only the NPI last four digits, and provides an explicit unset/loading/error state. Configure Signature still opens the name/NPI form; successful saves refresh the masked preview. Full NPI is confined to the configuration form, not the card preview.
