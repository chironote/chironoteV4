---
type: component-readme
title: "Billing and Settings"
description: "Current subscription, usage, settings, and Capacitor billing-boundary behavior."
resource: "../../src/components/Billing/README.md"
tags: [chironote, component, billing, settings, capacitor]
---


> Source: [Billing README](../../src/components/Billing/README.md) and [Settings README](../../src/components/Settings/README.md)

# Billing and Settings

Settings includes the patient PDF signature name/NPI card when patient notes are enabled. The NPI is masked outside Configure Signature; the card remains below Custom Instructions. Native billing remains usage-only and `/app/pricingplans` redirects to Billing.

The authenticated account experience is split between Billing and Settings. Billing is mounted at `/app/billing`, Settings is mounted at `/app/settings`, and `/app/account` is a compatibility redirect to Billing.

## Files

- `Billing/Billing.jsx` renders subscription state and monthly usage, with web-only plan comparison and billing actions.
- `Billing/PriceTable.jsx` embeds the Stripe pricing table used only by the web pricing route.
- `Settings/Settings.jsx` provides lifetime-hours and server-backed Custom Instructions preferences; `CustomInstructionsDialog.jsx` owns source editing and compilation progress.

## Custom Instructions

Android uses the existing Cognito-authenticated AppSync operations to load the safe source/status view, start an asynchronous compilation with an idempotency key, and disable custom instructions without deleting saved wording. There is no direct Lambda endpoint setting. Availability defaults on; the explicit trimmed, case-insensitive `REACT_APP_CUSTOM_INSTRUCTIONS_ENABLED=false` remains an emergency opt-out and prevents these requests. Per-account activation still requires the user's compile action and a server-confirmed active profile.

The editor protects dirty text and retains the existing ProductDialog behavior. An accepted compile starts job-aware polling, not a success message. Approximate progress yields to READY/effective-mode confirmation. Prior active instructions remain active during updates and on failed replacements. Same-source retries reuse the request ID; uncertain starts reload persisted state. Secure request IDs reuse the established Android WebView helper.

Polling slows after 30 seconds, pauses after five minutes with honest guidance, and reloads/resumes on browser focus, native foreground or progress-dialog reopen. Listener cleanup covers delayed registration, and older reads cannot replace newer state. The dialog can be left after the initial 30-second compilation period; reopening recovers server status. Settings retains its colors, type sizes and signature/lifetime cards, with 48px coarse-pointer actions and dialog close targets; see [STYLE](../development/STYLE.md).

The frontend query/mutation documents and only their supporting introspection entries were aligned with the read-only production AppSync export on 2026-10-15. Amplify backend source/infrastructure, note generation, recording, native identity and release versions are unchanged. Offline mocks/schema validation and web builds do not establish authenticated device or store acceptance.

## Important Code Paths

Billing and Settings read the user's subscription record through Amplify GraphQL:

```js
const data = await client.graphql({
  query: getUserSubscription,
  variables: { owner: owner }
});
```

On the website, the subscription tier controls both the active plan card and the main billing action. Free users are sent to `/app/pricingplans`; paid users call the billing portal Lambda and open the returned URL. Settings does not expose billing controls.

```js
if (currentPlan === 'free') {
  navigate('/app/pricingplans');
} else {
  const response = await fetch('https://uvhaoef2myno3o4wvgyb32e5ae0dlevu.lambda-url.us-east-2.on.aws/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: userEmail }),
  });
  window.open(await response.text(), '_blank');
}
```

## Capacitor Billing Boundary

Billing and purchasing are web-only. In a Capacitor runtime, `Billing.jsx` shows only the current usage summary: it does not render plan cards, prices, the plan-management control, or invoke the billing portal. `AuthenticatedApp` redirects `/app/pricingplans` to `/app/billing`, so a direct native deep link cannot load the Stripe pricing table.

## Maintenance Notes

- Plan limits and labels are currently rendered locally in `Billing.jsx`; update both this file and any Stripe setup if plans change.
- `Billing.jsx` tracks page views and account-button clicks through `../../utils/analytics`.
- Keep the native billing boundary intact. Any new purchase, pricing, billing-portal, or subscription-management UI must be introduced to mobile only after explicit platform and policy approval.

## Provenance

Derived from [Billing README](../../src/components/Billing/README.md), [Billing.jsx](../../src/components/Billing/Billing.jsx), [Settings.jsx](../../src/components/Settings/Settings.jsx), and [AuthenticatedApp.jsx](../../src/components/AppShell/AuthenticatedApp.jsx).

