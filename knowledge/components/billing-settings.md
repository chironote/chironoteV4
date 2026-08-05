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

Custom Instructions has separate Loading, Disabled, Enabled, Error, and Unavailable states. Availability requires both `REACT_APP_CUSTOM_INSTRUCTIONS_ENABLED=true` and `REACT_APP_CUSTOM_INSTRUCTIONS_URL`. Enabled is server-confirmed. Users edit only the original natural-language instructions; generated SOATP fields are not requested, displayed, stored, or logged.

All custom-instruction networking is isolated in `src/services/customInstructions.js`: one authenticated POST endpoint with `get`, `apply`, and `reset` actions, Cognito ID-token authorization, normalized response validation, stable error messages, and a 105-second abort timeout. Apply and reset verify the returned enabled state before the UI changes.

## Provenance

Derived from [`Billing.jsx`](../../src/components/Billing/Billing.jsx), [`Settings.jsx`](../../src/components/Settings/Settings.jsx), [`customInstructions.js`](../../src/services/customInstructions.js), and [`AuthenticatedApp.jsx`](../../src/components/AppShell/AuthenticatedApp.jsx).
