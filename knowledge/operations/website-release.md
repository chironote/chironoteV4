---
type: release-operations
title: "Website Publish State and Release Checklist"
description: "Current live-versus-unpublished state, synthetic acceptance, owner publication gate and website recovery evidence."
resource: "../../package.json"
tags: [release, publish, amplify, production, validation, risk]
---

# Website Publish State and Release Checklist

Only the repository owner publishes the website. This concept records evidence and a safe decision path; it does not authorize an agent to deploy.

## Current patient release state — 2026-10-10

The patient web source and required compatibility/retention updates are merged. The existing production API update and runtime cutover completed with the AppSync clinical-write guard enabled, Notes identity/recovery protections preserved, intended new services active, and both legacy dispatcher mappings disabled. A feature-enabled website build passed locally but remains unpublished; only the owner publishes. Authenticated synthetic acceptance passed across four fictional patients and seven visits: audio/transcription, initial/follow-up save, diagnosis correction, stale-conflict protection, missing-patient handling, generic-write guard, retry, reassignment, re-exam reconciliation and PDF export. The exported PDF text was checked against saved bodies and each page visually reviewed. See [cutover and acceptance evidence](patient-infrastructure-release.md).

Clinical prose/coding prompts and the Custom Instructions compiler remain unchanged; broad prompt review is deferred. The accepted scope includes only the approved re-exam diagnosis classifier and speaker-role integration. After the owner publishes, run a real-microphone smoke test and review the live patient screens. Physical iPhone/Android coverage and native/extension publication remain separate later work; the synthetic browser checks do not claim those devices were tested.

The live website publish route was verified from the current hosting backup and configuration: CloudFront distribution `E34RPJ5SU5J7IX` for `chironote.ai` and `www.chironote.ai`, backed by S3 bucket `chironote4-20240825113940-hostingbucket-prod` in `us-east-2`. Do not infer the live host from a separate Amplify app's branch listing. The owner should build from a clean checkout of merged `origin/prod`, explicitly set the patient UI/export build flags, confirm the AWS account and destination, sync without deleting unrelated objects, then invalidate CloudFront. The pre-publication recovery archive and exact hash are recorded below.

## Historical state as reviewed on 2026-07-15

- Local branch: `prod` at `5083517`.
- Remote branch: `origin/prod` at the same commit after a fresh fetch.
- Pre-existing local modifications: `amplify/backend/backend-config.json` and `amplify/team-provider-info.json`. The visible diff is line-ending-only, but both are environment-sensitive and must not be included accidentally.
- Production build: succeeds and runs `defer-css.js` successfully.
- Automated tests after the recording safety pass: four suites and 13 passing tests covering dictation insertion, media metadata, emitted-chunk ordering, upload cancellation/failure, and unmount teardown.
- Build quality: compiles with many ESLint warnings, including hook dependency warnings in Clipboard, Smart Editor, LandingNavbar, and Dictation.
- Dependency audit: `npm audit --omit=dev` reports 89 findings (2 critical, 28 high, 45 moderate, 14 low). Many are transitive CRA/tooling findings, but current AWS/Amplify and runtime packages also appear; triage is required rather than an automatic forced fix.
- Browserslist data: seven months old at build time.

## Historical Live Website Fingerprint (reviewed 2026-07-15)

The live site and local build do not contain the same compiled assets:

| Asset | Live `chironote.ai` | Local build on 2026-07-15 |
| --- | --- | --- |
| Main JavaScript | `main.251dc7dc.js` | `main.4fddf657.js` |
| Main CSS | `main.b9ee378c.css` | `main.107398c8.css` |

The live JavaScript contains the February retry behavior, the 1,000-byte blob filter, Safari stream reuse, and the old note-generation Lambda URL. It does not contain the March 15 replacement Lambda URL or the July dictation-caret implementation. Therefore production includes at least the March 2 recording fixes but predates the March 15 Lambda switch and all May-July structural/dictation work. Repository evidence cannot distinguish whether the March 7 landing-page commits were included in that deployment.

The live and local `manifest.json` are identical, so manifest drift is not part of this pending web release.

## Earlier unpublished changes observed on 2026-07-15

The list below describes the older deployment gap as reviewed on that date; it is not today's acceptance checklist. The October patient acceptance is complete, while the website remains unpublished.

The unpublished delta includes:

- the March 15 note-generation Lambda endpoint switch;
- March 7 landing/conversion UI changes if they were not in the last deployment;
- the May 18 app-shell decomposition and RecordingManager split into focused hooks;
- cursor-aware dictation insertion in Clipboard and Smart Editor;
- the July 1 Strict-Mode-safe insertion snapshot, green caret, textarea locking, and five regression tests;
- repository and component documentation plus the Healtech knowledge system.
- the asynchronous Custom Instructions Settings flow and installed backend control plane. It remains feature-flagged off because the queue-to-worker event-source mapping, reserved-concurrency decision, authenticated provider end-to-end test, and runtime configuration verification are not complete.

The UI refactor is large in file movement but intended to preserve behavior. The recording implementation is not behavior-neutral: it changes where cleanup, upload, fallback, and generation responsibilities live.

## Owner publication and post-publication checks

The authenticated synthetic release checks and local tests/build are complete. The prepared website build remains unpublished; publication follows the existing owner-operated release process. This record does not add an approval gate. During that publish step, use the intended merged commit and feature-enabled build, verify the origin and consult the [recovery evidence](#rollback-evidence-and-recovery-copy).

1. Start from a clean worktree at the intended merged `origin/prod` commit. Run `npm ci`, the test suite and production build with `REACT_APP_PATIENT_NOTES_ENABLED=true`, `REACT_APP_PATIENT_CAPTURE_ENABLED=true` and the configured HTTPS PDF export URL.
2. Confirm the signed-in website points at the intended production AppSync API and the export endpoint. Confirm the AWS identity is in account `026090532772`, and verify the target CloudFront distribution aliases and S3 origin before uploading.
3. Publish through the verified S3/CloudFront route. Preserve unrelated bucket keys; do not use a bucket-wide delete. Invalidate CloudFront after upload.
4. After publication, compare the live `/asset-manifest.json` with the release build, sign in, review patient screens, and run one short real-microphone recording through note save. Check transcription and saved-note acknowledgments without exposing transcripts in logs.
5. Record the commit, build asset hashes, distribution invalidation and smoke-test result in this concept and `knowledge/log.md`.

## Separate validation boundaries

Clinical-quality approval and the planned prompt review were not part of this release. The exact live synthetic cases do not establish language accuracy/latency for every provider configuration. Physical iPhone/Android permission/background/rotation/auth flows, and native or extension publication, remain outside this website acceptance. Custom Instructions and broad clinical prompts were not enabled or changed by this patient release.

## Separate known risks from the July 2026 review

The July 15 review recorded 89 `npm audit --omit=dev` findings (including 2 critical and 28 high) and hook dependency warnings in Dictation, Clipboard and Smart Editor. This patient release did not rerun that audit or resolve those items; they are not established as cleared here. They remain separate maintenance risks, not patient-acceptance results.

The same earlier review required a FIFO queue-to-worker check, a reserved-concurrency decision, an authenticated provider-backed terminal-state test and confirmation of the intended AppSync target before enabling Custom Instructions. This patient release did not change or verify those separate gates. Do not infer Custom Instructions enablement from the patient website build.

## Rollback evidence and recovery copy

The verified pre-publication website copy is `work/release/backups/website-live/website-before.zip`, SHA-256 `712678340f427161d523aaaa86b6a8f694daa4d6b2eb05c957651b3fe43f70dc`; its adjacent `manifest.json` contains per-object hashes, `ContentType` and `Metadata` fields (no `CacheControl` values were captured). The archive has 80 selected current assets and public objects (27,706,511 bytes uncompressed). ETags were checked during capture, the inventory was unchanged across the backup, ZIP integrity passed, and bucket versioning is disabled. Restore only the captured keys with their recorded metadata, retain other bucket objects, then invalidate CloudFront. The copy is a task-local Windows artifact, not a Git file; the owner must confirm it is available and its hash matches before using it.

## Provenance

Synthesized from Git branch and commit history; [package.json](../../package.json); the dated July 2026 website fingerprint and dependency review; current patient-notes and recording implementations; October 10 read-only hosting/runtime verification; the feature-enabled build and authenticated synthetic acceptance evidence kept in the release task; and the website recovery manifest. Website publication remains a separate owner action; this documentation records evidence but does not publish.
