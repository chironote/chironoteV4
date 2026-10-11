---
type: release-operations
title: "Patient infrastructure installation"
description: "Verified October 10 production cutover, preserved recovery settings, active writer guard and synthetic release acceptance."
resource: "../../amplify/backend/api/chironotev4/stacks/CustomResources.json"
tags: [release, deployment, patient-notes, recovery]
---

# Patient infrastructure cutover — October 10, 2026

The owner authorized the required production infrastructure while clinical prompt changes remained deferred. The source-managed API cutover was built from web commit `cc6838853ec611ccde1115495fd00a6059e8d9b1`. The existing Amplify production API stack completed its update; the website itself has not been published. The first authenticated capture was an earlier rollout checkpoint; all planned synthetic acceptance checks later passed, as recorded below. The read-only infrastructure evidence is in the October 10 task’s `work/release/post-amplify-verification.json`, `current-runtime-audit.json`, and `cutover-ledger.json`.

## Verified AWS state

Account 026090532772, region us-east-2, existing Amplify root `amplify-chironotev4-prod-4c026` and AppSync API `rmegidkuengyxgmzkrhmqdxwjm`. The October 10 post-push read verified the root, API, Notes and CustomResources stacks at `UPDATE_COMPLETE`. The existing Notes physical resource and DynamoDB table ID match the pre-push backup; the existing custom-resource stack was updated in place, preserving its prior resources and SOATP-MetaPrompter binding.

`Notes-rmegidkuengyxgmzkrhmqdxwjm-prod` retains physical ID `Notes-rmegidkuengyxgmzkrhmqdxwjm-prod` and DynamoDB table ID `f058ae05-747d-41f2-a6ca-3f17c5f98a65`; its owner/timestamp primary key is unchanged and `notesByOwnerPatient` is active. The Patients table is active. Both tables retain deletion protection and 35-day PITR; Notes also has CloudFormation `DeletionPolicy: Retain` and `UpdateReplacePolicy: Retain`. The pre-release Notes backup remains available. Monthly cleanup is disabled and its function is inert, so notes remain until explicit owner deletion.

The API retains Cognito authentication and IAM for the committed-state publisher. `PatientNotesApi` resolves to `ChiroNote-PatientNotesApi-prod`. The deployed processed AppSync template and active create/update post-auth functions confirm `PATIENT_WRITES_GUARDED=true`; the guard rejects protected generic clinical writes. The live runtime audit also recorded patient notes, context, re-exam, and export service flags enabled. The infrastructure verification itself did not create or change patient data; later, the explicitly authorized synthetic acceptance wrote seven fictional test visits in the testing account.

## Synthetic release acceptance — October 10, 2026

Authenticated acceptance passed with four conspicuously fictional patients and seven visits in `testing@chironote.ai`. One initial visit used a synthetic WAV through the normal S3/SQS/transcription path and produced Doctor/Patient speaker labels; the remaining visits used seeded fictional transcripts. Initial and follow-up notes saved successfully, follow-up history was correct, a manual diagnosis correction persisted and carried forward, and re-exam state marked one code continuing and another resolved. Stale Save returned `CONFLICT` without changing the saved note; an unavailable patient returned `PATIENT_UNAVAILABLE`; a generic protected-field write was rejected by the guard without changing the note. Retry of a completed note had no batch failures and preserved its body/diagnoses/revision. Reassignment required confirmation, preserved the note body and passed acknowledged Save after returning to its original patient.

Two saved visits exported to a three-page PDF. Text was checked against both saved note bodies, the synthetic demographics and service dates were present, missing injury date rendered as not recorded, and no superseded diagnosis code appeared. All three pages were visually reviewed for legibility and clipping. Temporary localhost allowances for PDF/S3 were restored; the final runtime audit confirmed active intended services, enabled replacement mappings, disabled legacy mappings and the clinical-write guard. Clinical prompts were preserved; broad prompt review remains deferred.

The Oct 10 cutover enabled the reviewed generator, patient API/retry services, audio worker and publication retry using their dedicated roles and queues. The source audio mapping, note-generation retry mapping and audio-publication retry mapping are enabled. Legacy SQSDispatcher mappings are disabled; in-flight dispatcher invocations were allowed to drain for 300 seconds, and queue messages were preserved/quarantined rather than purged or drained. The existing clinical prompt text and selected prompt version were preserved; no clinical prompt record was changed. See the task-local runtime audit for exact code hashes, revisions and mapping states.

## Deployment mechanics and recovery

Use the override-aware plain amplify build command with the locked backend dependencies. The installed CLI's api gql-compile omits resource overrides. Its ignored cloud baseline archive was stale: the release reconciled that local baseline against actual live templates and S3 deployment assets before deployment, preserving all 17 existing custom resources. No generated template was used as the editing source.

The first live attempt rolled back when Amplify's older federated deployment role lacked API environment-variable permissions; its iterative rollback also removed the newly built index. An ARN-scoped temporary policy did not grant those actions and was removed. The successful retry used the already-authorized default AWS CLI profile, verified as the Executive principal in the target account, through task-local ignored `local-aws-info.json`. The final command was `amplify push --yes`; it updated the existing Amplify root/API/model stacks without creating a new stack or making a lasting deployment-role permission expansion. Future deployment must verify the account and use a principal with the required actions; do not silently revert to that older deployment role.

Original live templates/schema and five Lambda ZIP/configuration snapshots are preserved outside Git in the October 10 Codex task's work/release/backups. Sensitive snapshots and new HMAC secrets use Windows DPAPI. Bootstrap hashes, revisions, mappings and verification are in the same task's release ledger. Do not use the stale pre-reconciliation Amplify archive to restore custom resources.

## Remaining owner and device work

Keep the existing clinical blueprint and compiler unchanged while the broad prompt review remains deferred. The writer guard and compatible generator/audio/retry runtimes are active and the synthetic acceptance set has passed. Website publication remains owner-operated and is not complete. After publication, the owner should run a short real-microphone smoke test and review patient screens on the live website. Extension/native publication and physical-device acceptance are separate later steps.

If acceptance finds a blocker before patient edits begin, coordinate any feature or mapping pause while preserving additive data and the active clinical-write guard. After clinician edits exist, never restore an unconditional old writer or disable the guard. Automatic deletion remains retired through any recovery.

## Provenance

- [Custom resource definitions](../../amplify/backend/api/chironotev4/stacks/CustomResources.json), [Notes retention override](../../amplify/backend/api/chironotev4/override.ts) and [patient behavior](../architecture/patient-notes.md).
- Read-only October 10 AWS CloudFormation/DynamoDB/AppSync/Lambda checks and cutover artifact/hash/event evidence are retained in the release task archive outside this repository. The source-managed override, custom-resource definitions and patient behavior are linked above; encrypted recovery artifacts remain outside Git.
