---
type: component-readme
title: "CookieConsent Components"
description: "Cookie consent and analytics initialization behavior."
resource: "../../src/components/CookieConsent/README.md"
tags: [chironote, component, cookie-consent]
---


> Source: [`README.md`](../../src/components/CookieConsent/README.md)

# CookieConsent Components

This folder owns the cookie consent banner shown to public visitors.

## Files

- `CookieConsent.jsx` renders the accept/decline banner and initializes Google Analytics after consent.
- `CookieConsent.css` styles the fixed consent panel and action buttons.

## Important Code

Consent is stored in local storage:

```js
const hasConsent = localStorage.getItem('cookieConsent');
```

Accepting stores `true`, hides the banner, and initializes GA4 and Google Ads tracking:

```js
ReactGA.initialize([
  { trackingId: 'G-02117DNZDH', gaOptions: { client_storage: 'localStorage' } },
  { trackingId: 'AW-16869907009', gaOptions: { client_storage: 'localStorage' } }
]);
```

Declining stores `false` and does not initialize analytics from this component.

## Maintenance Notes

- This component assumes analytics can use local storage once accepted.
- If analytics initialization moves elsewhere, keep the consent storage contract compatible.
- Review privacy copy with any future tracking changes.

## Provenance

Derived from [`README.md`](../../src/components/CookieConsent/README.md).

