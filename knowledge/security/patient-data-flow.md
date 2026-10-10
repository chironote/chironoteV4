---
type: implementation-contract
title: "Patient data flow and remaining release checks"
description: "Patient data flow and remaining release checks behavior, ownership and release boundaries."
resource: "../../src"
tags: [patient-notes, contracts, release]
---

# Patient data flow and remaining release checks

Patient names/DOB/sex/DOI live in the owner-scoped Patients directory. Notes keep owner+timestamp keys plus patient ID, visit metadata, body/typed diagnosis pair, source provenance and narrow revision/review fields. Signature name/NPI remain dedicated fields on UserSubscription. Name claims normalize Unicode/case/spacing and transact with profiles; account aliases resolve only from a verified Cognito token.

The browser holds clinical drafts in memory. Signed owner requests enter a bounded AppSync Lambda resolver; generation and Save read stored history under owner/patient authorization and reconcile the final body/state before a conditional transaction. Selected historical clinical bodies and effective diagnoses are sent to the existing note-generation/coding providers. Reconciliation uses the protected coding rules, structured output and provider search where new mappings require verification. This expands the data supplied to existing providers; provider arrangements and access audits require release-owner verification. No clinical content belongs in metrics, URLs, generic settings or raw console logs.

Export sends patient ID, saved-note keys, explicitly confirmed dates and review acknowledgments. The PDF service verifies Cognito first, reads only owner-eligible saved rows and stored signature, renders an in-memory Unicode PDF, then streams bytes. No provider, external asset load, S3 export job, email or share link is introduced. Binary length and MIME validation reject incomplete downloads.

The live retention audit found TTL disabled but an enabled newest-100 cleanup; retention is ALL notes until explicit deletion. The inert cleanup and disabled schedule are deployed and verified. Notes has an available on-demand backup and enabled 35-day PITR; both Notes and Patients have verified deletion/recovery protection. The additive API/index installation is recorded in [release evidence](../operations/patient-infrastructure-release.md). Provider arrangements, native device behavior and authenticated IAM/cross-owner integration remain activation checks. Explicit deletion remains the existing owner-authorized flow. This document is not a regulatory compliance declaration.

## Provenance

- [Current implementation](../../src) is authoritative for behavior.
- [Repository guidance](../../README.md) and this concept describe the local candidate, not proof of deployment.
