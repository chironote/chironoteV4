---
type: operations-runbook
title: "PHI-safe Recording Correlation and Telemetry"
description: "Versioned recording event contract, privacy boundary, support timeline query, retention, access, delivery behavior, alarms, and backend integration gates."
resource: "../../src/components/Recording/recordingTelemetrySchema.js"
tags: [recording, telemetry, correlation, privacy, support, operations]
---

# PHI-safe Recording Correlation and Telemetry

Every conversation recording receives one opaque RFC 4122 version 4 `recordingJobId` before microphone capture. The same identifier is the upload-session id, S3 metadata value, SQS FIFO group id, transcription request field, note-generation request field, AppSync status field, and telemetry timeline partition key. It is random and carries no user, patient, timestamp, or clinical meaning.

This repository contains the web producer, GraphQL source schema, retention override, event validator, tests, and support runbook. It does **not** contain the deployed audio-transcription or transcript-to-note Lambdas. Until the integration and release gates below are completed, the timeline ends at SQS acceptance and resumes with client-observed AppSync/note-generation outcomes; it is not yet an operationally complete backend timeline.

## Contract and Ordering

- Schema version: `1.0`.
- Retention target: 30 days from `occurredAt`.
- Partition key: `recordingJobId`.
- Ordered sort key: server ingestion/occurrence time plus producer source/sequence and the server-normalized id, stored as `timelineKey`.
- `producerOccurredAt` preserves the producer-reported event time so support can recognize delayed reconnect batches. It is operational context, not an authoritative security timestamp; `occurredAt`, ordering keys, and expiry remain server-controlled.
- Required producer context: `schemaVersion`, originating `appBuild`/`platform`/`browser`, and the current producer `source`; the originating context travels through S3, SQS, and note-generation requests.
- `sequence` is monotonic within a producer's job stream. Cross-service order comes from `timelineKey` occurrence time plus stage causality; independent producers may reuse a sequence value.
- Client identifier generation requires Web Crypto. There is no timestamp, user-id, or `Math.random()` fallback.
- The ingestion resolver validates the entire input allowlist and the exact non-sensitive shape of generated client fields, replaces client `id`, `occurredAt`, `timelineKey`, and `expiresAt` with server-authoritative values, and uses a deterministic job/source/client-event id so an ambiguous retry is idempotent.
- User-pool writes are restricted to the `client.*` source matching their declared Web/Android/iOS platform and to client-observable event names; IAM writes are restricted to `lambda.*` or `backend.*`. This prevents a browser principal from claiming backend-only alert, notification, quarantine, or deletion evidence.
- Consumers must accept unknown schema-safe fields. Producers ignore unknown safe payload fields and reject unknown event names, invalid known-field values, and privacy-sensitive fields.
- A producer adding an event name or persisted field must update the source schema, validator, event dictionary, and tests together. Increment the major schema version for an incompatible meaning or type change.

The client sends authenticated AppSync mutations independently of recording. It buffers at most 100 events, normally batches 10 after 750 ms, retries after 250 ms, 1 second, and 3 seconds, then cools down for 30 seconds. `online`, terminal events, and `pagehide` force a keepalive flush. Delivery never awaits or blocks microphone capture, upload, SQS dispatch, or note generation.

When the bounded buffer drops entries it records `telemetry.buffer_overflow` with the cumulative dropped count even if an older marker is evicted. Partial GraphQL batches remove successful aliases, ambiguous committed writes recover through deterministic duplicate ids, non-retriable validation failures are discarded explicitly, and every request has a 10-second timeout. Exhausted delivery records `telemetry.delivery_failed` in memory and invokes the local delivery-failure hook; that event is sent after connectivity returns. Disposal aborts a regular active request/retry loop, preserves an already-active keepalive request, otherwise permits only one best-effort keepalive send, and never re-arms a timer. A permanently unavailable telemetry endpoint can still prevent its own event from arriving, which is why the independent alarm gate below remains required.

## Event Dictionary

| Stage | Events | Required interpretation |
| --- | --- | --- |
| Capture | `capture.requested`, `capture.settings_applied`, `capture.started`, `capture.paused`, `capture.resumed`, `capture.stopped`, `capture.failed` | Microphone request, actual privacy-safe track settings/device hash, recorder lifecycle, and capture failure. |
| Signal | `signal.summary` | Aggregate RMS, peak, observed duration, signal duration, and sample count. No samples or audio survive analysis. |
| Chunking | `chunk.emitted`, `chunk.rejected` | MIME/container, byte count, order, final flag, or safe rejection reason. |
| Storage | `upload.started`, `upload.succeeded`, `upload.failed` | S3 attempt, duration, bytes/order, final flag, and safe request/error id. |
| Queue | `sqs.accepted`, `sqs.failed` | FIFO acceptance or failure, including safe AWS request/message ids. |
| Transcription | `transcription.wait_started`, `transcription.completed`, `transcription.no_speech`, `transcription.failed` | AppSync wait/fallback plus the backend provider outcome, attempt, request id, no-speech state, and duration. |
| Note generation | `note_generation.started`, `note_generation.succeeded`, `note_generation.failed` | Provider, attempt, fallback state, duration, request id, and safe failure code. |
| Retry | `retry.scheduled` | Stage/provider, next attempt, safe reason, and delay. |
| Alerting | `alert.triggered`, `alert.failed` | Safe alert code/provider, attempt, duration, and delivery result with the same job id. |
| Notification | `notification.succeeded`, `notification.failed` | Privacy-safe channel, attempt, provider, duration, and result. |
| Quarantine | `quarantine.created`, `quarantine.failed` | Durable handling of poison/unprocessable work without recording object paths or content. |
| Deletion | `deletion.succeeded`, `deletion.failed` | Audio/object cleanup result and attempt, without the S3 key. |
| Terminal | `recording.completed`, `recording.failed`, `recording.discarded` | Exactly one client terminal outcome with a safe reason/outcome. |
| Telemetry health | `telemetry.delivery_failed`, `telemetry.buffer_overflow` | Reliability of the telemetry path itself. |

Optional allowlisted fields are: attempt and duration/retry counters; chunk bytes/order/final flag; HTTP status; aggregate signal metrics; MIME/container; provider, alert, outcome, reason, and error codes; notification channel; transcript correlation mode; safe AWS/S3/SQS/provider request ids; app producer version; requested/applied safe track settings; device type; and the per-recording device hash.

## Privacy Boundary

Telemetry may describe operational shape, never clinical or identity content.

- Raw `Blob`, `ArrayBuffer`, typed-array, `AudioBuffer`, and other audio values are rejected.
- Audio, transcript, note, clinical-text, patient, user, owner, username, first/last/full name, email, token, authorization, credential, password, secret, and private-key fields are rejected recursively.
- Strings shaped like email addresses, bearer tokens, JWTs, AWS access keys, private keys, or credential-bearing query parameters are rejected.
- Raw `deviceId`, `groupId`, and microphone label are never emitted. The browser hashes available device material with the random `recordingJobId`, truncates it to 24 hexadecimal characters, and discards the source material. The hash cannot link the device across recording jobs.
- Requested/applied track settings allow only gain control, channels, echo cancellation, latency, noise suppression, sample rate/size, and volume.
- S3 object keys, Cognito user ids, access tokens, note settings, transcript text, note text, patient identifiers, and audio bytes are excluded from telemetry even though some remain necessary inside the existing processing requests.
- Console messages in the changed conversation-recording paths use fixed text and safe codes rather than paths, tokens, settings, or raw error objects.

The validator tests are the executable privacy authority. A new payload field is not telemetry-safe merely because its current value looks harmless; it must enter the explicit allowlist with validation and rejection tests.

## Storage, Access, and Retention

`RecordingTelemetryEvent` is an Amplify/AppSync model with no update or delete authorization:

- signed-in Cognito users may create events but cannot read them;
- explicitly allowlisted IAM backend roles may create events after their role names are added to the Amplify Gen 1 `custom-roles.json` and their IAM policies are scoped to this mutation;
- only members of the Cognito `Support` group may read events;
- no owner, user id, patient id, transcript, note, or object path is stored in the event or Support query;
- the resolver stores a GraphQL-hidden, job-salted non-cryptographic producer fingerprint for coarse abuse attribution without making a direct principal identifier or cross-recording tracking key readable to Support; collisions are possible, so it is not an authentication or forensic identity;
- the `expiresAt` DynamoDB TTL attribute is set to 30 days by `override.ts`.

DynamoDB TTL deletion is asynchronous, so 30 days is the expiry target rather than an exact deletion instant. CloudWatch logs, exports, backups, or downstream metrics must receive their own retention and access review before rollout; this contract does not authorize copying event bodies elsewhere.

The model, index, Support group membership, TTL override, IAM permissions, and retention behavior are source definitions only until an authorized backend release applies and verifies them. This task does not authorize that release.

## Support Timeline Query

Obtain the opaque `recordingJobId` from the `Recording reference:` appended to capture/submission/generation failure text or from a safe alert. Never search by patient, user, transcript, note text, or S3 path. Use an authenticated Support-group session and page until `nextToken` is null:

```graphql
query RecordingTimeline(
  $recordingJobId: ID!
  $limit: Int
  $nextToken: String
) {
  recordingTelemetryEventsByRecordingJobId(
    recordingJobId: $recordingJobId
    sortDirection: ASC
    limit: $limit
    nextToken: $nextToken
  ) {
    items {
      timelineKey
      occurredAt
      producerOccurredAt
      sequence
      schemaVersion
      appBuild
      source
      platform
      browser
      eventName
      attempt
      deliveryAttempt
      durationMs
      httpStatus
      alertCode
      errorCode
      reasonCode
      provider
      producerVersion
      providerRequestId
      awsRequestId
      s3RequestId
      sqsMessageId
      chunkOrder
      chunkBytes
      isFinalChunk
      mimeType
      container
      requestedTrackSettings
      appliedTrackSettings
      deviceType
      deviceHash
      observedDurationMs
      signalDurationMs
      rmsAverage
      peak
      sampleCount
      noSpeech
      transcriptFallback
      retryDelayMs
      stage
      notificationChannel
      outcome
      queueDepth
      droppedEventCount
    }
    nextToken
  }
}
```

Variables:

```json
{
  "recordingJobId": "00000000-0000-4000-8000-000000000000",
  "limit": 200,
  "nextToken": null
}
```

Read the result in ascending `timelineKey` order. If a reconnect batch arrives after downstream events, use `producerOccurredAt` together with that source's monotonic `sequence` to place its client events in their operational order; never treat the producer timestamp as authentication evidence:

1. Confirm one schema major version and identify app/source versions.
2. Confirm capture settings and `signal.summary`. Low/zero signal with healthy chunk/upload stages points to input/device conditions rather than transport.
3. Confirm monotonically increasing `chunkOrder`, final-chunk emission, upload success, and SQS acceptance. The first missing acknowledgement identifies the client/storage/queue boundary.
4. Confirm transcription provider outcome. Treat `transcription.no_speech` as an explicit outcome, not a generic failure.
5. Confirm note generation, retries, quarantine/deletion, and notification results where their backend producers are deployed.
6. Confirm exactly one terminal event. Multiple terminals, a within-source sequence regression, or a timeline ending without a terminal is a producer defect.
7. Flag `telemetry.buffer_overflow` as an incomplete timeline and `telemetry.delivery_failed` as a reliability incident even if the clinical workflow later succeeds.

Export only the operational fields needed for the support case. Do not join the timeline to clinical tables or paste transcript/note/audio content into the case.

## Metrics and Alarm Gate

Before operational rollout, provision and verify first-party metrics without placing event payloads in metric dimensions:

- count `telemetry.delivery_failed` as `RecordingTelemetryDeliveryFailure`;
- count `telemetry.buffer_overflow` as `RecordingTelemetryBufferOverflow`;
- count terminal outcomes by safe `outcome`, `platform`, and `appBuild` only;
- alarm on any sustained delivery failure and on missing telemetry ingestion independently of the AppSync ingestion path;
- route alarms with `recordingJobId` only, never user/patient identifiers or clinical content.

The independent ingestion canary/metric and CloudWatch alarm do not exist in this repository and were not provisioned. This is a hard completion and release gate: an alarm based only on `telemetry.delivery_failed` events cannot detect a telemetry service that is completely unreachable.

## Backend Integration and Release Gate

The following changes belong to other repositories and must be completed before claiming end-to-end correlation:

1. `chironote/lambda-audio2transc`: retain `recordingJobId`, schema/app/platform/browser context, and chunk fields when normalizing SQS bodies; emit transcription, retry, no-speech, quarantine, deletion, and terminal-relevant events; populate the new `Notes` correlation/status/provider/request/attempt fields; remove direct identifiers/object paths from operational logs; preserve the context through DLQ/retry messages.
2. `chironote/lambda-transcript2note`: accept and validate `recordingJobId`, schema version, and originating app/platform/browser; retain them in retry messages; emit note-generation, retry, persistence, and provider outcomes; update correlated note status without logging clinical text or direct identifiers.
3. The alert/notification/quarantine owners: emit alert, notification, and quarantine results with the same id and safe request identifiers.
4. Infrastructure owner: add the exact backend producer role names to the Amplify Gen 1 `custom-roles.json`, deploy the AppSync model/index/status fields, validating ingestion resolver, and TTL; grant least-privilege mutation access and Support read access; attach per-principal AppSync/WAF throttling; configure the independent delivery metric/alarm; and verify real TTL/access/source-boundary/abuse-attribution behavior.
5. Release owner: regenerate checked-in GraphQL clients after the deployed schema is authoritative, then release backend producers before a correlated frontend build and run the real Web/Android/iOS/backend matrix.
6. Native owners: port the same schema/client contract to the currently maintained Android and iOS code lines. This repository's `prod` line covers the website plus browser/WebView detection; its older native branches are divergent and were not edited from this worktree.

The client subscription first requests the new status fields, then falls back once to the legacy timestamp subscription when the deployed schema does not yet expose them. Timestamp matching exists only as a migration fallback; `recordingJobId` takes precedence and a mismatched job id is rejected even when timestamps match.

No AWS, frontend, mobile, or Lambda deployment is implied by source merge. Record the deployment commit/version and a synthetic end-to-end job timeline here only after an explicitly authorized release and privacy review.

## Provenance

Implemented by [`recordingTelemetrySchema.js`](../../src/components/Recording/recordingTelemetrySchema.js), [`recordingTelemetryClient.js`](../../src/components/Recording/recordingTelemetryClient.js), [`recordingTelemetryContext.js`](../../src/components/Recording/recordingTelemetryContext.js), [`recordingSignalHealth.js`](../../src/components/Recording/recordingSignalHealth.js), [`recordingBackendContract.js`](../../src/components/Recording/recordingBackendContract.js), the recording hooks, [`schema.graphql`](../../amplify/backend/api/chironotev4/schema.graphql), [`Mutation.createRecordingTelemetryEvent.req.vtl`](../../amplify/backend/api/chironotev4/resolvers/Mutation.createRecordingTelemetryEvent.req.vtl), [`override.ts`](../../amplify/backend/api/chironotev4/override.ts), and their adjacent tests. External-repository findings were verified read-only against the current default branches of `chironote/lambda-audio2transc` and `chironote/lambda-transcript2note` on 2026-08-12.
