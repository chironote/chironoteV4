# Account Components

This folder owns the authenticated account and billing-plan views. It is mounted from `AuthenticatedApp` under `/app/account` and `/app/pricingplans`.

## Files

- `Account.jsx` renders the account dashboard, current subscription plan, remaining monthly hours, and free-tier smart edit counter.
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

The subscription tier controls both the active plan card and the main billing action. Free users are sent to `/app/pricingplans`; paid users call the billing portal Lambda and open the returned URL:

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

## Maintenance Notes

- Keep the displayed plan cards aligned with the Stripe pricing table when plans change.
- `AuthWrapper` configures Amplify before authenticated account routes load; do not add duplicate local configuration.
- `Account.jsx` tracks page views and account-button clicks through `../../utils/analytics`.
