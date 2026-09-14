---
type: privacy-and-security
title: "Clinical Data and Credential Boundaries"
description: "Where audio, transcripts, notes, authentication state, and service tokens move in the current client implementation."
resource: "../../security_documentation.md"
tags: [privacy, phi, authentication, credentials, microphone]
---

# Clinical Data and Credential Boundaries

The repository treats recorded audio, transcripts, dictation text, and note edits
as protected clinical data. The client gates the main workspace behind Cognito
authentication, uses owner-scoped GraphQL queries and subscriptions, obtains
short-lived authenticated session material for uploads, and sends data over the
configured HTTPS/AWS service boundaries. The security and technical documents
describe encryption, access control, and monitoring as system expectations; the
backend source and live account policy are not present in this checkout.

The current client implementation has two handling details that must remain part
of any security review. Recording SQS messages include an access token and
selected note settings alongside the audio object identity. On native platforms,
`SignInForm` stores the email and password in localStorage when “Remember me” is
selected. These are source-observed behaviors, not claims that the values are
safe for every deployment. Do not copy live tokens, credentials, audio, notes,
or patient data into repository knowledge, logs, fixtures, or support output.

Analytics helpers are no-ops in `src/utils/analytics.js`, and the app's logging
is primarily browser-console logging. Any change to auth persistence, direct
Lambda calls, GraphQL ownership, or recording payloads requires a fresh privacy
review across web, iOS, Android, and the owning backend services.

## Provenance

- [Security documentation](../../security_documentation.md)
- [Technical documentation](../../technical_documentation.md)
- [Sign-in form](../../src/components/AuthUI/SignInForm.jsx)
- [Auth container](../../src/components/AuthUI/AuthContainer.jsx)
- [Recording manager](../../src/components/Recording/RecordingManager.jsx)
- [Dictation controller](../../src/components/Recording/Dictation.jsx)
- [Analytics stubs](../../src/utils/analytics.js)
- [GraphQL queries](../../src/graphql/queries.js)
- [GraphQL subscriptions](../../src/graphql/subscriptions.js)

The source implementation wins over broad compliance statements when describing
what this checkout actually does. No secret values or clinical records are
included here.
