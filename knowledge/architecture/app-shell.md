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

Recording uses the preserved iOS manager. Its generation/error/saved-note callbacks update the shell. Dictation snapshots selection before capture and applies revised turns with pure insertion helpers. Manual input is rejected during dictation while the selection remains focusable.

## Provenance

- [App routes](../../src/App.jsx)
- [Native auth](../../src/components/AuthUI/AuthContainer.jsx)
- [Auth layout](../../src/components/AuthUI/AuthUI.css)
- [Shell](../../src/components/AppShell/AuthenticatedApp.jsx)
- [Shell ownership](../../src/components/AppShell/README.md)
- [Native account](../../src/components/Account/Account.jsx)

Shared workflow source is prod142383e; native baseline is cap-ios2326d34. This describes the source candidate, not an App Store release.
