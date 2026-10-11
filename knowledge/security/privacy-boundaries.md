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

Recording SQS messages still include an access token and selected note settings alongside the audio object identity; that existing backend contract is unchanged by this client work. Native sign-in no longer reads or writes plaintext credentials in localStorage. Startup clears historical saved_email/saved_password keys without reading their values, including when an existing Cognito session survives an upgrade. The form keeps entered values only in React memory and uses standard username/current-password autocomplete. No native iOS Keychain saving implementation or promise is added. Credential cleanup leaves Cognito session storage and unrelated settings alone.

Auth lifecycle logs no longer include authenticated-user or raw error objects. Known sign-in failures use bounded messages; unknown provider errors stay generic. The current session survives Amplify's narrow NetworkError token-refresh failure, matching Android. Other refresh failures or explicit logout remove the clinical view immediately; pending session restoration cannot resurrect a signed-out session. Do not copy live tokens, credentials, audio, notes or patient data into knowledge, logs, fixtures or support output.

Analytics helpers are no-ops in `src/utils/analytics.js`, and the app's logging
is primarily browser-console logging. Any change to auth persistence, direct
Lambda calls, GraphQL ownership, or recording payloads requires a fresh privacy
review across web, iOS, Android, and the owning backend services.

Native PDF caching uses app-private Filesystem metadata. The app privacy manifest declares FileTimestamp reason C617.1 for that narrow container scope and is linked into the Xcode resources. It is not a declaration about all collection/tracking behavior; Mac archive verification remains required.

## Provenance

- [App privacy manifest](../../ios/App/App/PrivacyInfo.xcprivacy)
- [Security documentation](../../security_documentation.md)
- [Technical documentation](../../technical_documentation.md)
- [Legacy credential cleanup](../../src/components/AuthUI/credentialStorage.js)
- [Auth lifecycle tests](../../src/components/AuthUI/AuthContainer.test.jsx)
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
