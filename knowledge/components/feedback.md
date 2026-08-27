---
type: component-readme
title: "Feedback Components"
description: "Controlled authenticated Feedback modal behavior and safe submission states."
resource: "../../src/components/Feedback/README.md"
tags: [chironote, component, feedback]
---


> Source: [`README.md`](../../src/components/Feedback/README.md)

# Feedback Components

This folder owns the controlled authenticated Feedback modal.

## Files

- `Feedback.jsx` renders the modal form, loads the current user's email, and sends feedback to a Lambda URL through `ProductDialog`.
- `Feedback.css` styles the textarea, buttons, error, and success states.

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
  body: JSON.stringify({ content: message, subject: 'Feedback', userEmail }),
});
```

## Maintenance Notes

- The subject is fixed to `Feedback`; no subject selector is shown.
- The component prevents duplicate submissions, preserves text on failure, and exposes accessible inline error/success states.
- The modal restores focus to its navigation trigger and disables dismissal during a submission.

## Provenance

Derived from [`README.md`](../../src/components/Feedback/README.md).

