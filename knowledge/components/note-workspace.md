---
type: user-workspace-component
title: "Note Workspace and Section Actions"
description: "How clipboard editing, history popups, section copy controls, streaming text, and note labels behave in the V4 client."
resource: "../../src/components/Clipboard.jsx"
tags: [clipboard, notes, transcripts, editing, copy, sections]
---

# Note Workspace and Section Actions

The central clipboard is a controlled textarea. It accepts manual edits and
drag-and-drop text, receives recording and dictation streams, and exposes copy
controls for the hard-coded `Subjective:`, `Objective:`, `Assessment:`, and
`Plan:` headers. The buttons locate headers with string searches and position
themselves from a hidden measuring element; they copy only the text between the
current and next recognized header. The main app and history popup use the
Capacitor Clipboard plugin on native platforms and the browser clipboard API on
the web, after converting HTML-like content to plain text.

History items open in `ContentPopup`, where the same four literal headers are
made clickable for section copy. A note label can be renamed through
`updateNotes`; the app updates local state immediately and shows an alert if the
backend write fails, so a visible rename can be locally ahead of persistence.
The popup can copy all content and send selected content back to the clipboard.

Smart Editor accepts natural-language edit instructions, sends `noteInput` and
`editInput` to its dedicated Lambda URL, streams returned text into the main
clipboard, and decrements the authenticated subscription's `notesleft` after
completion. It does not save the resulting clipboard text through the notes
mutation in this checkout. Existing saved notes are loaded and updated through
GraphQL history operations.

## Provenance

- [Clipboard](../../src/components/Clipboard.jsx)
- [Content popup](../../src/components/ContentPopup.jsx)
- [Smart Editor](../../src/components/EditPanel.jsx)
- [App state](../../src/App.jsx)
- [Clipboard toolbar](../../src/components/ClipboardButtons.jsx)
- [GraphQL mutations](../../src/graphql/mutations.js)

The section grammar is an observed legacy client convention. It is not a
general parser for arbitrary headings.
