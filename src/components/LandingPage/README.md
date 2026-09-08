# LandingPage Components

This folder owns the main public marketing page, its demo-focused variant, and the standalone tutorial page.

## Files

- `LandingPage.jsx` is the canonical landing page rendered at `/`.
- `DemoLandingPage.jsx` renders the scheduler-focused `/demo` variant by selecting the demo content path in `LandingPage`.
- `LandingPage.css` contains fully scoped, responsive landing-page styles.
- `TutorialPage.jsx` and `TutorialPage.css` retain the separate `/tutorial` workflow.

The former consideration, conversion, and conversion-old implementations were removed after the prototype became the canonical page. `/ai-chiropractic-soap-notes` and `/learn-more` redirect to `/` for compatibility.

## Landing Funnel

All calls to action are real destinations:

- Sign-up links open `/app?initialState=signUp`.
- Sign-in links open `/app`.
- Pricing directs visitors to self-service sign-up without a personal walkthrough option.
- The `/demo` variant omits pricing. Its primary hero action scrolls to the embedded Zoom scheduler, while the adjacent tracked sign-up action opens `/app?initialState=signUp`; benefit-led hero copy immediately explains that ChiroNote listens during a patient visit and creates a structured chiropractic SOAP note.
- Blog, Terms & Privacy, section navigation, video playback, testimonial controls, and FAQ controls are keyboard accessible.

The page sends stable funnel events through `utils/analytics.js`, including section views, CTA locations and plan names, navigation, FAQ opens, video milestones, testimonial navigation, and ten-second engagement. The global analytics component records route page views and Core Web Vitals.

## Performance and Layout

- The above-the-fold hero uses responsive WebP sources; the largest version is under 100 KB.
- Testimonial avatars and the product mockup lazy-load.
- Testimonials appear in this order on both `/` and `/demo`: Dr. David Ager, Dr. Matt Fryauf, Dr. Jessica Yeung. David's quote is a verbatim excerpt from his August 27, 2026 email; his supplied headshot has a matching pale-green background. Source and consent dates are recorded in `knowledge/components/landing-page.md`.
- The 14 MB demo video uses `preload="none"` and loads only after interaction.
- Below-the-fold sections use `content-visibility`, fixed image dimensions, scoped CSS, and reduced-motion support.
- The hero uses concise spacing copy and moves from split to stacked composition at 880 px. Laptop and desktop views keep the clinical image unobstructed; compact layouts move three centered, unbulleted assurances into a portrait panel over unused image space and hide the separate desktop assurance strip. The image frame uses a portrait crop through 460 px and a shallower compact crop from 461–880 px so the photo stays immersive without becoming excessively tall on tablets.
- Testimonials use portrait-led cards with a swipeable mobile carousel; each mobile swipe stops at the next snap point so the middle card is easy to reach. Only the real practitioner images in `src/assets` may be associated with named quotes.
- Hero motion runs on page entry. As visitors scroll, major section headings and content groups use a one-time 14px opacity/transform reveal, with short 70ms staggers for feature steps and pricing cards. The standard landing page's desktop trust assurances continuously track scroll position from left to right and resolve before the viewport center; after a short scroll-distance pause, the testimonials heading follows their final message through the same handoff. The `/demo` variant replaces that assurance strip with a static dark-green HIPAA trust signal using the restored custom blue medical-shield asset. Motion is disabled by `prefers-reduced-motion` and falls back to immediately visible content if `IntersectionObserver` is unavailable.
- Mobile navigation uses an accessible menu at 880 px and below. Features collapse to one column, while pricing becomes one compact comparison card with three plan rows and a shared unlimited-devices note. On the `/demo` route at 600 px and below, the scheduler keeps its normal place in the page and shows only the main heading from its three-line introduction; the three walkthrough-detail chips are also hidden.

## Maintenance Notes

- Keep `/` as the canonical marketing URL and preserve redirects for published legacy links.
- Keep CTA destinations and analytics locations aligned when copy or page structure changes.
- Do not add third-party scripts directly to this page; initialize measurement through the Analytics component and consent utilities.
- Confirm pricing copy against the authenticated Stripe pricing table before publishing plan changes.
- Keep the `/demo` scheduler URL, section anchor, CTA labels, and route metadata aligned.
- Keep the scheduler's consented `gclid`/`gbraid`/`wbraid` UTM forwarding intact. Its origin-validated `bookingForm` callback is the sole client-side trigger for GA4's `booked_demo` event; never fire that event for a scheduler view or CTA click. Organic visitors load the same scheduler without attribution parameters.
- Do not offer clinic-facing Business Associate Agreements in the `/demo` FAQ. Explain in the existing HIPAA-compliance answer that ChiroNote maintains BAAs with service providers that can access protected health information, while keeping the visual HIPAA trust panel concise.
