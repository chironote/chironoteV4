# Settings Components

`Settings.jsx` displays the server-backed `hoursSavedLifetime` metric and the feature-flagged Custom Instructions experience. It does not display current-period `hoursSaved` or any generated SOATP prompt fields.

Custom Instructions uses `ProductDialog`, edits only the original natural-language instructions, protects dirty text, blocks dismissal and duplicate submission during apply, provides approximate elapsed-time stages, and waits for server confirmation before reporting Enabled. Reset requires confirmation and preserves the prior state on failure.

Networking is isolated in `src/services/customInstructions.js`. The feature requires both `REACT_APP_CUSTOM_INSTRUCTIONS_ENABLED=true` and `REACT_APP_CUSTOM_INSTRUCTIONS_URL`; otherwise this card renders a distinct non-interactive Unavailable state while the rest of Settings remains functional.
