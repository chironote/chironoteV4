---
type: integration-architecture
title: "Amplify and Lambda Data Integration"
description: "The authenticated GraphQL records, subscriptions, usage counters, and direct Lambda boundaries used by the client."
resource: "../../src/graphql/queries.js"
tags: [amplify, appsync, graphql, lambda, subscriptions, storage]
---

# Amplify and Lambda Data Integration

`src/index.js` configures Amplify from the generated runtime configuration and
the app creates an Amplify API client. The checked-in generated GraphQL
operations expose owner-scoped `Notes` records with `timestamp`, `transcript`,
`note`, `isCompleted`, and `noteLabel`, plus `UserSubscription` fields for
`hoursleft` and `notesleft`. Queries and mutations use the authenticated owner;
subscriptions deliver note and subscription changes through AppSync.

The recording path obtains the current user and access session, uploads each
audio object through Amplify Storage, then sends a FIFO SQS message containing
the recording identity, object path, language, final marker, access token, and
note settings. After the final chunk, it waits for the owner subscription to
report `isCompleted` and posts to the transcript-to-note Function URL, reading a
text stream. Dictation obtains a short-lived AssemblyAI token from its own
Function URL and uses a browser WebSocket through the AssemblyAI SDK. Smart
Editor posts the clipboard note and edit instruction to a separate Lambda URL
and streams the replacement text.

The authoritative backend schemas and Lambda implementations are outside this
checkout. Generated GraphQL files and the client callers document the current
wire shapes, while endpoint behavior should be verified in their owning
repositories before integration changes.

## Provenance

- [Amplify entry point](../../src/index.js)
- [GraphQL queries](../../src/graphql/queries.js)
- [GraphQL mutations](../../src/graphql/mutations.js)
- [GraphQL subscriptions](../../src/graphql/subscriptions.js)
- [Recording integration](../../src/components/Recording/RecordingManager.jsx)
- [Dictation integration](../../src/components/Recording/Dictation.jsx)
- [Smart Editor integration](../../src/components/EditPanel.jsx)
- [Application context](../../Context.md)

Generated GraphQL files are evidence of the client contract, not a replacement
for the backend schema source.
