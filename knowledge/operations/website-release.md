---
type: release-operations
title: "Website Publish State and Release Checklist"
description: "Current live-versus-unpublished state, synthetic acceptance, owner publication gate and website recovery evidence."
resource: "../../package.json"
tags: [release, publish, amplify, production, validation, risk]
---

# Website Publish State and Release Checklist

Publishing requires repository-owner authorization. The 2026-09-26 Custom Instructions restoration was explicitly requested by the owner; the historical checklist below is not authorization for unrelated deployments.

## Original-folder reconciliation: 2026-10-10

The owner publishes from `C:/Users/nikit/ChiroNote/website/chironoteV4`. This folder's local overview/workflow media and September Custom Instructions restoration are reconciled with the October patient release. The earlier alternate-clean-worktree publishing instructions omit important local work and are superseded. Private `.agents/` recordings/tooling remain local and outside Git, preserved independently with the original build and local configuration.

The checked-in [.env.production](../../.env.production) makes ordinary `npm run build` (also Amplify's configured build command) enable patient notes, patient capture and the deployed HTTPS PDF endpoint. CRA process variables and `.env.production.local` can override these public defaults; verify them before building. Custom Instructions remains available by default with explicit `REACT_APP_CUSTOM_INSTRUCTIONS_ENABLED=false` as the emergency opt-out. Do not disable it because older patient-release documentation called it disabled. No compiler, clinical prompt, backend, or hosting update is part of this reconciliation.

The owner reported publishing and successfully generating a simple note. That is owner-reported functional evidence, not proof of the patient-enabled artifact's identity. The dispatcher still observed `main.174f2ef8.js` on both live aliases afterward. Treat this combined build as pending owner publication until its manifest matches the live site. Rebuild from reconciled source; the pre-existing `build/` is historical output.

## Custom Instructions restoration: 2026-09-26

The live editor was hidden because the frontend build omitted `REACT_APP_CUSTOM_INSTRUCTIONS_ENABLED`, and the service required an explicit true value. The service now defaults to available; explicit `false` remains an emergency opt-out. Existing users' saved source and profiles were not changed.

Fresh production verification superseded the August launch-blocker notes: the SQS worker mapping is enabled at batch size 1, `SOATP-MetaPrompter` is Active/Successful on Astra, and `transcriptToNoteV2` has `CUSTOM_INSTRUCTIONS_RUNTIME_ENABLED=true`. A synthetic Cognito login exercised authenticated AppSync acceptance, idempotency, queue/provider compilation to READY/CUSTOM in about 103 seconds, source round-trip, and disable preservation. Its profile remains disabled and its login was deleted. A second disposable login confirmed the actual configured Amplify client and generated query. No provider keys, real user preferences, or note-generation configuration were changed.

The production build succeeded with existing lint/Browserslist warnings. All 24 focused Settings, service, and current workflow tests passed. The full isolated-tip suite had 79 passing tests and two pre-existing `DemoLandingPage.test.jsx` failures: it still expects four scheduler links and the overview video intentionally removed from `/demo`. Those assertions and the landing implementation were left unchanged.

Production hosting is S3 bucket `chironote4-20240825113940-hostingbucket-prod`, served by CloudFront `E34RPJ5SU5J7IX`; the Amplify console branches are not the live custom-domain hosting path. A frontend-only publish uploaded four new immutable JS/source-map objects, then conditionally replaced the manifest and index against their backed-up ETags. It did not run Amplify push or modify the backend. CloudFront invalidation `I7DVAZ5382BCGD9MKZJRBZ33C8` completed.

- Previous main/authenticated bundles: `main.01200898.js`, `982.27c37cce.chunk.js`.
- Restored main/authenticated bundles: `main.74aa16ed.js`, `982.bd1a2e25.chunk.js`.
- The other 68 manifest assets, including landing bundles, styles, and workflow media, are unchanged. Thirteen pre-existing landing source/media files were hash-checked and preserved. The release was built in the original checkout to include the already-live but uncommitted workflow-media changes; rebuilding only Git HEAD would regress them.
- The live Settings route serves the new main bundle. After an initial transient session-verification failure, the signed-in browser loaded the enabled profile and displayed the Update dialog with saved text. No edit was submitted on the user's account.

Release evidence, candidate artifacts, backend checks, build/test output, screenshot, pre-release index/manifest, and guarded rollback script are outside Git at `C:/Users/nikit/.codex/release-evidence/custom-instructions-20260926/`. Rollback runs `node rollback-frontend.cjs` from that directory only on an authorized rollback request. It verifies that the current index and manifest still match this release before restoring the originals and invalidating CloudFront; old immutable assets were retained.

The July/August sections below are historical evidence, not the current live feature state.

## Current patient release state — 2026-10-10

The patient web source and required compatibility/retention updates are merged. The existing production API update and runtime cutover completed with the AppSync clinical-write guard enabled, Notes identity/recovery protections preserved, intended new services active, and both legacy dispatcher mappings disabled. A feature-enabled website build passed locally but remains unpublished; only the owner publishes. Authenticated synthetic acceptance passed across four fictional patients and seven visits: audio/transcription, initial/follow-up save, diagnosis correction, stale-conflict protection, missing-patient handling, generic-write guard, retry, reassignment, re-exam reconciliation and PDF export. The exported PDF text was checked against saved bodies and each page visually reviewed. See [cutover and acceptance evidence](patient-infrastructure-release.md).

Clinical prose/coding prompts and the Custom Instructions compiler remain unchanged; broad prompt review is deferred. The accepted scope includes only the approved re-exam diagnosis classifier and speaker-role integration. After the owner publishes, run a real-microphone smoke test and review the live patient screens. Physical iPhone/Android coverage and native/extension publication remain separate later work; the synthetic browser checks do not claim those devices were tested.

The live website publish route was verified from the current hosting backup and configuration: CloudFront distribution `E34RPJ5SU5J7IX` for `chironote.ai` and `www.chironote.ai`, backed by S3 bucket `chironote4-20240825113940-hostingbucket-prod` in `us-east-2`. Do not infer the live host from a separate Amplify app's branch listing. The owner should build from the reconciled original local folder at merged `origin/prod`, verify the patient UI/export build flags, confirm the AWS account and destination, sync without deleting unrelated objects, then invalidate CloudFront. The pre-publication recovery archive and exact hash are recorded below.

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
- the asynchronous Custom Instructions Settings flow and installed backend control plane. At that historical checkpoint it remained feature-flagged off because the queue-to-worker event-source mapping, reserved-concurrency decision, authenticated provider end-to-end test, and runtime configuration verification are not complete.

The UI refactor is large in file movement but intended to preserve behavior. The recording implementation is not behavior-neutral: it changes where cleanup, upload, fallback, and generation responsibilities live.

## Owner publication and post-publication checks

The authenticated synthetic release checks and local tests/build are complete. The prepared website build remains unpublished; publication follows the existing owner-operated release process. This record does not add an approval gate. During that publish step, use the intended merged commit and feature-enabled build, verify the origin and consult the [recovery evidence](#rollback-evidence-and-recovery-copy).

1. In `C:/Users/nikit/ChiroNote/website/chironoteV4`, verify `prod` matches the intended merged `origin/prod` commit. Preserve private local files. Run the test suite and `npm run build`; `.env.production` supplies `REACT_APP_PATIENT_NOTES_ENABLED=true`, `REACT_APP_PATIENT_CAPTURE_ENABLED=true` and `REACT_APP_PATIENT_EXPORT_URL=https://g6irrdqen2ig24qnenisyxvwre0mihei.lambda-url.us-east-2.on.aws/`. Check higher-priority environment/local-file overrides. Use `npm ci` if dependencies need installation.
2. Confirm the signed-in website points at the intended production AppSync API and the export endpoint. Confirm the AWS identity is in account `026090532772`, and verify the target CloudFront distribution aliases and S3 origin before uploading.
3. Publish through the verified S3/CloudFront route. Preserve unrelated bucket keys; do not use a bucket-wide delete. Invalidate CloudFront after upload.
4. After publication, compare the live `/asset-manifest.json` with the release build, sign in, review patient screens, and run one short real-microphone recording through note save. Check transcription and saved-note acknowledgments without exposing transcripts in logs.
5. Record the commit, build asset hashes, distribution invalidation and smoke-test result in this concept and `knowledge/log.md`.

## Separate validation boundaries

Clinical-quality approval and the planned prompt review were not part of this release. The exact live synthetic cases do not establish language accuracy/latency for every provider configuration. Physical iPhone/Android permission/background/rotation/auth flows, and native or extension publication, remain outside this website acceptance. The patient release did not change the compiler or broad clinical prompts. This reconciliation preserves the separately verified September Custom Instructions restoration.

## Separate known risks from the July 2026 review

The July 15 review recorded 89 `npm audit --omit=dev` findings (including 2 critical and 28 high) and hook dependency warnings in Dictation, Clipboard and Smart Editor. This patient release did not rerun that audit or resolve those items; they are not established as cleared here. They remain separate maintenance risks, not patient-acceptance results.

The same earlier review required a FIFO queue-to-worker check, a reserved-concurrency decision, an authenticated provider-backed terminal-state test and confirmation of the intended AppSync target before enabling Custom Instructions. Those historical gates are superseded by the September 26 restoration evidence above; they are not current blockers. This reconciliation does not repeat authenticated production testing or change the compiler.

## Rollback evidence and recovery copy

The verified pre-publication website copy is `work/release/backups/website-live/website-before.zip`, SHA-256 `712678340f427161d523aaaa86b6a8f694daa4d6b2eb05c957651b3fe43f70dc`; its adjacent `manifest.json` contains per-object hashes, `ContentType` and `Metadata` fields (no `CacheControl` values were captured). The archive has 80 selected current assets and public objects (27,706,511 bytes uncompressed). ETags were checked during capture, the inventory was unchanged across the backup, ZIP integrity passed, and bucket versioning is disabled. Restore only the captured keys with their recorded metadata, retain other bucket objects, then invalidate CloudFront. The copy is a task-local Windows artifact, not a Git file; the owner must confirm it is available and its hash matches before using it.

## Frontend correction — 2026-10-11

The October 11 frontend correction restores the original History popup/transcript controls, bounds recording layout, makes patient lookup type-to-search, keeps visit fields on Patients, moves Save to the existing toolbar and aligns patient/signature styling with the product. It preserves the October 10 reconciliation and patient backend contracts. Local generated GraphQL/editor settings predate the correction and remain uncommitted/preserved. This source correction does not publish the website or modify AWS, schema, prompts or patient data. The owner guide records the new merged commit separately.

## Provenance

Synthesized from Git branch and commit history; [package.json](../../package.json); the dated July 2026 website fingerprint and dependency review; current patient-notes and recording implementations; October 10 read-only hosting/runtime verification; the feature-enabled build and authenticated synthetic acceptance evidence kept in the release task; and the website recovery manifest. Website publication remains a separate owner action; this documentation records evidence but does not publish.

October 11 source update: .env.development supplies the same public patient flags and HTTPS export endpoint as .env.production for plain npm start. Restart the development server to load changed environment defaults. Local export calls the existing authenticated production export service; validation uses fictional fixtures only. Patient deletion requires the coordinated audio replay guard and patient API release before user acceptance.
