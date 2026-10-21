# AppShell Components

This folder owns the authenticated application shell: authentication wrapping, main workspace composition, authenticated routes, feedback-modal state, note history state, and app-wide authenticated analytics.

## Files

- `AuthWrapper.jsx` wraps Amplify authentication UI and provides the signed-in app.
- `AuthenticatedApp.jsx` is the main stateful controller for authenticated routes.
- `MainWorkspace.jsx` composes the note history sidebar, clipboard, smart editor, recording popup, dictation popup, and content popup.
- `useNotesHistory.js` fetches recent notes, exposes that fetch for manual recovery, and listens for note updates over GraphQL subscriptions.
- `useUserAnalytics.js` attaches user-level analytics context.
- `ErrorBanner.jsx` renders a global error banner when enabled.

## Main Ownership

Recording status exposes memory-only pending audio and Retry audio. The preparing/generating popup offers Continue in background, permitting another appointment. RecordingManager gates foreground text, saved-note selection, busy state and popup callbacks by recording ownership; earlier sessions still generate normally and report saved completion in Recent Notes without replacing a newer clipboard. These controls do not imply durable local audio storage. Existing history refresh remains the recovery path for a missed history subscription update.

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

## Authenticated routes

`/billing` and `/settings` are the current account surfaces. `/account` is a replacement redirect to `/app/billing`, while `/feedback` opens the controlled Feedback modal and redirects to the dashboard so the current workspace is preserved underneath it. On Capacitor, `/pricingplans` redirects to `/app/billing`; native billing remains usage-only.

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

On Capacitor, `useNotesHistory` subscribes to native app-state changes through `src/services/nativePlatform.js` and refetches history when the app returns to the foreground. Keep the listener cleanup paired with the GraphQL and Hub cleanup.

## Maintenance Notes

- Keep business orchestration in `AuthenticatedApp` and rendering layout in `MainWorkspace`.
- Be careful with keyboard shortcuts in `AuthenticatedApp`: `Ctrl+B`, `Ctrl+Backspace`, `Ctrl+\``, and `Escape` are handled globally.
- Keep Feedback as shell state rather than a routed page so it overlays the current authenticated destination.
- `useNotesHistory` owns subscription cleanup; always unsubscribe when adding more listeners. Keep manual history refresh on its established fetch path, and preserve visible notes when that fetch fails.

## Patient notes integration

`AuthenticatedApp` keys the clinical workspace by the authenticated principal so account changes discard in-memory patient and note state. Patients visits and saved-note drops fetch the authoritative saved record before opening the single clipboard editor. Identity/version/body are bound together; explicit diagnosis corrections require confirmation, and conflicts preserve the draft. Installed Android phones support Save. The app's data router mounts `DraftRouteGuard` for navigation/back transitions, and sign-out/new-note/history actions use the same memory-only guard. Recording callbacks bind Save only after a durable saved result. `MainWorkspace` preserves the microphone-start cancellation state. History pagination skips deleted records and retains native foreground refresh and retryable error display. Native pricing redirects and clipboard adapters remain intact.

## Phone Clipboard access

`src/hooks/usePhoneLayout.js` supplies the same orientation-stable predicate to shell actions and `MainWorkspace`. Smart Editor availability requires desktop web: installed Android phones and tablets, plus phone web layouts, exclude its button and panel and reject direct toggle and Ctrl+B. Losing availability closes stale editor state while preserving its draft. Phone detection controls geometry independently from native editor availability. Clipboard Save remains governed by saved-note identity and existing draft/review guards. The root `clipboard-phone-layout` class applies the shared toolbar geometry in portrait and landscape. History shortcuts retain their existing behavior.

### Recovered saved results

Per-timestamp sessions and foreground ownership remain in place; a background
recovery cannot replace the current clipboard. The foreground application installs
the exact saved body/version as its clean editable baseline. Opening another
Patients visit is held while generation owns the clipboard, matching history drops.

Saved completion resets the raw body and version together; preview Markdown formatting never defines the persisted edit baseline.
