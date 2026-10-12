---
type: implementation-contract
title: "Patient-linked saved notes"
description: "Patient-linked saved notes behavior, ownership and release boundaries."
resource: "../../src"
tags: [patient-notes, contracts, release]
---

# Patient-linked saved notes

This Android catch-up candidate ports patient workflows from production web commit 142383e. The committed production build configuration enables the patient feature; this source candidate is not a published Android release. Installed native phones support persistent clipboard Save while mobile web retains its desktop-only Save predicate. AuthUI lifecycle fixes already exist in baseline 6537280 and were not reapplied.

`REACT_APP_PATIENT_NOTES_ENABLED=true` exposes patient/history features. `REACT_APP_PATIENT_CAPTURE_ENABLED=false` independently stops new patient capture without hiding saved-note tools. Compact capture selects existing/new patient or leaves it unassigned, shows the chosen name with × reset, defaults existing patients to follow-up and new names to initial exam, and offers Re-Exam for existing patients. Saved history is automatic. Export metadata correction retains date/type/history controls. Patient metadata is captured once outside generic noteSettings. Microphone acquisition begins from the gesture before authentication/eligibility network waits. Cancelled permission requests and old stream completions cannot attach to a newer recording. Language preferences are retired; clients send auto and the server retains the installed-client adapter.

`src/services/patientNotes.js` sends signed access tokens to the website-owned AWSJSON operations. Names use a short-lived in-memory owner-keyed cache. Clinical drafts are memory-only and never enter localStorage, analytics or URLs. The authenticated workspace remounts on principal change; sign-out/unmount clears it. `src/components/Patients` owns patient selection, diagnoses, deletion/reassignment, export and draft guards; AppShell owns the shared clipboard. Historical row titles split the current directory name from visitLabel, retaining noteLabel only as a legacy fallback.

Patients visits and history drops load an authoritative getSavedNote record into the single clipboard editor. Desktop/native Save binds its timestamp/version and draft to atomic server reconciliation. Explicit diagnosis changes require code/description confirmation without user-facing status controls. Save failure, conflict or ambiguous diagnosis keeps the draft. Navigation/back uses the data-router draft guard; sign-out and local transitions use the same guard. Save does not regenerate prose, charge hours or rewrite later visits. Generation EOF is not a saved acknowledgment: retrieve the completed server note, preserve rejected output as a preview, and show a separate error.

Patient names come from the directory, independently of editable labels. The popup patient opens compact reassignment with destination diagnosis copying; zero-visit source deletion needs warning acknowledgment. Patient deletion shows a fresh server summary and requires explicit acknowledgment for permanent deletion of the profile and linked notes/transcripts. Patients has no separate Visit Details action; the helper remains for export date corrections. Home precedes Patients/Billing/Settings/Logout except on `/app`; Recent Notes has no counter.

PDF selection defaults to all complete saved notes, with optional inclusive date ranges and individual checkboxes. It requires “I acknowledge that the clinical information herein is accurate.” plus service-date, injury-conflict, signature and review validation. After MIME/length/20MB validation, native delivery writes a generic filename under app Cache and opens Share. Cancellation/failure deletes it; success retains it for ten minutes so receiving apps can read it. Startup, foreground and export clean expired files if the timer was interrupted. Browser export retains its download anchor. No clinical identifiers enter filenames/logs. Hardware share and lifecycle acceptance remains unverified.

Web export reads the complete strong owner inventory (not the recent-history window), deduplicates pages, preserves selection, checks saved service dates/injury-date conflicts/review acknowledgment and sends saved keys only. The separate server PDF owns note/profile/signature reads and rendering. Configure Signature saves only Name/NPI on UserSubscription. The configured export endpoint must be HTTPS.

Required coordinated release: additive schema/GSI and Cognito+IAM resolvers, dedicated API/generator/retry roles and trusted queues, protected schema-3 blueprint after clinical review, guarded body writers, retention until explicit deletion, then staged client enablement. Retire the newest-100 cleanup and quarantine the legacy SQSDispatcher before Save. Do not disable the backend guard or restore an old body writer after clinician edits exist.

Local validation uses synthetic patients, mocked services, unit tests and feature-enabled production builds. Browser responsive QA is a local fixture harness importing these actual components, not a live backend sign-off. Actual iPhone/Android permission/background/rotation/auth checks, provider language accuracy/latency and approved cross-service staging remain release gates.

## Provenance

Patient identities, Save request IDs and generic PDF suffixes use [randomId](../../src/utils/randomId.js), with native UUID support or a WebCrypto secure-byte version-4 fallback for older supported WebViews. Test coverage checks version/variant bits and refuses weak fallback identifiers.

- [Native PDF delivery](../../src/services/patientPdfDelivery.js), [Patients workflows](../../src/components/Patients/README.md), [shared clipboard shell](../../src/components/AppShell/README.md), and [native platform adapter](../../src/services/nativePlatform.js).

- [Current implementation](../../src) is authoritative for behavior.
- [Repository guidance](../../README.md) and this concept describe the local candidate, not proof of deployment.

Compact clipboard controls can wrap at 900px; phones retain labelled New Note and independent context-dependent Save while Smart Editor is unavailable throughout installed Android apps (phones and tablets) and on phone web layouts; desktop web retains it; the established section-copy rail accommodates 44px touch targets. Navigation uses the scrollable compact menu through 1024px, including landscape. Older WebViews use secure browser crypto fallback and length-indexed export/focus operations; source compatibility changes do not establish device-tested support.
