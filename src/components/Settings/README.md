# Settings Components

When patient notes are enabled, Configure Signature saves the name/NPI used for PDF exports through `Patients/SignatureSettings`. The card masks the NPI outside the edit dialog and retains its existing placement below Custom Instructions.

`Settings.jsx` displays the server-backed `hoursSavedLifetime` metric and owns persisted Custom Instructions status, polling and disable actions. It does not display current-period `hoursSaved` or any compiled SOATP prompt fields.

`CustomInstructionsDialog.jsx` uses the existing `ProductDialog`, edits only the original natural-language source, protects unsaved text, and prevents duplicate submission. Compilation runs on the server; approximate activity messages never imply success. Only server-confirmed READY with CUSTOM effective mode reports Enabled. During updates the previous active instructions remain in effect; failures preserve the draft and show the server's effective mode. After the initial 30-second compile period the user can close the dialog and return later. Use defaults requires confirmation and keeps the saved wording for later editing/enabling.

Networking is isolated in `src/services/customInstructions.js` and uses the authenticated Amplify client with `getMyCustomInstructions`, `startMyCustomInstructionsCompilation` and `disableMyCustomInstructions`. The safe projection contains source/status only, never compiled recipes. The frontend operations and relevant introspection snapshot entries were checked against production AppSync through a read-only schema export on 2026-10-15; this port does not deploy an Amplify backend change. The existing `utils/randomId.js` supplies secure IDs for supported Android WebViews. Same-text retries reuse their request ID; an uncertain start response reloads persisted server status.

Polling runs every three seconds initially, then every nine seconds after 30 seconds, and pauses with return-later guidance after five minutes. Window focus, native app foreground, and progress-dialog reopen reload persisted status and resume polling. Listener registration/cleanup and overlapping reads are guarded against stale results and unmounts.

The feature is available by default. `REACT_APP_CUSTOM_INSTRUCTIONS_ENABLED=false` (trimmed and case-insensitive) is the emergency opt-out; no direct Lambda URL is required. Unavailable performs no Custom Instructions requests. The existing signature and lifetime-hours cards remain functional independently. This is source enablement, not store publication or installed-device acceptance.

Settings and dialogs retain the existing product colors, typography, focus restoration and bounded scrolling. Coarse-pointer Settings actions and dialog close controls have 48px targets; see `knowledge/development/STYLE.md`. Settings tests can export synthetic editor/success markup to an explicitly supplied `CHIRONOTE_VISUAL_OUTPUT_DIR` for responsive review; fixtures are not production authentication or device evidence.
