# Settings Components

`Settings.jsx` displays the server-backed `hoursSavedLifetime` metric and owns the feature-flagged Custom Instructions card, persisted-state loading, focus refresh, and job-aware polling. It does not display current-period `hoursSaved` or any generated SOATP prompt fields.

`CustomInstructionsDialog.jsx` uses `ProductDialog`, edits only the original natural-language source, protects dirty text, blocks dismissal and duplicate submission during the initial deliberate compile period, and labels progress messages as approximate. The user can leave after roughly 30 seconds, but success appears only after AppSync reports `READY` for the server's current job. Disabled and failed profiles retain the saved source text.

Networking is isolated in `src/services/customInstructions.js`. It uses the authenticated Amplify GraphQL client for `getMyCustomInstructions`, `startMyCustomInstructionsCompilation`, and `disableMyCustomInstructions`; no direct Lambda URL or browser-held compile request is used. Polling runs about every three seconds for 30 seconds, then every nine seconds, pauses with honest return-later guidance after five minutes, and resumes from persisted server state on window focus.

The only browser configuration is `REACT_APP_CUSTOM_INSTRUCTIONS_ENABLED=true`. When it is off, the card renders a distinct non-interactive Unavailable state while the rest of Settings remains functional. The backend schema/resolvers must exist before the flag is enabled in an environment.
