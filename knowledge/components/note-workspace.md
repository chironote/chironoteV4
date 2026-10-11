---
type: user-workspace-component
title: "Note Workspace and Section Actions"
description: "Shared clipboard identity, editing, native copy, history reassignment and save review."
resource: "../../src/components/Clipboard/Clipboard.jsx"
tags: [clipboard, editing, copy, patients]
---

# Note Workspace and Section Actions

The main clipboard is the only clinical editor. Patients visits, source links, saved-note drops and popup send-to-clipboard retrieve exact saved identity/version and pass draft guards. Native Capacitor phones/tablets and fine-pointer desktop can Save; browser-mobile remains local editing. Save conflicts retain the draft. Explicit Assessment code changes require full code/description confirmation, with no internal status selectors. Smart Editor updates this same draft and does not independently persist it.

Whole-note and recognized S/O/A/P/T section copies use nativePlatform (Capacitor Clipboard on native, browser API on web). Revised dictation text preserves the immutable before/after selection snapshot. Clinical drafts remain memory-only.

History uses ContentPopup for note/transcript reading. Current patient name opens compact Re-Assign/Cancel. The separate descriptor label has a pencil edit affordance; rename uses the existing GraphQL resolver and warns if only the local change succeeded. Reassignment requires destructive empty-source acknowledgment when applicable and updates a matching clean clipboard to the returned version. Explicit patient deletion clears linked workspace state.

## Provenance

- [Clipboard](../../src/components/Clipboard/Clipboard.jsx)
- [Popup](../../src/components/Sidebar/ContentPopup.jsx)
- [Save](../../src/components/Patients/useClipboardSave.js)
- [Shell](../../src/components/AppShell/AuthenticatedApp.jsx)
- [Native clipboard adapter](../../src/services/nativePlatform.js)
- [Insertion helper](../../src/utils/dictationInsertion.js)
