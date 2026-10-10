---
type: release-operations
title: "Patient infrastructure installation"
description: "Verified October 10 AWS installation, compatibility settings, recovery evidence and remaining activation work."
resource: "../../amplify/backend/api/chironotev4/stacks/CustomResources.json"
tags: [release, deployment, patient-notes, recovery]
---

# Patient infrastructure installation — October 10, 2026

The owner explicitly authorized required production infrastructure while clinical prompts remain deferred. API source is prod commit 7547cfa8649575290184ca1222d9a6eb62fa87c0. This installs the backend only; the owner has not published this website update.

## Verified AWS state

Account 026090532772, region us-east-2, existing Amplify root amplify-chironotev4-prod-4c026 and AppSync API rmegidkuengyxgmzkrhmqdxwjm. The root, API, Notes, UserSubscription and CustomResources stacks completed their updates. Every preexisting physical resource ID was preserved. The 17 existing Custom Instructions resources remain, and the custom stack now has 41 resources with the same SOATP-MetaPrompter binding.

Notes-rmegidkuengyxgmzkrhmqdxwjm-prod retains its owner/timestamp key and now has active notesByOwnerPatient indexing. The new Patients table is active. Both tables have deletion protection and PITR; Notes also has Retain deletion/replacement policies. The pre-release Notes on-demand backup is available, and the recovery window began October 10. MonthlyCleanUp is disabled and its function is inert: all notes, including unassigned, remain until explicit deletion.

The API retains Cognito authentication and enables IAM for the committed-state publisher. PatientNotesApi resolves to ChiroNote-PatientNotesApi-prod. AppSync PATIENT_WRITES_GUARDED is explicitly false, preserving legacy owner-authenticated writers while patient Save is off. Six synthetic mapping-template checks verified that absent/true flags enforce the new restriction and false allows the legacy body path. These checks did not mutate patient data.

After the resource update, the owner-confirmed testing account refreshed its existing recent history successfully with the same three rows and no visible error. This was a read-only legacy compatibility check; generation, patient Save and PDF acceptance remain pending.

Four new companion functions, six runtime roles, four encrypted FIFO queues including DLQs, and the streaming PDF URL were separately created from reviewed merged artifacts. Patient/export/context/re-exam flags remain false; both retry mappings are Disabled. The existing generator, audio worker, compiler and legacy dispatcher retain their previous code and full runtime configuration. No clinical prompt record was published or selected.

## Deployment mechanics and recovery

Use the override-aware plain amplify build command with the locked backend dependencies. The installed CLI's api gql-compile omits resource overrides. Its ignored cloud baseline archive was stale: the release reconciled that local baseline against actual live templates and S3 deployment assets before deployment, preserving all 17 existing custom resources. No generated template was used as the editing source.

The first live attempt rolled back when Amplify's older federated deployment role lacked API environment-variable permissions; its iterative rollback also removed the newly built index. An ARN-scoped temporary policy did not grant those actions and was removed. The successful retry used the already-authorized default AWS CLI profile, verified as the Executive principal in the target account, through task-local ignored local-aws-info.json. No lasting deployment-role permission expansion was made. Future deployment must verify the account and use a principal with the required actions; do not silently revert to that older deployment role.

Original live templates/schema and five Lambda ZIP/configuration snapshots are preserved outside Git in the October 10 Codex task's work/release/backups. Sensitive snapshots and new HMAC secrets use Windows DPAPI. Bootstrap hashes, revisions, mappings and verification are in the same task's release ledger. Do not use the stale pre-reconciliation Amplify archive to restore custom resources.

## Remaining activation work

Review and publish the protected clinical blueprint; deploy the new generator/audio/compiler versions and matching role/environment configuration; quarantine legacy body-writing retries; set the clinical-write guard true in that coordinated cutover; then run authenticated synthetic capture, Save/conflict/reassignment and saved-data PDF acceptance on testing@chironote.ai. Luna's three fictional patients/five visits are prepared, but not inserted. Website publication is owner-operated; extension/native publication and physical-device acceptance remain later steps.

Before activation, rollback consists of leaving companion features and queue mappings off while preserving additive data. After clinician edits exist, never restore an unconditional old writer or disable the clinical-write guard. Automatic deletion remains retired through any rollback.

## Provenance

- [Custom resource definitions](../../amplify/backend/api/chironotev4/stacks/CustomResources.json), [Notes retention override](../../amplify/backend/api/chironotev4/override.ts) and [patient behavior](../architecture/patient-notes.md).
- Explicit October 10 AWS CloudFormation/DynamoDB/AppSync/Lambda metadata checks and synthetic feature-off probes; detailed evidence and encrypted recovery artifacts are preserved outside Git as described above.
