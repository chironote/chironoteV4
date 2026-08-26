# Account Components

This folder owns the authenticated account and web billing-plan views. It is mounted from `AuthenticatedApp` under `/app/account` and `/app/pricingplans`.

## Files

- `Account.jsx` renders the current subscription plan and usage summary. Hours saved is the primary metric; remaining hours and free-tier smart edits are secondary context. Professional users see `Unlimited` for monthly dictation availability.
- `Account.css` styles the account dashboard and subscription cards.
- `PriceTable.jsx` embeds the Stripe pricing table used by the pricing route.
- `PriceTable.css` styles the pricing table page wrapper.

## Important Code Paths

`Account` reads the user's subscription record through Amplify GraphQL:

```js
const data = await client.graphql({
  query: getUserSubscription,
  variables: { owner: owner }
});
```

On the website, the subscription tier controls both the active plan card and the main billing action. Free users are sent to `/app/pricingplans`; paid users call the billing portal Lambda and open the returned URL:

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

Billing and purchasing are web-only. In a Capacitor runtime, `Account.jsx` shows only the current plan and usage summary: it does not render plan cards, prices, the plan-management control, or invoke the billing portal. `AuthenticatedApp` also redirects `/app/pricingplans` to `/app/account`, so a direct native deep link cannot load the Stripe pricing table.

## Maintenance Notes

- Plan limits and labels are currently rendered locally in `Account.jsx`; update both this file and any Stripe setup if plans change.
- The code configures Amplify in this folder with `Amplify.configure(config)`. Check app-wide configuration before adding more local configuration calls.
- `Account.jsx` tracks page views and account-button clicks through `../../utils/analytics`.
- Keep the native billing boundary intact. Any new purchase, pricing, billing-portal, or subscription-management UI must be introduced to mobile only after explicit platform and policy approval.
