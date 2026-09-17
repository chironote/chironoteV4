# LandingPage Components

This folder owns the main public marketing page, its demo-focused variant, an intermediate educational funnel page, and the standalone tutorial page.

## Files

- `LandingPage.jsx` is the canonical landing page rendered at `/`.
- `DemoLandingPage.jsx` renders the scheduler-focused `/demo` variant by selecting the demo content path in `LandingPage`.
- `FiveHabitsPage.jsx` and `FiveHabitsPage.css` render `/ai-scribe-habits-for-chiropractors`, a five-habit AI-scribe field guide that brings visitors to the existing `/demo` walkthrough as its primary conversion, with email-only sign-up as the quieter alternative. Its five illustrated WebP assets are locally owned copies in `src/assets/five-habits-*.webp`.
- `WorkflowDemo.jsx` and `WorkflowDemo.css` own the shared three-step screenshot carousel in the features section. It explains recording, SOAP-note review, and moving the finished note into an EHR without simulating product actions on the marketing page.
- `LandingPage.css` contains fully scoped, responsive landing-page styles.
- `TutorialPage.jsx` and `TutorialPage.css` retain the separate `/tutorial` workflow.

The former consideration, conversion, and conversion-old implementations were removed after the prototype became the canonical page. `/ai-chiropractic-soap-notes` and `/learn-more` redirect to `/` for compatibility.

## Landing Funnel

All calls to action are real destinations:

- Sign-up links open `/app?initialState=signUp`.
- Sign-in links open `/app`.
- Pricing directs visitors to self-service sign-up without a personal walkthrough option.
- The `/demo` variant omits pricing. Its primary “Schedule a walkthrough” action scrolls to the embedded Zoom scheduler, while the adjacent tracked “Try It Now” action opens `/app?initialState=signUp`. The scheduler uses the “LET'S CHAT” eyebrow and “Have a Human explain it” heading. Its overview video retains the shared “Watch our explainer video” heading without supporting copy. The original headline/photo/layout remain; supporting copy addresses evening charting, and demo-only workflow/FAQ/calendar copy explains a guided start with the existing EHR. Both variants share the interactive workflow demo after the overview video. The top “How it works” navigation targets that workflow demo. The standard `/` copy remains separate.
- The five-habits guide links directly to `/demo` rather than embedding a second scheduler. Keep the conversion invitation brief and preserve the review-before-charting message; its sign-up alternative is `/app?initialState=signUp`.
- Blog, Terms & Privacy, section navigation, video playback, testimonial controls, and FAQ controls are keyboard accessible.

The page sends stable funnel events through `utils/analytics.js`, including section views, CTA locations and plan names, navigation, FAQ opens, video milestones, testimonial navigation, and ten-second engagement. The global analytics component records route page views and Core Web Vitals.

Keep the `trackAnalyticsEvent` import: testimonial navigation and mobile-menu toggles still call it even though confirmed-booking handling moved to `ZoomDemoScheduler`.

## Performance and Layout

- The above-the-fold hero uses responsive WebP sources; the largest version is under 100 KB.
- Testimonial avatars and workflow screenshots lazy-load.
- Testimonials appear in this order on both `/` and `/demo`: Dr. David Ager, Dr. Matt Fryauf, Dr. Jessica Yeung. David's quote is a verbatim excerpt from his August 27, 2026 email; his supplied headshot has a matching pale-green background. Source and consent dates are recorded in `knowledge/components/landing-page.md`.
- The 14 MB demo video uses `preload="none"` and loads only after interaction.
- Below-the-fold sections use `content-visibility`, fixed image dimensions, scoped CSS, and reduced-motion support.
- The hero uses concise spacing copy and moves from split to stacked composition at 880 px. Laptop and desktop views keep the clinical image unobstructed; compact layouts move three centered, unbulleted assurances into a portrait panel over unused image space and hide the separate desktop assurance strip. The image frame uses a portrait crop through 460 px and a shallower compact crop from 461–880 px so the photo stays immersive without becoming excessively tall on tablets.
- Testimonials use portrait-led cards with a swipeable mobile carousel; each mobile swipe stops at the next snap point so the middle card is easy to reach. Only the real practitioner images in `src/assets` may be associated with named quotes.
- Hero motion runs on page entry. As visitors scroll, major section headings and content groups use a one-time 14px opacity/transform reveal, with short 70ms staggers for pricing cards. The workflow carousel advances every seven seconds, pauses during pointer or keyboard interaction, and provides a persistent pause control. Desktop always shows a compact, larger 1–2–3 selector to the left; the first step omits only its previous arrow, and every step keeps its next arrow outside the card edge. Compact layouts hide the rail and support horizontal swipes with a visible hint; at phone width, the screenshot and lesson move together on a smooth horizontal track like the testimonial carousel. Dots inside the lesson indicate the active step without repeating its number in the copy. Reduced-motion disables automatic advancement and transitions. The standard landing page's desktop trust assurances continuously track scroll position from left to right and resolve before the viewport center; after a short scroll-distance pause, the testimonials heading follows their final message through the same handoff. The `/demo` variant replaces that assurance strip with a static dark-green HIPAA trust signal using the restored custom blue medical-shield asset. Motion is disabled by `prefers-reduced-motion` and falls back to immediately visible content if `IntersectionObserver` is unavailable.
- Mobile navigation uses an accessible menu at 880 px and below. Features collapse to one column, while pricing becomes one compact comparison card with three plan rows and a shared unlimited-devices note. On `/demo` at 600 px and below, the scheduler eyebrow is hidden.

## Maintenance Notes

- Keep `/` as the canonical marketing URL and preserve redirects for published legacy links.
- Keep CTA destinations and analytics locations aligned when copy or page structure changes.
- Do not add third-party scripts directly to this page; initialize measurement through the Analytics component and consent utilities.
- Confirm pricing copy against the authenticated Stripe pricing table before publishing plan changes.
- Keep the `/demo` scheduler URL, section anchor, CTA labels, and route metadata aligned.
- `docs/demo-booking-copy.md` holds proposed Zoom event/profile copy. It does not update the live Zoom account; preserve the existing event URL when applying copy there.
- `ZoomDemoScheduler.jsx` is the one shared scheduler embed for `/demo` and `/tutorial`. Its origin- and iframe-validated `bookingForm` callback is the sole client-side trigger for GA4 `booked_demo` and Meta `Schedule`; never fire either event for a scheduler view or CTA click. The former Google click-ID UTM forwarding was specific to the retired Make offline-conversion route. Keep general Google click-ID capture and `getGclid` intact for Stripe purchase attribution.
- Do not offer clinic-facing Business Associate Agreements in the `/demo` FAQ. Explain in the existing HIPAA-compliance answer that ChiroNote maintains BAAs with service providers that can access protected health information, while keeping the visual HIPAA trust panel concise.

## Workflow demo assets

`src/assets/workflow-{record,review,editor}.webp` are current app screenshots captured on 2026-09-17 with only the supplied fictional sacral-pain example visible and the history drawer closed. Keep patient histories and identifiers out of future captures. Each unobstructed screenshot is paired with a centered title and a short Georgia-serif explanation. The carousel links directly to ChiroNote's verified Apple App Store and Google Play listings; keep those destinations current if either listing changes.
