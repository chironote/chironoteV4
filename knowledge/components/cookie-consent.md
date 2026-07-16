---
type: component-readme
title: "Cookie Consent and Analytics"
description: "Consent Mode, GA4 and Google Ads initialization, event vocabulary, privacy limits, and attribution storage."
resource: "../../src/components/CookieConsent/README.md"
tags: [chironote, component, cookie-consent, analytics, privacy]
---

# Cookie Consent and Analytics

`Analytics/GoogleAnalytics.jsx` is the application-wide analytics component. It initializes GA4 and Google Ads once with automatic page views disabled, then emits route-aware page views and Core Web Vitals. The default IDs can be overridden with `REACT_APP_GA_MEASUREMENT_ID` and `REACT_APP_GOOGLE_ADS_ID`.

## Consent Mode

The persisted choice remains `localStorage.cookieConsent` with values `true`, `false`, or absent. Before Google tags initialize, all four Consent Mode categories default according to that choice:

- `analytics_storage`
- `ad_storage`
- `ad_user_data`
- `ad_personalization`

Absent and declined consent keep storage denied. Accepting updates all four categories to granted. The banner owns the visitor-facing choice; `utils/analytics.js` owns initialization and consent commands.

## Privacy Boundaries

Analytics events must not contain raw or hashed email addresses, patient or provider names, clinical text, transcripts, generated notes, or protected health information. Signed-in tracking may attach the application's opaque user ID only after consent.

Google click IDs are kept in session storage before consent and copied to 90-day local storage only after consent is granted. Analytics failures and unavailable storage never interrupt product behavior.

## Event Vocabulary

`utils/analytics.js` exposes stable GA4 events for public funnel behavior and authenticated feature adoption. Feature helpers map recording, dictation, editing, sign-up, checkout, pricing, and milestone behavior to snake-case GA4 names without creating an unbounded event-name taxonomy.

## Provenance

Derived from [`src/components/Analytics/README.md`](../../src/components/Analytics/README.md), [`GoogleAnalytics.jsx`](../../src/components/Analytics/GoogleAnalytics.jsx), [`CookieConsent.jsx`](../../src/components/CookieConsent/CookieConsent.jsx), and [`utils/analytics.js`](../../src/utils/analytics.js).
