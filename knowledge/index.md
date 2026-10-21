---
okf_version: "0.1"
---

# ChiroNote Knowledge Index

This is a concept-oriented knowledge map for ChiroNote. Query by the thing you need to understand or change; each concept contains its own provenance and links to adjacent concepts. Files remain at `knowledge/<category>/<concept>.md` so the hierarchy never exceeds one folder below `knowledge/`. See the [knowledge update log](./log.md) for the newest-first history of how this map has evolved.

## Architecture

| Concept | Use it to understand |
| --- | --- |
| [ChiroNote System Architecture](./architecture/system-overview.md) | Product purpose, system boundaries, major data flows, and ownership across frontend and backend. |
| [Capacitor Android Application](./architecture/capacitor-android.md) | Android wrapper ownership, native adaptations, build flow, Capacitor 6.2.2 security patch and distribution gates, published Internal 37, excluded diagnostics, and release boundaries. |

## Development

| Concept | Use it to understand |
| --- | --- |
| [Local Development and Change Workflow](./development/workflow.md) | Setup, commands, verified Storage cancellation patch, testing, documentation duties, and sensitive files. |
| [Android clinical interface styling](./development/STYLE.md) | Approved patient creation pattern, Settings/dialog consistency, readable forms and coarse-pointer touch targets. |

## Application Components

| Concept | Use it to understand |
| --- | --- |
| [Authenticated Application Shell](./components/app-shell.md) | Authenticated state, workspace composition, history subscriptions, and global shortcuts. |
| [Application Routing](./components/app-routing.md) | Public routes, protected app entry, analytics side effects, and PWA redirects. |
| [Audio Recording and Note Generation](./components/recording.md) | Patient capture, finalized containers, memory-only S3/SQS connection recovery, per-appointment ordering and completion ownership, Record next appointment action and unchanged transcript/generation policy. |
| [Recording and Dictation Architecture](./components/recording-context.md) | Detailed recording and realtime-dictation lifecycle, insertion behavior, and validation. |
| [AssemblyAI Dictation Implementation Reference](./components/recording-dictation.md) | Legacy low-level streaming and AudioWorklet implementation details. |
| [Clinical Clipboard](./components/clipboard.md) | Main text workspace, labelled phone toolbar, independent saved-note Save, native-app and phone-web Smart Editor exclusion and balanced gutters, SOAP+T extraction, copying, dictation locking, and Markdown cleanup. |
| [History Sidebar and Smart Editor](./components/sidebar.md) | Saved-note navigation, content popup behavior, and desktop-web-only Smart Editor availability. |
| [Billing and Settings](./components/account.md) | Current subscription and settings surfaces, web-only billing controls, and the Capacitor billing boundary. |
| [Authentication UI](./components/auth-ui.md) | Web/native authentication, foreground credential retry, cleanup/network-failure behavior, security invariants and source-versus-release history. |
| [Authenticated Navigation](./components/navbar.md) | In-app navigation behavior and route links. |
| [User Feedback](./components/feedback.md) | Feedback form behavior and backend submission. |
| [First-run Introduction Tour](./components/intro-tour.md) | Shepherd tour targets, persistence, and cleanup. |
| [Public Landing Pages](./components/landing-page.md) | Marketing/tutorial page structure and analytics. |
| [Public Landing Navigation](./components/landing-navbar.md) | Desktop/mobile public navigation modes and behavior. |
| [Blog Publishing](./components/blog.md) | Blog post contract, registration, routes, and metadata. |
| [Cookie Consent and Analytics](./components/cookie-consent.md) | Consent persistence and analytics initialization. |
| [Landing Page Upgrade Record](./components/landing-page-upgrade.md) | Historical completed and pending responsive-design work. |

## Infrastructure

| Concept | Use it to understand |
| --- | --- |
| [AWS Amplify Backend](./infrastructure/amplify.md) | Amplify-managed backend directory and generated resources. |
| [Amplify Command Hooks](./infrastructure/hooks.md) | Hook lifecycle, naming, parameters, and execution behavior. |
| [Custom AppSync Resolvers](./infrastructure/appsync-resolvers.md) | Resolver override location and deployment behavior. |

## Security

| Concept | Use it to understand |
| --- | --- |
| [Company Security Policy](./security/security-policy.md) | HIPAA safeguards, risk considerations, responsibilities, and AWS service inventory. |

## Knowledge System

| Concept | Use it to understand |
| --- | --- |
| [Healtech Simplified Open Knowledge System](./knowledge-management/healtech-simplified-oks.md) | The portable method, structural contract, synthesis rules, scaling model, and reusable skill behind this knowledge folder. |

## Knowledge Maintenance

- Add or revise a concept when implementation changes what the system knows about a domain.
- Give concepts specific names that communicate what question they answer; do not create generic `README`, `context`, `agents`, or `information` concepts.
- Link to authoritative source files under a `Provenance` section instead of copying the source hierarchy into `knowledge/`.
- Add every new concept to this index and link adjacent concepts where navigation benefits from it.
- Record every meaningful concept or index change in [log.md](./log.md), grouped under the current ISO date with the newest date first.

## Patient notes update

- [Patient notes](architecture/patient-notes.md): compact capture, visible new/unassigned Exam Layout with independent manual preference and frozen session settings, recovered saved-note authority and native Save/version guards, patient reassignment/deletion, PDF selection/share/cache, published Internal 37 and remaining device acceptance gates.

## Maintenance

Knowledge concepts synthesize domains. Update affected concepts and the dated knowledge log when implementation changes invalidate their facts; update this index when routing changes. Keep only index.md and log.md at the knowledge root and validate the shallow structure.
