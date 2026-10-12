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

## Phone layout

Phones up to 600px use a compact, accessibly labeled New Note plus button and
48px toolbar actions, with Edit/Save adjacent and redundant dividers hidden.
Notes without recognized SOAP headers omit the empty section rail and use
balanced editor gutters. SOAP notes retain the rail while scrolling. Phone
writing text is 16px with 12px padding; saved-note patient/visit labels wrap with
explicit spacing. The unmodified iOS source reproduced the Android-reported
toolbar wrapping and reserved empty gutter in a 375px browser preview, which
justified this shared correction. Synthetic browser checks are not iPhone-device
acceptance or proof of a newly uploaded TestFlight build.

## Provenance

- [Clipboard](../../src/components/Clipboard/Clipboard.jsx)
- [Workspace styling](../../src/App.css)
- [Popup](../../src/components/Sidebar/ContentPopup.jsx)
- [Save](../../src/components/Patients/useClipboardSave.js)
- [Shell](../../src/components/AppShell/AuthenticatedApp.jsx)
- [Native clipboard adapter](../../src/services/nativePlatform.js)
- [Insertion helper](../../src/utils/dictationInsertion.js)
