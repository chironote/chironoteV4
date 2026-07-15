---
type: system-architecture
title: "ChiroNote System Architecture"
description: "System boundaries, major data flows, and ownership across the ChiroNote frontend and AWS backend."
resource: "../../Context.md"
tags: [chironote, architecture, react, amplify]
---

# ChiroNote System Architecture

ChiroNote is a React single-page application for turning clinical encounter audio into transcripts and structured SOAP notes. It also supports realtime dictation, editing, saved-note history, accounts, feedback, and public marketing and blog pages.

The `cap-and` line packages the same application as a Capacitor Android wrapper. Native launches enter the authenticated app directly while the shared production source and folder structure remain present for alignment. See [Capacitor Android Application](./capacitor-android.md) for the wrapper boundary.

## System Boundaries

- The React frontend lives in `src/`; `src/index.js` is the entry point and `src/App.jsx` installs app-wide providers and routing.
- `src/components/AppRouting/` owns public routes and the boundary around `/app/*`.
- `src/components/AppShell/` owns the authenticated workspace, shared UI state, and note-history subscriptions.
- `src/components/Recording/` owns conversation recording, chunk upload, transcription completion, note generation, and realtime dictation.
- AWS Amplify provisions authentication, storage, GraphQL, database, and serverless backend resources from `amplify/`.
- Generated GraphQL and model code lives in `src/graphql/` and `src/models/`; generated Amplify UI forms live in `src/ui-components/`.
- Shared non-UI logic belongs in `src/constants/`, `src/services/`, and `src/utils/`. Static assets live in `src/assets/` and `public/`.
- `src/services/nativePlatform.js`, `capacitor.config.json`, and `android/` own the thin native boundary without replacing the shared app shell.

## Authenticated Data Flow

1. `AuthWrapper` uses Amplify authentication to admit a signed-in user to `AuthenticatedApp`.
2. `useNotesHistory` queries recent user records through AppSync GraphQL and separates notes from transcripts.
3. AppSync subscriptions deliver completed or updated records to the workspace without a manual refresh.
4. `AuthenticatedApp` coordinates the history sidebar, clipboard, Smart Editor, recording controls, dictation, and selected-note popup.
5. GraphQL mutations persist user edits and related account data to the Amplify-managed backend.

## Audio-to-Note Flow

1. `RecordingManager` coordinates the workflow while focused hooks own the implementation.
2. `useMediaRecorderController` captures browser audio and emits chunks.
3. `useAudioUploadQueue` uploads chunks to Amplify Storage in order and dispatches processing messages through SQS.
4. `useNoteGeneration` waits for transcript completion and streams generated note text from the backend.
5. The app inserts cleaned text into the clinical workspace; saved backend updates return through GraphQL subscriptions.

Realtime dictation is a separate AssemblyAI streaming path. It captures an immutable snapshot around the selected textarea range and replaces only the evolving transcript region. The insertion operation is pure so React Strict Mode cannot duplicate or consume neighboring text.

## Ownership Map

| Concern | Owning concept |
| --- | --- |
| Public and protected routes | [Application Routing](../components/app-routing.md) |
| Authenticated state and workspace composition | [Authenticated Application Shell](../components/app-shell.md) |
| Recording, uploads, transcripts, and note generation | [Audio Recording and Note Generation](../components/recording.md) |
| Dictation lifecycle and insertion | [Recording and Dictation Architecture](../components/recording-context.md) |
| Clipboard and Markdown cleanup | [Clinical Clipboard](../components/clipboard.md) |
| AWS backend layout | [AWS Amplify Backend](../infrastructure/amplify.md) |
| Security constraints | [Company Security Policy](../security/security-policy.md) |
| Android wrapper, native lifecycle, and build | [Capacitor Android Application](./capacitor-android.md) |

## Provenance

Synthesized from [`Context.md`](../../Context.md), [`AGENTS.md`](../../AGENTS.md), current implementation, and the feature documentation linked above. Feature and platform concepts take precedence when an older general description conflicts with current code.
