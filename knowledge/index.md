---
okf_version: "0.1"
---
# ChiroNote Knowledge

This layer synthesizes the current `cap-ios` checkout into task-oriented
concepts for the React and Capacitor client. It records what the source actually
does, preserves uncertainty at external service boundaries, and does not mirror
the documentation or generated-file tree.

## Architecture

- [Authenticated App Shell](./architecture/app-shell.md): routing, auth gate,
  responsive sign-in, central state, history refresh, recording, dictation, and panel ownership.
- [Amplify and Lambda Data Integration](./architecture/data-integration.md):
  GraphQL records/subscriptions, usage counters, storage/SQS, and direct Lambda
  streaming boundaries.

## Components

- [Recent History Refresh](./components/recent-history.md): history queries, realtime updates, and manual recovery from missed subscription events.

- [Recording Lifecycle](./components/recording-lifecycle.md): MediaRecorder
  segmentation, iPhone WebKit stop ordering, cancellation, and upload ordering.
- [Note Workspace and Section Actions](./components/note-workspace.md):
  labelled phone toolbar in portrait/landscape, native phone/tablet Smart Editor exclusion, balanced editor gutters, versioned native Save, draft guards, SOAP copy, history reassignment, labels, and
  Smart Editor streaming.
- [Live Dictation Streaming](./components/dictation-streaming.md): AudioWorklet
  conversion, AssemblyAI turns, token refresh, usage accounting, and cleanup.

## Operations

- [Capacitor Mobile Build](./operations/mobile-build.md): web-to-native sync,
  iOS/Android project settings, Capacitor 6.2.2 security-patch distribution gates, resolved Share pod, simulator/archive/signing evidence, verified Apple identity, TestFlight publishing/fallback procedure, permissions and app-cache privacy manifest.

## Security

- [Clinical Data and Credential Boundaries](./security/privacy-boundaries.md):
  PHI movement, auth/session lifecycle, retired plaintext credential storage, and privacy-review
  boundaries.

## Development

- [Frontend and Native Verification Workflow](./development/workflow.md): local
  scripts, focused tests, Router 7.2 CommonJS test context, generated artifacts, and release verification.

## Maintenance

Update the affected concept and [knowledge log](./log.md) whenever code,
configuration, or an external integration contract invalidates a claim. Review
this router when concepts are added, removed, renamed, split, or merged. Keep
concepts one category deep, preserve source documents, and never place secrets,
tokens, audio, notes, transcripts, or patient data in knowledge files.

## Patient notes update

- [Patient notes](architecture/patient-notes.md): compact capture, visible Exam Layout and typed-name confirmation, native Save/diagnosis review, deletion/reassignment, PDF sharing and rollout gates.
