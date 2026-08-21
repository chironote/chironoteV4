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
- `MobileHistoryToggle.jsx` renders mobile controls and drag/drop overlay behavior for the history panel.
- `ContentPopup.jsx` displays a selected note or transcript, copy/send actions, view switching, and label editing.
- `ContentPopup.css` styles the content popup.
- `EditPanel.jsx` renders the Smart Editor and streams AI edits back into the clipboard.
- `TogglePanel.jsx` is a small toggle control for note/transcript display state.

## History Sidebar

`HistorySidebar` receives notes and UI state from `useNotesHistory` through `MainWorkspace`. It groups items using `groupItemsByWeek`:

```js
return groupItemsByWeek(notes).map(week => (
  <div key={week.weekStart} className="week-group">
    <div className="week-header" onClick={() => onToggleWeek(week.weekStart)}>
      <span className="week-label">Week of {week.weekLabel}</span>
    </div>
  </div>
));
```

It delegates row rendering to `HistoryListItem` and calls parent callbacks for open, drag start, highlight removal, and week collapse. History rows use a compact, flat two-line layout: the note label is followed by `time | weekday | date`, while notes from the current local calendar day use `time | Today`. Thin dividers separate rows, and week headers remain collapsible separators so the existing weekly organization stays easy to scan while scrolling.

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

`ContentPopup` is opened from a history item and receives all selected content from `AuthenticatedApp`. It is responsible for viewing/copying/sending selected note content, switching note/transcript view, and updating labels through parent callbacks.

## Maintenance Notes

- This folder shares styling with the main app CSS, not just `ContentPopup.css`.
- `EditPanel` has its own dictation controls passed in from `AuthenticatedApp`; its textarea ref is also passed up so dictation can insert at the editor cursor and show the green live insertion caret.
- `EditPanel` currently contains a direct Lambda URL and GraphQL subscription accounting logic; coordinate backend changes carefully.
- Smart Editor is Clipboard's visual sibling and retains a `280px` constrained-desktop minimum so its primary action and instruction surface remain usable.
- Its controls and textarea expose accessible names while preserving native streaming, credit, and dictation behavior.

## Provenance

Derived from [`README.md`](../../src/components/Sidebar/README.md).

