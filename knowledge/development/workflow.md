---
type: development-workflow
title: "Local Development and Change Workflow"
description: "Commands, coding conventions, testing priorities, documentation duties, and change-safety rules."
resource: "../../AGENTS.md"
tags: [chironote, development, testing, maintenance]
---

# Local Development and Change Workflow

## Setup and Commands

Use npm with the checked-in `package-lock.json`.

| Task | Command | Notes |
| --- | --- | --- |
| Install dependencies | `npm install` | Preserve the lockfile. |
| Run locally | `npm start` | Starts the CRA development server at `http://localhost:3000`. |
| Run tests once | `npm test -- --watchAll=false` | Uses the CRA/Jest test suite. |
| Build production assets | `npm run build` | Builds into `build/`, then runs `defer-css.js`. |
| Eject CRA | `npm run eject` | Irreversible; do not run without explicit agreement. |

## Code Conventions

- Use JavaScript and JSX with ES module imports, 2-space indentation, single quotes, and semicolons.
- Name React components in PascalCase and utilities in camelCase.
- Keep feature code under `src/components/FeatureName/`; place reusable helpers in the shared constants, services, or utilities directories.
- Address warnings from CRA's `react-app` ESLint configuration.
- Place tests beside their units as `ComponentName.test.jsx` or `helper.test.js`.

Prioritize tests around recording, authentication, GraphQL interactions, and clinical-note text transformations. `src/utils/dictationInsertion.test.js` is the regression suite for dictation cursor insertion and preservation of surrounding note text.

Commit `62f4ec8` removed the former recording test harness. The 2026-07-15 safety pass began rebuilding focused coverage for media metadata, emitted-chunk ordering, session cancellation, late upload callbacks, SQS failure, and unmount cleanup. The active suite now has 86 tests across 14 files, including the PHI-safe telemetry, delivery, resolver, signal-health, backend-correlation, and current landing-page contracts. It still does not validate real browser chunk rotation, a deployed AppSync subscription migration, the complete Lambda stream, or native builds, so use the recording test matrix rather than treating a green Jest run as complete release evidence.

## Change Responsibilities

- Keep orchestration and implementation boundaries described by the relevant knowledge concept.
- Update an immediate component folder's source `README.md` when its contents, ownership, important paths, or maintenance requirements change.
- Update the relevant concept in `knowledge/` when a change invalidates it. Concepts synthesize knowledge and do not mirror source documents one-for-one.
- Add a concise entry to `knowledge/log.md` for every meaningful concept, index, split, merge, deprecation, or correction; group entries by ISO date with newest dates first.
- Keep commits focused and use short descriptive subjects.
- Pull requests should state the user impact and validation performed; include visual evidence for UI changes and deployment notes for Amplify changes.
- Only the repository owner publishes the website. Keep release evidence and the deployed commit current in [Website Publish State and Release Checklist](../operations/website-release.md).

## Sensitive and Generated Files

- Never commit secrets, local AWS credentials, or private patient data.
- Treat `src/amplifyconfiguration.json`, `src/aws-exports.js`, and `amplify/team-provider-info.json` as environment-sensitive.
- Avoid manual edits to generated Amplify, GraphQL, model, or UI files unless they are part of a deliberate regeneration or backend update.

## Provenance

Synthesized from [`AGENTS.md`](../../AGENTS.md), [`README.md`](../../README.md), [`package.json`](../../package.json), the active Jest inventory, commit `62f4ec8`, and the 2026-07-15 recording safety tests.
