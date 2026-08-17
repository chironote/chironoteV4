---
type: product-concept
title: "Billing and User Settings"
description: "Authenticated subscription, usage, lifetime impact, and custom note-style preference ownership."
resource: "../../src/components/Billing/Billing.jsx"
tags: [chironote, billing, settings, subscriptions, custom-instructions]
---

# Billing and User Settings

Billing and Settings are separate authenticated destinations. Billing owns commercial and current-period concerns; Settings owns lifetime impact and note-style preferences.

## Billing

`/app/billing` queries `getUserSubscription` using the authenticated Cognito subject. It presents current and available plan cards, the existing Stripe pricing route, the existing billing-portal Lambda action, remaining recording/dictation hours, and free-tier Smart Edits. Missing records and nullable fields use safe free-tier/zero defaults, but query failures remain a visible retryable error so unknown data is never presented as confirmed zero. Professional usage is explicitly labelled Unlimited with an icon and text.

`/app/account` redirects with replacement to `/app/billing`, and credit-limit redirects use Billing directly. Existing `Account_Page` and `account_interaction` analytics identifiers remain for historical dashboard compatibility.

## Settings

`/app/settings` displays only `UserSubscription.hoursSavedLifetime`, formatted with at most one fractional digit and a null-safe zero fallback. It deliberately excludes current-period `hoursSaved`.

Custom Instructions is controlled by the single global `REACT_APP_CUSTOM_INSTRUCTIONS_ENABLED` flag. Its card distinguishes never-configured, disabled-with-saved-source, first compilation, update compilation, enabled, failed-with-active, failed-with-default, unavailable, and unknown states. The browser never requests, displays, stores, or logs the ten generated SOATP instructions.

All custom-instruction networking is isolated in `src/services/customInstructions.js` and uses the configured authenticated Amplify/AppSync client. The service imports the checked-in generated operations rather than embedding a second set of GraphQL strings. `getMyCustomInstructions` returns the safe source/status projection, `startMyCustomInstructionsCompilation` durably accepts an idempotent job, and `disableMyCustomInstructions` selects defaults without deleting source text. Public Lambda URLs and long browser-held requests are outside this contract.

Settings polls persisted AppSync state every three seconds for the initial 30 seconds and every nine seconds thereafter. It pauses after a five-minute client ceiling with “still working” guidance, then resumes when Settings regains focus or the progress dialog is reopened. Request sequencing prevents an older overlapping query from overwriting newer server state. Timer phrases are explicitly approximate; only `READY` for the current server job produces success. During a first compile defaults remain active, while an update keeps the previous valid custom set active. Failures preserve both the submitted source and any prior active set. An uncertain start response is reconciled through AppSync, and retrying the same source reuses its request ID so an accepted-but-interrupted request does not create a second job.

As of 2026-08-16, the production Amplify stacks contain the Cognito-authenticated AppSync operations and resolvers, PromptProfiles persistence, encrypted FIFO compile queue and DLQ, least-privilege roles, alarms, and the active Node.js 24 MetaPrompter Lambda. The frontend `src/graphql/schema.json`, `queries.js`, and `mutations.js` are reconciled to that deployed public contract without changing `amplify/backend/api/chironotev4/schema.graphql`. The browser projection does not include compiled prompts.

The feature is not release-ready yet: the queue has no Lambda event-source mapping,
reserved concurrency of two is unresolved because of the account quota, and no
authenticated browser-to-provider end-to-end test has demonstrated a real `READY` or
`FAILED` transition. `REACT_APP_CUSTOM_INSTRUCTIONS_ENABLED` must remain off until the
owner separately authorizes enablement after those gates and the intended runtime
Amplify configuration are verified. The tested consumer source is merged but has not
been uploaded to the production `transcriptToNoteV2` Lambda. Use the
[launch handoff](../operations/custom-instructions-launch-handoff.md) before continuing.

Because the runtime Amplify configuration is ignored by Git and the generated frontend schema can lag the deployed API, every enablement review must verify the configured AppSync endpoint identity and refresh the frontend schema/operations from that exact API before authenticated testing.

## Provenance

Derived from [`Billing.jsx`](../../src/components/Billing/Billing.jsx), [`Settings.jsx`](../../src/components/Settings/Settings.jsx), [`CustomInstructionsDialog.jsx`](../../src/components/Settings/CustomInstructionsDialog.jsx), [`customInstructions.js`](../../src/services/customInstructions.js), the generated [`queries.js`](../../src/graphql/queries.js) and [`mutations.js`](../../src/graphql/mutations.js), and [`AuthenticatedApp.jsx`](../../src/components/AppShell/AuthenticatedApp.jsx). Backend-state statements reflect the read-only production stack and AppSync schema review completed on 2026-08-16, plus the read-only Lambda/worktree reconciliation completed on 2026-08-17.
