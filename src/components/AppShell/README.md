# AppShell Components

This folder owns the authenticated application shell: authentication wrapping, main workspace composition, authenticated routing, feedback-modal state, note history state, and app-wide authenticated analytics.

## Files

- `AuthWrapper.jsx` wraps Amplify authentication UI and provides the signed-in app.
- `AuthenticatedApp.jsx` is the main stateful controller for authenticated routes.
- `MainWorkspace.jsx` composes the note history sidebar, clipboard, smart editor, recording popup, dictation popup, and content popup.
- `useNotesHistory.js` fetches recent notes and listens for note updates over GraphQL subscriptions.
- `useUserAnalytics.js` attaches user-level analytics context.
- `ErrorBanner.jsx` renders a global error banner when enabled.

`AuthWrapper` configures Amplify and loads Amplify UI styles, authenticated-app styles, and the Material Symbols stylesheet only when `/app` mounts. Public marketing pages therefore do not download the authenticated application or its icon font. It also reads `initialState` and `prefillEmail` query parameters to select and prefill the Amplify authentication form, then removes those parameters from the visible URL.

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

Authenticated routes include `/billing`, `/settings`, and `/pricingplans`. `/account` redirects with replacement to `/app/billing`. `/feedback` is a compatibility deep link that redirects to the dashboard and opens the controlled Feedback modal. The modal lives outside the route switch so opening it from navigation keeps the current page mounted.

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
- Keep Feedback as shell state rather than a routed page so it overlays the current authenticated destination.
- `useNotesHistory` owns subscription cleanup; always unsubscribe when adding more listeners.
