---
type: component-behavior
title: "Recent History Refresh"
description: "How the note and transcript history loads, receives realtime updates, and recovers from missed subscription events."
resource: "../../src/App.jsx"
tags: [history, notes, transcripts, graphql, refresh, subscriptions]
---

# Recent History Refresh

`AuthenticatedApp` keeps separate note and transcript histories for the authenticated owner. Its shared `fetchNotes` operation queries `listNotes` in descending timestamp order, requests 120 records, filters non-empty note and transcript fields, and retains the newest 100 of each type. The same operation initializes the view, runs when the app becomes active again, and handles a user-initiated refresh.

The History Panel exposes **Refresh recent history** as a recovery action. It disables while the query is running and announces the loading state. A failed manual request preserves the visible history, shows the existing service-disruption banner, and adds an in-panel error asking the user to retry.

`onUpdateNotesByOwner` remains the normal realtime path: it prepends a changed note or transcript and marks it as new. The manual refresh does not alter backend APIs or replace that subscription; it is available when a subscription update was missed.

## Provenance

- `src/App.jsx` (history state, GraphQL query, resume refresh, and subscription behavior)
- `src/components/TogglePanel.jsx` (visible manual refresh control and accessible status/error messaging)
- `src/AppFileContext.md` (component-level behavior documentation)
