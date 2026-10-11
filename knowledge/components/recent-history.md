---
type: component-behavior
title: "Recent History Refresh"
description: "Owner history, paginated recovery, realtime updates and native foreground refresh."
resource: "../../src/components/AppShell/useNotesHistory.js"
tags: [history, notes, refresh, subscriptions]
---

# Recent History Refresh

useNotesHistory requests owner-scoped listNotes pages in descending order, omits deleted markers and retains up to 100 non-empty notes. Recent Notes has no count badge. Patient directory names are resolved separately from visit labels. Current popup retains both note and transcript views.

The subscription updates history without clinical payload logging or activation-milestone writes. Manual refresh, document visibility and Capacitor foreground re-query history. Older fetch completions and post-unmount fetches are ignored. Refresh failure preserves existing items and exposes an inline retry error. Native listener registration handles unmount before async registration finishes.

## Provenance

- [History hook](../../src/components/AppShell/useNotesHistory.js)
- [Sidebar](../../src/components/Sidebar/HistorySidebar.jsx)
- [History rows](../../src/components/Sidebar/HistoryListItem.jsx)
