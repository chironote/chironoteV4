# Sidebar Components

Patient names are verified directory values, separate from editable descriptor labels. The original note/transcript popup remains; clicking its patient opens compact Re-Assign/Cancel with destination-code copying and explicit zero-visit source-deletion acknowledgment. Saved-note drag payloads carry exact timestamps for authoritative clipboard loading. Recent Notes has no count badge. Refresh errors and already loaded rows remain visible during refresh. Native copy uses the shared adapter.

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

It delegates row rendering to `HistoryListItem` and calls parent callbacks for open, drag start, highlight removal, and week collapse. The panel uses one bounded scroll region, a stable desktop width, and a viewport-bounded mobile drawer. A title, supporting label and accessible Refresh action establish the hierarchy, without a count badge. Refresh reuses `useNotesHistory`'s existing server fetch so users can recover a note missed by a realtime subscription; it disables while loading and announces a retryable fetch error without clearing already displayed notes. Notes are grouped into bordered weekly surfaces; each semantic button row shows the note label above `time · weekday · date`, while notes from the current local calendar day use `time · Today`.

## Smart Editor

Smart Editor is available only on desktop web. Installed Android phones and tablets, plus phone web layouts in either orientation, omit its control and panel; shell guards also reject direct toggles and Ctrl+B. Saved-note editing and Save remain in Clipboard.

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
- Smart Editor mirrors Clipboard's header, toolbar, inset textarea, focus, radius, border, and shadow hierarchy. On constrained desktop widths it retains a `280px` minimum working width.
- Preserve the explicit accessible names on editor controls and its instruction textarea.

## Patient notes integration

Patient-enabled rows show the current verified directory name above `visitLabel`, falling back to the untouched legacy `noteLabel` caption. Unassigned notes use Name Unknown. Search includes the resolved name and caption/body. Patient identity never comes from parsing a label. Selection flows through the shell so draft guards run before changing the active note; patient-aware saved-note viewing and metadata controls belong to `Patients`.
