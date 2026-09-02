# Analytics Components

This folder owns application-wide Google Analytics 4 and Google Ads measurement.

## Files

- `GoogleAnalytics.jsx` initializes consent-aware analytics once, records React Router page views, captures Google click IDs, and reports Core Web Vitals.
- Route page types distinguish the canonical `landing` page from the scheduler-focused `demo_landing` page.
- `../../utils/analytics.js` owns the event vocabulary and feature-specific tracking helpers.

## Consent and Privacy

Analytics starts with Consent Mode storage denied unless `cookieConsent` is already `true`. The cookie banner updates analytics, ad-storage, ad-user-data, and ad-personalization consent together. Events do not include raw email addresses; signed-in analytics may use the application's opaque user ID after consent.

Google Ads attribution recognizes `gclid`, `gbraid`, and `wbraid`. Before consent, the current click ID is retained only in memory; accepting consent stores it locally for up to 90 days, while declining clears it. The demo scheduler receives the consented identifier through Zoom's UTM tracking fields. Separately, the parent page accepts Zoom Scheduler's origin-validated `bookingForm` callback and records the non-PII GA4 `booked_demo` event once per Zoom scheduled-event ID.

The default measurement IDs can be overridden with `REACT_APP_GA_MEASUREMENT_ID` and `REACT_APP_GOOGLE_ADS_ID`.

## Reporting Contract

Use stable, snake-case GA4 event names and descriptive parameters. Important events include:

- `page_view` and `web_vital` for acquisition and performance.
- `landing_cta_click`, `landing_section_view`, `landing_faq_open`, `landing_navigation`, and `landing_engagement` for the public funnel.
- `booked_demo` for a confirmed Zoom Scheduler booking; this is the GA4 event to mark as a key event and import into Google Ads.
- `recording_start`, `recording_complete`, `dictation_start`, `note_edit_apply`, `sign_up`, and `begin_checkout` for product activation.

Do not send names, email addresses, clinical text, transcripts, note content, or other protected health information to analytics.
