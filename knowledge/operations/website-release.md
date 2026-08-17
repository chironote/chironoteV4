---
type: release-operations
title: "Website Publish State and Release Checklist"
description: "What is currently deployed, what differs locally, which checks pass, and what must be decided before the owner publishes the website."
resource: "../../package.json"
tags: [release, publish, amplify, production, validation, risk]
---

# Website Publish State and Release Checklist

Only the repository owner publishes the website. This concept records evidence and a safe decision path; it does not authorize an agent to deploy.

## State as Reviewed on 2026-07-15

- Local branch: `prod` at `5083517`.
- Remote branch: `origin/prod` at the same commit after a fresh fetch.
- Pre-existing local modifications: `amplify/backend/backend-config.json` and `amplify/team-provider-info.json`. The visible diff is line-ending-only, but both are environment-sensitive and must not be included accidentally.
- Production build: succeeds and runs `defer-css.js` successfully.
- Automated tests after the recording safety pass: four suites and 13 passing tests covering dictation insertion, media metadata, emitted-chunk ordering, upload cancellation/failure, and unmount teardown.
- Build quality: compiles with many ESLint warnings, including hook dependency warnings in Clipboard, Smart Editor, LandingNavbar, and Dictation.
- Dependency audit: `npm audit --omit=dev` reports 89 findings (2 critical, 28 high, 45 moderate, 14 low). Many are transitive CRA/tooling findings, but current AWS/Amplify and runtime packages also appear; triage is required rather than an automatic forced fix.
- Browserslist data: seven months old at build time.

## Live Website Fingerprint

The live site and local build do not contain the same compiled assets:

| Asset | Live `chironote.ai` | Local build on 2026-07-15 |
| --- | --- | --- |
| Main JavaScript | `main.251dc7dc.js` | `main.4fddf657.js` |
| Main CSS | `main.b9ee378c.css` | `main.107398c8.css` |

The live JavaScript contains the February retry behavior, the 1,000-byte blob filter, Safari stream reuse, and the old note-generation Lambda URL. It does not contain the March 15 replacement Lambda URL or the July dictation-caret implementation. Therefore production includes at least the March 2 recording fixes but predates the March 15 Lambda switch and all May-July structural/dictation work. Repository evidence cannot distinguish whether the March 7 landing-page commits were included in that deployment.

The live and local `manifest.json` are identical, so manifest drift is not part of this pending web release.

## Changes Waiting Behind Production

The unpublished delta includes:

- the March 15 note-generation Lambda endpoint switch;
- March 7 landing/conversion UI changes if they were not in the last deployment;
- the May 18 app-shell decomposition and RecordingManager split into focused hooks;
- cursor-aware dictation insertion in Clipboard and Smart Editor;
- the July 1 Strict-Mode-safe insertion snapshot, green caret, textarea locking, and five regression tests;
- repository and component documentation plus the Healtech knowledge system.
- the asynchronous Custom Instructions Settings flow and installed backend control plane. It remains feature-flagged off because the queue-to-worker event-source mapping, reserved-concurrency decision, authenticated provider end-to-end test, and runtime configuration verification are not complete.

The UI refactor is large in file movement but intended to preserve behavior. The recording implementation is not behavior-neutral: it changes where cleanup, upload, fallback, and generation responsibilities live.

## Publish Blockers and Decisions

### Resolved in the 2026-07-15 safety pass

1. Removed complete Cognito access-token logging.
2. Added recording-session invalidation, active Amplify upload cancellation, SQS abort, and late-callback suppression for discard, fatal failure, replacement sessions, and unmount.
3. Converted upload/SQS failures into a single fatal controller path with a user-visible retry message and clean UI/resource teardown.
4. Made audio extensions and S3 content types format-aware, including Safari MP4.
5. Changed unmount cleanup from finalization to cancellation, serialized emitted chunks before asynchronous queueing, and added focused regression tests.
6. Changed failed and zero-credit subscription checks from finalization to discard so they cannot submit audio.

### Validate or explicitly accept

1. Test iPhone/iPad capture and backend transcription with the corrected `.mp4`/emitted-MP4-MIME contract.
2. Extend recording tests to real/fake MediaRecorder chunk rotation, AppSync transcript fallback, and generation streaming. Session cancellation, SQS failure, media metadata, and teardown are now covered.
3. Triage runtime-relevant dependency advisories and upgrade without using `npm audit fix --force` blindly.
4. Review the hook dependency warnings in Dictation, Clipboard, and Smart Editor for stale closures before relying on a manual smoke test.
5. Deploy the merged Custom Instructions consumer source to the production
   `transcriptToNoteV2` Lambda with revision locking and the runtime flag off, then
   complete the bounded proof in the [Custom Instructions launch handoff](./custom-instructions-launch-handoff.md).
6. Keep Custom Instructions disabled until its FIFO queue invokes the worker, an authenticated browser request reaches a provider-backed terminal state, the reserved-concurrency quota issue is resolved or accepted, and the deployed frontend is verified against the intended AppSync API. This gate does not authorize changing the existing note-generation endpoint.

## Owner-run Release Checklist

1. Start from a clean worktree or deliberately exclude the two environment-sensitive Amplify files.
2. Confirm `prod` and `origin/prod` point to the intended commit.
3. Run `npm test -- --watchAll=false` and `npm run build`.
4. Complete the browser/device matrix in [Recording, Dictation, and Note Generation](../components/recording.md).
5. Smoke-test public routes, sign-in, note history, account/billing links, feedback, analytics consent, and PWA `/app` redirect.
6. Confirm the new Lambda endpoint and SQS queue against the production AWS environment.
7. Record the release commit and live asset hashes before publishing so rollback does not depend on memory.
8. Publish only through the owner's established Amplify process.
9. After publish, compare `/asset-manifest.json`, run one short real recording and dictation session, and confirm CloudWatch/AppSync/SQS behavior.
10. Record the deployment date, commit, asset hashes, validation, and rollback target in this concept and `knowledge/log.md`.

## Rollback Evidence to Capture

- Previous deployed commit or build artifact, if available.
- Previous and new `asset-manifest.json` hashes.
- Old and new note-generation Lambda URLs and versions.
- SQS queue and Amplify environment identifiers without copying credentials.
- Results of the minimum recording matrix.

## Provenance

Synthesized from Git branch and commit history; [`package.json`](../../package.json); the 2026-07-15 outputs of `npm test -- --watchAll=false`, `npm run build`, and `npm audit --omit=dev`; local [`asset-manifest.json`](../../build/asset-manifest.json); the public `https://chironote.ai/asset-manifest.json`, `manifest.json`, and compiled JavaScript; the current recording implementation; the read-only 2026-08-16 production CloudFormation/AppSync contract review; and the read-only 2026-08-17 `transcriptToNoteV2` AWS verification. No deploy action was performed. Amplify console history was not used, so the live asset fingerprint still outranks guesses based on Git dates.
