---
type: application-architecture
title: "Authenticated App Shell"
description: "Native authentication, guarded routes and central clinical workspace ownership."
resource: "../../src/components/AppShell/AuthenticatedApp.jsx"
tags: [react, routing, authentication, workspace]
---

# Authenticated App Shell

App routes use a data router and DraftRouteGuard, retaining the existing native sign-in presentation. AuthContainer purges obsolete plaintext credential keys on startup, preserves transient NetworkError refresh failures and invalidates stale session reads after logout. Sign-out removes the clinical view immediately; provider cleanup completes before the form reopens. The authenticated workspace remounts on principal changes. AppShell owns clipboard identity/version, in-memory drafts, recording, dictation and popup state. Patients and saved-history/popup actions open authoritative getSavedNote results through the same guard. Save/Discard/Keep editing protects route changes, sign-out and replacement operations.

Home is omitted on /app, followed by Patients, Billing and Settings with Logout last. Billing remains the native Account usage view; account/pricingplans redirect to it. No web checkout or marketing/user analytics is imported. Feedback is a controlled modal. The native analytics module remains a no-op.

The unauthenticated container/card use border-box sizing and allow the card to shrink within narrow viewports, preserving its existing appearance without horizontal overflow from padding. Offline production-bootstrap viewport checks are distinct from native device or live authentication validation.

Recording uses the preserved iOS manager. Its generation/error/saved-note callbacks update the shell. Pending audio has a small submission status/Retry control and requires the app to remain open. Record next appointment releases the waiting presentation without cancelling earlier work. Completion callbacks are recording-scoped: an earlier authoritative saved note refreshes history but does not replace the newer recording's clipboard or close its controls. Dictation snapshots selection before capture and applies revised turns with pure insertion helpers. Manual input is rejected during dictation while the selection remains focusable.

The shell also detaches the prior recording's presentation when opening fresh capture settings, covering the interval before B actually starts. Capture-specific credit responses cannot discard a later recording; startup and final microphone flush expose their existing busy state separately from the upload backlog. NoSleep ownership follows the successfully started capture independently of popup/clipboard visibility.

The shared phone classification checks viewport width or valid screen shortest CSS dimension at 600px, listening for resize and orientation changes. Smart Editor availability is separate from layout: it is unavailable throughout native apps (phones and tablets) and in phone web layouts. The shell rejects toggle/Ctrl+B using fresh native/phone checks and closes existing open state when unavailable while preserving edit text. MainWorkspace never mounts EditPanel when unavailable. Clipboard Save remains governed by the native saved-note workflow independently of editor access. Desktop web retains Smart Editor behavior; tablet geometry is not classified as phone merely to hide the editor.

The shell passes native presentation classification independently of phone
layout, allowing Clipboard controls to share native typography and minimum
touch sizes while preserving tablet layout.

## Provenance

- [App routes](../../src/App.jsx)
- [Native auth](../../src/components/AuthUI/AuthContainer.jsx)
- [Auth layout](../../src/components/AuthUI/AuthUI.css)
- [Shell](../../src/components/AppShell/AuthenticatedApp.jsx)
- [Shell ownership](../../src/components/AppShell/README.md)
- [Phone classification](../../src/hooks/usePhoneLayout.js)
- [Workspace composition](../../src/components/AppShell/MainWorkspace.jsx)
- [Native account](../../src/components/Account/Account.jsx)

Shared workflow source is prod142383e; native baseline is cap-ios2326d34. This describes the source candidate, not an App Store release.
