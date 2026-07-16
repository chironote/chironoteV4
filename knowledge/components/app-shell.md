---
type: component-readme
title: "AppShell Components"
description: "Authenticated application shell architecture, state orchestration, and maintenance guidance."
resource: "../../src/components/AppShell/README.md"
tags: [chironote, component, app-shell]
---


> Source: [`README.md`](../../src/components/AppShell/README.md)

# AppShell Components

This folder owns the authenticated application shell: authentication wrapping, main workspace composition, note history state, and app-wide authenticated analytics.

## Files

- `AuthWrapper.jsx` wraps Amplify authentication UI and provides the signed-in app.
- `AuthenticatedApp.jsx` is the main stateful controller for authenticated routes.
- `MainWorkspace.jsx` composes the note history sidebar, clipboard, smart editor, recording popup, dictation popup, and content popup.
- `useNotesHistory.js` fetches recent notes and listens for note updates over GraphQL subscriptions.
- `useUserAnalytics.js` attaches user-level analytics context.
- `ErrorBanner.jsx` renders a global error banner when enabled.

`AuthWrapper` configures Amplify and loads Amplify UI styles, authenticated-app styles, and Material Symbols only after `/app` is requested. Public routes therefore avoid the authenticated bundle and its blocking icon font.

## Main Ownership

`AuthenticatedApp` keeps the high-level UI state for the app, including side panels, selected history item, clipboard text, dictation state, and recording state. It instantiates the recording and dictation controller APIs like hook-style functions:

```js
const recordingManager = RecordingManager({
  onTextStreamUpdate: handleTextStreamUpdate,
  onTransitionToMainApp: handleTransitionToMainApp
});

const dictation = Dictation({
  onTextStreamUpdate: handleTextStreamUpdate,
  setClipboardContent,
  onDictationStart: () => captureDictationInsertion(...),
  onDictationTextUpdate: (newText) => insertDictationText(...),
  username: user.username,
  instanceName: 'Clipboard'
});
```

Clipboard and Smart Editor dictation insert into the target textarea instead of replacing the full field. `AuthenticatedApp` captures immutable text before and after the textarea selection when dictation starts. Each revised AssemblyAI transcript is placed between those snapshots, so interim results cannot consume neighboring note text or jump to an identical phrase elsewhere in the note. The pure snapshot helpers live in `src/utils/dictationInsertion.js`.

`MainWorkspace` is intentionally mostly presentational. It receives structured prop groups such as `sidebar`, `clipboard`, `editPanel`, `recording`, `dictation`, and `contentPopup`.

## Notes History

`useNotesHistory` loads recent records with `listNotes`, filters notes and transcripts, groups history by week, and subscribes to `onUpdateNotesByOwner`:

```js
const subscription = client.graphql({
  query: subscriptions.onUpdateNotesByOwner,
  variables: { owner: username }
}).subscribe({
  next: ({ data }) => {
    const updatedData = data.onUpdateNotesByOwner;
    setNotes(prevNotes => [updatedData, ...prevNotes]);
  }
});
```

It also checks 3-note and 5-note activation milestones and updates `UserSubscription` flags after tracking.

## Maintenance Notes

- Keep business orchestration in `AuthenticatedApp` and rendering layout in `MainWorkspace`.
- Be careful with keyboard shortcuts in `AuthenticatedApp`: `Ctrl+B`, `Ctrl+Backspace`, `Ctrl+\``, and `Escape` are handled globally.
- `useNotesHistory` owns subscription cleanup; always unsubscribe when adding more listeners.

## Provenance

Derived from [`README.md`](../../src/components/AppShell/README.md).

