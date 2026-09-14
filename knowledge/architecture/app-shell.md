---
type: application-architecture
title: "Authenticated App Shell"
description: "How the React SPA routes authentication, the authenticated workspace, history state, recording, dictation, and panel interactions."
resource: "../../src/App.jsx"
tags: [react, routing, authentication, workspace, state]
---

# Authenticated App Shell

The app is a React single-page application wrapped in a Capacitor shell. The
outer router redirects `/` to `/app`; `/app/*` enters `AuthContainer`, which
checks the current Cognito user and renders either the custom sign-in form or
the authenticated application. Inside the protected app, `/` is the main
workspace and `/account` and `/feedback` render their dedicated views.

`AuthenticatedApp` owns the central clipboard text, note and transcript history,
selected history item, recording and dictation state, edit panel, popups, and
responsive left/right panel state. It loads up to 120 records through the
owner-scoped `listNotes` query, keeps the first 100 non-empty notes and
transcripts, groups them by week, and refreshes on document visibility and native
app resume. An owner-scoped `onUpdateNotesByOwner` subscription prepends updated
records and marks them as new.

Recording and dictation are separate controllers. `RecordingManager` uploads
audio through the existing transcription queue and then streams generated notes;
`Dictation` writes live speech text directly into the clipboard. The app shell
passes their state into the clipboard toolbar and disables conflicting controls
while capture or generation is active.

## Provenance

- [App shell](../../src/App.jsx)
- [Auth container](../../src/components/AuthUI/AuthContainer.jsx)
- [Sign-in form](../../src/components/AuthUI/SignInForm.jsx)
- [Recording manager](../../src/components/Recording/RecordingManager.jsx)
- [Dictation controller](../../src/components/Recording/Dictation.jsx)
- [History toggle](../../src/components/TogglePanel.jsx)
- [Application context](../../Context.md)

The current React source is the strongest evidence for routing and state behavior;
the older context document is retained as supporting architecture history.
