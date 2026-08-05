---
type: product-concept
title: "User Feedback"
description: "Authenticated feedback modal behavior, accessibility, and submission contract."
resource: "../../src/components/Feedback/Feedback.jsx"
tags: [chironote, component, feedback, dialog]
---

# User Feedback

Feedback is a controlled authenticated modal, not a visible page destination. Navbar renders a semantic button so opening Feedback preserves the current route and mounted page. The shared Product Dialog supplies modal semantics, focus containment/restoration, body scroll lock, Escape/scrim dismissal, and responsive viewport containment. Dismissal is blocked while submission is active.

The form loads the authenticated email through Amplify Auth, requires a visible Feedback textarea, prevents duplicate submission, and posts the existing endpoint payload `{ content, subject: "Feedback", userEmail }`. Subject selection has been removed. Failures appear inline and retain the message. Confirmed success clears the message and shows an accessible confirmation with an explicit Close action.

Legacy `/app/feedback` redirects to `/app` and opens this modal.

## Provenance

Derived from [`Feedback.jsx`](../../src/components/Feedback/Feedback.jsx), [`ProductDialog.jsx`](../../src/components/Dialog/ProductDialog.jsx), and [`AuthenticatedApp.jsx`](../../src/components/AppShell/AuthenticatedApp.jsx).
