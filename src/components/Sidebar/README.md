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

`HistorySidebar` receives notes and UI state from `useNotesHistory` through `MainWorkspace`. Its Refresh control reruns the server fetch so a user can recover a completed note if the realtime subscription did not deliver an update. It is disabled during the request. The sidebar groups items using `groupItemsByWeek`:

```js
return groupItemsByWeek(notes).map(week => (
  <div key={week.weekStart} className="week-group">
    <button className="week-header" onClick={() => onToggleWeek(week.weekStart)}>
      <span className="week-label">Week of {week.weekLabel}</span>
    </button>
  </div>
));
```

It delegates row rendering to `HistoryListItem` and calls parent callbacks for open, drag start, highlight removal, and week collapse. The panel uses one bounded scroll region, a stable desktop width, and a viewport-bounded mobile drawer. A title, supporting label, and note-count badge establish the hierarchy. Notes are grouped into bordered weekly surfaces; each semantic button row shows the note label above `time · weekday · date`, while notes from the current local calendar day use `time · Today`.

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
- Smart Editor mirrors Clipboard's header, toolbar, inset textarea, focus, radius, border, and shadow hierarchy. On constrained desktop widths it retains a `280px` minimum working width.
- Preserve the explicit accessible names on editor controls and its instruction textarea.
