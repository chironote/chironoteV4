# Meta demo-booking measurement

## What the website sends

Only the public marketing routes `/`, `/demo`, and `/tutorial` can load Meta Pixel, and only after the visitor accepts the existing optional analytics/advertising choice. They send a `PageView`. A Zoom `bookingForm` confirmation from the embedded, origin- and iframe-validated scheduler sends exactly one Meta standard `Schedule` event and the existing non-PII GA4 `booked_demo` event. A click, scheduler load, and iframe opening do not count as a booking.

The website's confirmed Meta Dataset ID is centralized in `src/utils/metaPixel.js`, matching the existing GA4 and Google Ads default-ID pattern. The adapter sends no email, name, clinical text, transcript, note, or matching fields. The booking event ID is a deterministic non-PII derivative of Zoom's scheduled-event ID, so any browser resend uses the same ID.

Google click-ID capture and `getGclid` remain in `src/utils/analytics.js` for Stripe purchase attribution. The old scheduler-only Google UTM forwarding was removed because its only consumer was the retired Zoom-to-Make-to-Google-Ads offline-demo route; GA4 `booked_demo` remains the Google conversion path.

## Owner setup after deployment

1. In Meta **Events Manager**, open the existing ChiroNote Dataset (called Pixel in some screens), select **Settings**, and keep Automatic Advanced Matching off. The confirmed Dataset ID is already centralized in the website source, so publish through the normal website process.
2. After deployment, open `/demo` in a fresh browser, accept the analytics choice, then use **Events Manager → Test events** to confirm `PageView`. Complete a real test booking only with the team’s coordination; `Schedule` appears only after Zoom confirms it. Test Events confirms receipt, not ad attribution.
3. In the running campaign's eligible ad set, use the same Dataset and select/retain the `Schedule` website event if the optimization UI offers website-event selection. Ads Manager already reports Meta clicks; this adds opted-in landing visits and confirmed bookings. A campaign optimized for another goal may report `Schedule` without optimizing toward it.

## Operational limits

Pixel events are browser events, not Conversion API events, and no conversion ledger or backend was added. They are not retroactive. Keep any future Meta consent wording and privacy review aligned with the existing cookie banner before enabling the environment variable.

## Sources

- [Meta Pixel base code](https://www.facebook.com/business/help/952192354843755)
- [Meta standard events](https://www.facebook.com/business/help/402791146561655)
- [Meta Events Manager test events](https://www.facebook.com/business/help/2041148702652965)
