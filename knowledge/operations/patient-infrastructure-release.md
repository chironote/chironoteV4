---
type: release-operations
title: "Patient infrastructure installation"
description: "Verified October 10 production cutover, preserved table recovery settings, active writer guard and remaining website/acceptance work."
resource: "../../amplify/backend/api/chironotev4/stacks/CustomResources.json"
tags: [release, deployment, patient-notes, recovery]
---

# Patient infrastructure cutover — October 10, 2026

The owner authorized the required production infrastructure while clinical prompt changes remained deferred. The source-managed API cutover was built from web commit `cc6838853ec611ccde1115495fd00a6059e8d9b1`. The existing Amplify production API stack completed its update; the website itself has not been published. The first authenticated synthetic capture succeeded; remaining acceptance is pending. The read-only evidence is in the October 10 task’s `work/release/post-amplify-verification.json`, `current-runtime-audit.json`, and `cutover-ledger.json`.

## Verified AWS state

Account 026090532772, region us-east-2, existing Amplify root `amplify-chironotev4-prod-4c026` and AppSync API `rmegidkuengyxgmzkrhmqdxwjm`. The October 10 post-push read verified the root, API, Notes and CustomResources stacks at `UPDATE_COMPLETE`. The existing Notes physical resource and DynamoDB table ID match the pre-push backup; the existing custom-resource stack was updated in place, preserving its prior resources and SOATP-MetaPrompter binding.

`Notes-rmegidkuengyxgmzkrhmqdxwjm-prod` retains physical ID `Notes-rmegidkuengyxgmzkrhmqdxwjm-prod` and DynamoDB table ID `f058ae05-747d-41f2-a6ca-3f17c5f98a65`; its owner/timestamp primary key is unchanged and `notesByOwnerPatient` is active. The Patients table is active. Both tables retain deletion protection and 35-day PITR; Notes also has CloudFormation `DeletionPolicy: Retain` and `UpdateReplacePolicy: Retain`. The pre-release Notes backup remains available. Monthly cleanup is disabled and its function is inert, so notes remain until explicit owner deletion.

The API retains Cognito authentication and IAM for the committed-state publisher. `PatientNotesApi` resolves to `ChiroNote-PatientNotesApi-prod`. The deployed processed AppSync template and active create/update post-auth functions confirm `PATIENT_WRITES_GUARDED=true`; the guard rejects protected generic clinical writes. The live runtime audit also recorded patient notes, context, re-exam, and export service flags enabled. This was an infrastructure cutover only: no patient data was created or changed by the verification.

The previous account-history check was read-only. The first authenticated synthetic capture succeeded. Audio/transcription, saved-note reconciliation/Save and conflict/reassignment cases, publication-retry recovery, and PDF export acceptance remain pending.

The Oct 10 cutover enabled the reviewed generator, patient API/retry services, audio worker and publication retry using their dedicated roles and queues. The source audio mapping, note-generation retry mapping and audio-publication retry mapping are enabled. Legacy SQSDispatcher mappings are disabled; in-flight dispatcher invocations were allowed to drain for 300 seconds, and queue messages were preserved/quarantined rather than purged or drained. The existing clinical prompt text and selected prompt version were preserved; no clinical prompt record was changed. See the task-local runtime audit for exact code hashes, revisions and mapping states.

## Deployment mechanics and recovery

Use the override-aware plain amplify build command with the locked backend dependencies. The installed CLI's api gql-compile omits resource overrides. Its ignored cloud baseline archive was stale: the release reconciled that local baseline against actual live templates and S3 deployment assets before deployment, preserving all 17 existing custom resources. No generated template was used as the editing source.

The first live attempt rolled back when Amplify's older federated deployment role lacked API environment-variable permissions; its iterative rollback also removed the newly built index. An ARN-scoped temporary policy did not grant those actions and was removed. The successful retry used the already-authorized default AWS CLI profile, verified as the Executive principal in the target account, through task-local ignored `local-aws-info.json`. The final command was `amplify push --yes`; it updated the existing Amplify root/API/model stacks without creating a new stack or making a lasting deployment-role permission expansion. Future deployment must verify the account and use a principal with the required actions; do not silently revert to that older deployment role.

Original live templates/schema and five Lambda ZIP/configuration snapshots are preserved outside Git in the October 10 Codex task's work/release/backups. Sensitive snapshots and new HMAC secrets use Windows DPAPI. Bootstrap hashes, revisions, mappings and verification are in the same task's release ledger. Do not use the stale pre-reconciliation Amplify archive to restore custom resources.

## Remaining acceptance and publication work

Keep the existing clinical blueprint and compiler unchanged while the broad prompt review remains deferred. The writer guard and compatible generator/audio/retry runtimes are already active, and the first authenticated synthetic capture succeeded. Complete audio/transcription, saved-note Save/reconciliation, conflict/reassignment, publication-retry, and saved-data PDF acceptance on `testing@chironote.ai`; the prepared fictional cases have not all been exercised. Website publication remains owner-operated and is not complete. Extension/native publication and physical-device acceptance are later steps.

If acceptance finds a blocker before patient edits begin, coordinate any feature or mapping pause while preserving additive data and the active clinical-write guard. After clinician edits exist, never restore an unconditional old writer or disable the guard. Automatic deletion remains retired through any recovery.

## Provenance

- [Custom resource definitions](../../amplify/backend/api/chironotev4/stacks/CustomResources.json), [Notes retention override](../../amplify/backend/api/chironotev4/override.ts) and [patient behavior](../architecture/patient-notes.md).
- Read-only October 10 AWS CloudFormation/DynamoDB/AppSync/Lambda checks and cutover artifact/hash/event evidence are retained in the release task archive outside this repository. The source-managed override, custom-resource definitions and patient behavior are linked above; encrypted recovery artifacts remain outside Git.
