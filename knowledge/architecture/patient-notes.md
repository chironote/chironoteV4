---
type: implementation-contract
title: "Patient-linked saved notes"
description: "Patient-linked saved notes behavior, ownership and release boundaries."
resource: "../../src"
tags: [patient-notes, contracts, release]
---

# Patient-linked saved notes

This is a disabled-by-default source candidate, not a deployed release. iOS keeps native edit/copy behavior with no new clinical-body Save. Native presentation tokens, scoped ios.css and status-bar appearance were ported from the original dirty checkout; unrelated original changes remain untouched.

`REACT_APP_PATIENT_NOTES_ENABLED=true` exposes patient/history features. `REACT_APP_PATIENT_CAPTURE_ENABLED=false` independently stops new patient capture without hiding saved-note tools. The capture picker supports existing/new patient or Skip, local service date, optional injury date, explicit visit type or automatic first-visit resolution, and an explicit no-history choice. Patient metadata is captured once outside generic noteSettings. Microphone acquisition begins from the gesture before authentication/eligibility network waits. Cancelled permission requests and old stream completions cannot attach to a newer recording. Language preferences are retired; clients send auto and the server retains the installed-client adapter.

`src/services/patientNotes.js` sends signed access tokens to the website-owned AWSJSON operations. Names use a short-lived in-memory owner-keyed cache. Clinical drafts are memory-only and never enter localStorage, analytics or URLs. The authenticated workspace remounts on principal change; sign-out/unmount clears it. `src/components/Patients` owns the picker, current patient name, saved-note editor, metadata and draft guards. Historical row titles split the current directory name from visitLabel, retaining noteLabel only as a legacy fallback.

Desktop Save binds the exact note timestamp/version and draft to atomic server reconciliation. Save failure, conflict or ambiguous diagnosis keeps the draft. Navigation prompts Save and continue / Discard changes / Keep editing; browser close uses beforeunload. Save does not regenerate prose, charge hours or rewrite later visits. Generation EOF is not a saved acknowledgment: retrieve the completed server note, preserve rejected output as a preview, and show a separate error. Native/mobile corrections remain local unless saved later on desktop. Profile suggestions are explicit accept/dismiss actions and become stale after body edits.

Web export reads the complete strong owner inventory (not the recent-history window), deduplicates pages, preserves selection, checks saved service dates/injury-date conflicts/review acknowledgment and sends saved keys only. The separate server PDF owns note/profile/signature reads and rendering. Configure Signature saves only Name/NPI on UserSubscription. The configured export endpoint must be HTTPS.

Required coordinated release: additive schema/GSI and Cognito+IAM resolvers, dedicated API/generator/retry roles and trusted queues, protected schema-3 blueprint after clinical review, guarded body writers, retention until explicit deletion, then staged client enablement. Retire the newest-100 cleanup and quarantine the legacy SQSDispatcher before Save. Do not disable the backend guard or restore an old body writer after clinician edits exist.

Local validation uses synthetic patients, mocked services, unit tests and feature-enabled production builds. Browser responsive QA is a local fixture harness importing these actual components, not a live backend sign-off. Actual iPhone/Android permission/background/rotation/auth checks, provider language accuracy/latency and approved cross-service staging remain release gates.

## Provenance

- [Current implementation](../../src) is authoritative for behavior.
- [Repository guidance](../../README.md) and this concept describe the local candidate, not proof of deployment.
