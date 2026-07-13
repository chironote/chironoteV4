---
type: component-readme
title: "Feedback Components"
description: "Authenticated feedback form behavior and backend submission details."
resource: "../../src/components/Feedback/README.md"
tags: [chironote, component, feedback]
---


> Source: [`README.md`](../../src/components/Feedback/README.md)

# Feedback Components

This folder owns the authenticated feedback form.

## Files

- `Feedback.jsx` renders the form, loads the current user's email, and sends feedback to a Lambda URL.
- `Feedback.css` styles the form layout, select, textarea, submit button, and success state.

## Important Code

The user's email is fetched from Amplify Auth attributes:

```js
const attributes = await fetchUserAttributes();
setUserEmail(attributes.email);
```

Submissions are posted to the feedback Lambda:

```js
await fetch('https://xmryti2hkkvg5tosvv3p6lehsa0lysic.lambda-url.us-east-2.on.aws/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ content: message, subject, userEmail }),
});
```

## Maintenance Notes

- `subject` is one of `Feedback`, `Report Problem`, or `Question`.
- The component prevents duplicate submissions with `isSubmitting`.
- Failed submissions currently use `alert`; consider a styled error state if expanding the form.

## Provenance

Derived from [`README.md`](../../src/components/Feedback/README.md).

