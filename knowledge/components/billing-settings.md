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

All custom-instruction networking is isolated in `src/services/customInstructions.js` and uses the configured authenticated Amplify/AppSync client. `getMyCustomInstructions` returns the safe source/status projection, `startMyCustomInstructionsCompilation` durably accepts an idempotent job, and `disableMyCustomInstructions` selects defaults without deleting source text. Public Lambda URLs and long browser-held requests are outside this contract.

Settings polls persisted AppSync state every three seconds for the initial 30 seconds and every nine seconds thereafter. It pauses after a five-minute client ceiling with “still working” guidance, then resumes when Settings regains focus or the progress dialog is reopened. Request sequencing prevents an older overlapping query from overwriting newer server state. Timer phrases are explicitly approximate; only `READY` for the current server job produces success. During a first compile defaults remain active, while an update keeps the previous valid custom set active. Failures preserve both the submitted source and any prior active set.

As of 2026-08-16, this is a frontend contract only. The repository does not yet contain the matching AppSync schema, resolvers, PromptProfiles persistence, queue integration, or MetaPrompter Lambda. `REACT_APP_CUSTOM_INSTRUCTIONS_ENABLED` remains unset locally and must stay off in release environments until those operations exist. The Lambda/backend implementer should treat `src/services/customInstructions.js` as the browser-facing GraphQL contract and the multi-repository implementation brief as the worker/storage contract.

## Provenance

Derived from [`Billing.jsx`](../../src/components/Billing/Billing.jsx), [`Settings.jsx`](../../src/components/Settings/Settings.jsx), [`CustomInstructionsDialog.jsx`](../../src/components/Settings/CustomInstructionsDialog.jsx), [`customInstructions.js`](../../src/services/customInstructions.js), and [`AuthenticatedApp.jsx`](../../src/components/AppShell/AuthenticatedApp.jsx).
