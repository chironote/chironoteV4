# Analytics Components

This folder owns application-wide Google Analytics 4 and Google Ads measurement.

## Files

- `GoogleAnalytics.jsx` initializes consent-aware analytics once, records React Router page views, captures Google click IDs, and reports Core Web Vitals.
- `../../utils/analytics.js` owns the event vocabulary and feature-specific tracking helpers.

## Consent and Privacy

Analytics starts with Consent Mode storage denied unless `cookieConsent` is already `true`. The cookie banner updates analytics, ad-storage, ad-user-data, and ad-personalization consent together. Events do not include raw email addresses; signed-in analytics may use the application's opaque user ID after consent.

The default measurement IDs can be overridden with `REACT_APP_GA_MEASUREMENT_ID` and `REACT_APP_GOOGLE_ADS_ID`.

## Reporting Contract

Use stable, snake-case GA4 event names and descriptive parameters. Important events include:

- `page_view` and `web_vital` for acquisition and performance.
- `landing_cta_click`, `landing_section_view`, `landing_faq_open`, `landing_navigation`, and `landing_engagement` for the public funnel.
- `recording_start`, `recording_complete`, `dictation_start`, `note_edit_apply`, `sign_up`, and `begin_checkout` for product activation.

Do not send names, email addresses, clinical text, transcripts, note content, or other protected health information to analytics.
