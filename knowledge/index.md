---
okf_version: "0.1"
---

# ChiroNote Knowledge Index

This is a concept-oriented knowledge map for ChiroNote. Query by the thing you need to understand or change; each concept contains its own provenance and links to adjacent concepts. Files remain at `knowledge/<category>/<concept>.md` so the hierarchy never exceeds one folder below `knowledge/`. See the [knowledge update log](./log.md) for the newest-first history of how this map has evolved.

## Architecture

| Concept | Use it to understand |
| --- | --- |
| [ChiroNote System Architecture](./architecture/system-overview.md) | Product purpose, system boundaries, major data flows, and ownership across frontend and backend. |
| [Web, Android, and iPhone Codebase Divergence](./architecture/platform-divergence.md) | Branch lineage, platform-specific ownership, manifest history, and a path toward synchronizing the three application lines. |

## Development

| Concept | Use it to understand |
| --- | --- |
| [Local Development and Change Workflow](./development/workflow.md) | Setup, commands, code conventions, testing, documentation duties, and sensitive files. |
| [ChiroNote Visual Style System](./development/STYLE.md) | Exact colors, typography, spacing, components, responsive rules, interaction states, accessibility, and visual QA for the entire app. |

## Application Components

| Concept | Use it to understand |
| --- | --- |
| [Authenticated Application Shell](./components/app-shell.md) | Authenticated state, workspace composition, history subscriptions, and global shortcuts. |
| [Application Routing](./components/app-routing.md) | Public routes, protected app entry, analytics side effects, and PWA redirects. |
| [Recording, Dictation, and Note Generation](./components/recording.md) | Current recording architecture, its 2026 history, browser behavior, failure risks, and required release matrix. |
| [Clinical Clipboard](./components/clipboard.md) | Main text workspace, shared dashboard panel styling, SOAP+T extraction, copying, dictation locking, and Markdown cleanup. |
| [History Sidebar and Smart Editor](./components/sidebar.md) | Responsive saved-note navigation, content popup behavior, and the visually paired Smart Editor workspace. |
| [Billing and User Settings](./components/billing-settings.md) | Plans, billing actions, current usage, lifetime hours saved, and the feature-flagged custom-instructions boundary. |
| [Authentication UI](./components/auth-ui.md) | Amplify Authenticator branding and customization boundaries. |
| [Authenticated Navigation](./components/navbar.md) | In-app route behavior, accessible state, and the 64px desktop/mobile product-header contract. |
| [User Feedback](./components/feedback.md) | Accessible authenticated feedback modal behavior and fixed submission contract. |
| [First-run Introduction Tour](./components/intro-tour.md) | Shepherd tour targets, persistence, and cleanup. |
| [Public Landing Pages](./components/landing-page.md) | Marketing/tutorial structure, mobile-first hero and social-proof treatment, motion boundaries, and analytics. |
| [Public Landing Navigation](./components/landing-navbar.md) | Desktop/mobile public navigation modes and behavior. |
| [Blog Publishing](./components/blog.md) | Blog post contract, registration, routes, and metadata. |
| [Cookie Consent and Analytics](./components/cookie-consent.md) | Consent persistence and analytics initialization. |

## Infrastructure

| Concept | Use it to understand |
| --- | --- |
| [AWS Amplify Backend](./infrastructure/amplify.md) | Amplify-managed backend directory and generated resources. |
| [Amplify Command Hooks](./infrastructure/hooks.md) | Hook lifecycle, naming, parameters, and execution behavior. |
| [Custom AppSync Resolvers](./infrastructure/appsync-resolvers.md) | Resolver override location and deployment behavior. |

## Operations

| Concept | Use it to understand |
| --- | --- |
| [PHI-safe Recording Correlation and Telemetry](./operations/recording-telemetry.md) | Recording job identity, versioned event vocabulary, privacy boundary, support query, retention/access, alarm requirements, and backend rollout gates. |
| [Website Publish State and Release Checklist](./operations/website-release.md) | The live-versus-local deployment gap, current validation, publish blockers, owner-only release steps, and rollback evidence. |

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
- Record every meaningful concept or index change in [`log.md`](./log.md), grouped under the current ISO date with the newest date first.
