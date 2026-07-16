# CookieConsent Components

This folder owns the cookie consent banner shown to public visitors.

## Files

- `CookieConsent.jsx` renders the accept/decline banner and updates the shared analytics consent state.
- `CookieConsent.css` styles the fixed consent panel and action buttons.

## Important Code

Consent is stored in local storage:

```js
const hasConsent = localStorage.getItem('cookieConsent');
```

Accepting stores `true`, hides the banner, and grants GA4 and Google Ads Consent Mode storage:

```js
updateAnalyticsConsent(true);
```

Declining stores `false` and keeps analytics, ad storage, ad user data, and ad personalization denied. `Analytics/GoogleAnalytics.jsx` owns initialization and cookieless Consent Mode measurement.

## Maintenance Notes

- Keep the `cookieConsent` local-storage contract compatible with `utils/analytics.js`.
- Never add email addresses, clinical content, or other identifying data to analytics events.
- Review privacy copy with any future tracking changes.
