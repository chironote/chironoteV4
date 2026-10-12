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

Native Clipboard controls share 14px/600 typography, 24px line height, 8px radius
and 44px minimum touch targets across iPhone/iPad and Android. Phone rules below
override control size to 48px when space permits; tablet insets and New Note
width retain their existing layout. Native icons use transparent surfaces with
shared hover and dirty-Save feedback, preserving dictation state styling.

Phone layout means viewport width at most 600px or a positive finite screen
shortest CSS dimension at most 600px. The same classification persists through
landscape; short desktop/tablet viewport height never identifies a phone.
Phones retain the complete green `+ New Note` label, bounded to 120–180px,
followed by Dictate, Copy, Delete, and independent Save for relevant saved notes.
Targets are 44px with 6px gaps below 390px, then 48px with 8px gaps. Smaller
layouts wrap deliberately; redundant dividers are hidden. Smart Editor has no
button, keyboard/toggle access or mounted panel throughout native apps,
including iPads, and in phone web layouts. Native tablet Save is independent
without changing tablet geometry. Desktop web retains grouped Edit/Save behavior.
iOS native toolbar insets and boxed
phone icon surfaces are scoped to match the shared toolbar while other native
styles remain intact. Recording dialog flex rules no longer resize Clipboard.
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
- [Phone classification](../../src/hooks/usePhoneLayout.js)
- [Native presentation overrides](../../src/ios.css)
- [Popup](../../src/components/Sidebar/ContentPopup.jsx)
- [Save](../../src/components/Patients/useClipboardSave.js)
- [Shell](../../src/components/AppShell/AuthenticatedApp.jsx)
- [Native clipboard adapter](../../src/services/nativePlatform.js)
- [Insertion helper](../../src/utils/dictationInsertion.js)
