# Billing Components

- `Billing.jsx` owns subscription loading, plan display, monthly usage, plan browsing, and billing-portal launch.
- `Billing.css` implements the calm authenticated product card, counter, status, and responsive styles.
- `PriceTable.jsx` and `PriceTable.css` retain the existing Stripe pricing-table route and analytics behavior.

Billing reads `getUserSubscription` defensively. A missing record is treated as safe free-tier defaults, while query failures show a retryable error rather than zero usage. The Professional tier explicitly labels unlimited usage with an icon and text. Existing `Account_Page` and `account_interaction` analytics identifiers are intentionally preserved for dashboard continuity even though the visible destination is Billing.

## Capacitor boundary

On a native Capacitor runtime, Billing renders the current usage summary only. It does not render plan comparisons, open the billing portal, or navigate to Stripe pricing; `AuthenticatedApp` redirects `/app/pricingplans` to `/app/billing`. Keep purchasing and subscription-management actions web-only until a native billing design is explicitly approved.
