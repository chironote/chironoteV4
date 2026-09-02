---
type: component-readme
title: "AppShell Components"
description: "Authenticated state, routing, feedback-modal behavior, and Android shell boundaries."
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
- `useNotesHistory.js` fetches recent notes, exposes its established fetch for manual recovery, and listens for note updates over GraphQL subscriptions.
- `useUserAnalytics.js` attaches user-level analytics context.
- `ErrorBanner.jsx` renders a global error banner when enabled.

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

## Authenticated routing

Billing and Settings are the current account surfaces at `/app/billing` and `/app/settings`. `/app/account` redirects to Billing. Feedback is shell-controlled modal state: `/app/feedback` is retained as a compatibility route that opens the modal and replaces the URL with `/app`, preserving the dashboard beneath it. Capacitor continues to redirect `/app/pricingplans` to `/app/billing` and keeps billing actions web-only.

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

On Capacitor, `useNotesHistory` subscribes to native app-state changes through `src/services/nativePlatform.js` and refetches history when the app returns to the foreground. Listener cleanup remains paired with the GraphQL and Hub cleanup.

## Maintenance Notes

- Keep business orchestration in `AuthenticatedApp` and rendering layout in `MainWorkspace`.
- Be careful with keyboard shortcuts in `AuthenticatedApp`: `Ctrl+B`, `Ctrl+Backspace`, `Ctrl+\``, and `Escape` are handled globally.
- Keep Feedback as controlled shell state rather than returning to a separate page route.
- `useNotesHistory` owns subscription cleanup; always unsubscribe when adding more listeners. Manual refresh must reuse its existing fetch path, report failures, and retain any notes already shown.

## Provenance

Derived from [`README.md`](../../src/components/AppShell/README.md), [`useNotesHistory.js`](../../src/components/AppShell/useNotesHistory.js), and [`nativePlatform.js`](../../src/services/nativePlatform.js).

