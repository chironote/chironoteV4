---
type: component-readme
title: "Sidebar Components"
description: "History sidebar, content popup, and Smart Editor behavior and maintenance guidance."
resource: "../../src/components/Sidebar/README.md"
tags: [chironote, component, sidebar]
---


> Source: [`README.md`](../../src/components/Sidebar/README.md)

# Sidebar Components

This folder owns the note-history sidebar, mobile history toggle, content popup, and smart editor panel.

## Files

- `HistorySidebar.jsx` groups recent notes by week and renders the history panel.
- `HistoryListItem.jsx` renders an individual history item.
- `MobileHistoryToggle.jsx` renders the labeled mobile open/close button and drag/drop overlay behavior for the history panel.
- `ContentPopup.jsx` displays a selected note or transcript, copy/send actions, view switching, and label editing.
- `ContentPopup.css` styles the content popup.
- `EditPanel.jsx` renders the Smart Editor and streams AI edits back into the clipboard.
- `TogglePanel.jsx` is a small toggle control for note/transcript display state.

## History Sidebar

`HistorySidebar` receives notes and UI state from `useNotesHistory` through `MainWorkspace`. It groups items using `groupItemsByWeek`:

```js
return groupItemsByWeek(notes).map(week => (
  <div key={week.weekStart} className="week-group">
    <button className="week-header" onClick={() => onToggleWeek(week.weekStart)}>
      <span className="week-label">Week of {week.weekLabel}</span>
    </button>
  </div>
));
```

It delegates row rendering to `HistoryListItem` and calls parent callbacks for open, drag start, highlight removal, and week collapse. The panel uses one bounded scroll region, a stable desktop width, and a viewport-bounded mobile drawer. The header shows the title, supporting label and Refresh control, without a note-count badge. Notes are grouped into bordered weekly surfaces; each semantic button row shows the note label above `time · weekday · date`, while notes from the current local calendar day use `time · Today`.

Patient-aware history is controlled by `REACT_APP_PATIENT_NOTES_ENABLED`: when enabled, rows show the canonical patient name above the visit label (falling back to the note label or note text), and history search is available. The flag-off view hides patient names/search while retaining legacy history. Production and development defaults enable this flag as of October 21; build-time overrides and the artifact actually published determine the visible behavior. See [website release](../operations/website-release.md).

## Smart Editor

`EditPanel` accepts the current clipboard note plus editor instructions, then sends both to an edit Lambda:

```js
body: JSON.stringify({
  noteInput: clipboardContent,
  editInput: editInput
})
```

The response is streamed with `response.body.getReader()` and each chunk is forwarded through `onTextStreamUpdate(newText)` so the clipboard updates progressively.

Before editing, it checks the user's subscription and decrements `notesleft` after a successful edit.

## Content Popup

`ContentPopup` is opened from a history item and receives all selected content from `AuthenticatedApp`. It is responsible for viewing/copying/sending selected note content, switching note/transcript view, and updating labels through parent callbacks. Its Subjective, Objective, Assessment, Plan, and Treatment headers are clickable copy controls with success, empty, and failure feedback.

## Maintenance Notes

- This folder shares styling with the main app CSS, not just `ContentPopup.css`.
- `EditPanel` has its own dictation controls passed in from `AuthenticatedApp`; its textarea ref is also passed up so dictation can insert at the editor cursor and show the green live insertion caret.
- `EditPanel` currently contains a direct Lambda URL and GraphQL subscription accounting logic; coordinate backend changes carefully.
- Smart Editor is Clipboard's visual sibling and retains a `280px` constrained-desktop minimum so its primary action and instruction surface remain usable.
- Its controls and textarea expose accessible names while preserving streaming, credit, and dictation behavior.

## Visual Style Reference

Follow [Recent Notes and dense navigation](../development/STYLE.md#recent-notes-and-dense-navigation) for the panel's exact sizing, spacing, grouping, row, metadata, responsive-drawer, and interaction rules. Shared editor and popup work also follows [Panels, editors, and long-form text](../development/STYLE.md#panels-editors-and-long-form-text) and [Dialogs, drawers, menus, and overlays](../development/STYLE.md#dialogs-drawers-menus-and-overlays).

## Frontend correction — 2026-10-11

History always uses its original ContentPopup, including View Transcript / View Note for both legacy and patient-linked notes. The current patient name (or Unassigned) above the label is clickable and opens the compact ReassignPatientDialog. Profile, visit and diagnosis editing stay in the Patients route. Rename uses the existing noteLabel mutation and clears local visitLabel in the same way as its resolver.

## Provenance

Derived from [README.md](../../src/components/Sidebar/README.md).


The patient name in ContentPopup opens ReassignPatientDialog after the draft guard. Re-Assign performs an owner-verified, versioned association update; Cancel writes nothing. The modal is a sibling of the popup to avoid backdrop click dismissal. The parent updates the selected item and history after success. Clinical text remains viewed/copied here, with editing in the clipboard. Source: `../../src/components/Sidebar/ContentPopup.jsx`, `../../src/components/Patients/ReassignPatientDialog.jsx`.

The descriptor label itself is a keyboard-accessible edit button with a subtle pencil to its right. Enter or blur saves; Escape cancels without dismissing the popup. The separate Rename button is retired.

History drags carry a timestamp-only saved-note format alongside plain note text for external destinations. Both internal clipboard drop surfaces retrieve the current saved record and use the Patients clipboard-opening guard. The semantic History button and popup Send to Clipboard remain the keyboard alternative. Source: [History drag payload](../../src/components/Sidebar/HistoryListItem.jsx) and [shell drop targets](../../src/components/AppShell/AuthenticatedApp.jsx).


## Copy cleanup policy — 2026-10-15

Copy actions preserve list prefixes, numbering, blockquote markers, horizontal rules, and literal asterisks/underscores. They remove heading markers and paired bold, italic, strikethrough and inline-code delimiters; links retain visible text without URLs, and outer whitespace is trimmed. Whole-note HTML extraction and SOAP section-body selection remain in place. Copy uses `src/utils/copyText.js`; generated text, display cleanup and history-to-clipboard loading retain their existing `stripMarkdown`/`extractPlainText` behavior. Fenced-code handling retains the legacy cleanup behavior. These copy rules cannot restore markers already removed by the existing display cleanup. Source integration does not publish the website or extension.
