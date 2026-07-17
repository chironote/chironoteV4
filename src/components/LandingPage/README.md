# LandingPage Components

This folder owns the main public marketing page and the standalone tutorial page.

## Files

- `LandingPage.jsx` is the canonical landing page rendered at `/`.
- `LandingPage.css` contains fully scoped, responsive landing-page styles.
- `TutorialPage.jsx` and `TutorialPage.css` retain the separate `/tutorial` workflow.

The former consideration, conversion, and conversion-old implementations were removed after the prototype became the canonical page. `/ai-chiropractic-soap-notes` and `/learn-more` redirect to `/` for compatibility.

## Landing Funnel

All calls to action are real destinations:

- Sign-up links open `/app?initialState=signUp`.
- Sign-in links open `/app`.
- Pricing directs visitors to self-service sign-up without a personal walkthrough option.
- Blog, Terms & Privacy, section navigation, video playback, testimonial controls, and FAQ controls are keyboard accessible.

The page sends stable funnel events through `utils/analytics.js`, including section views, CTA locations and plan names, navigation, FAQ opens, video milestones, testimonial navigation, and ten-second engagement. The global analytics component records route page views and Core Web Vitals.

## Performance and Layout

- The above-the-fold hero uses responsive WebP sources; the largest version is under 100 KB.
- Testimonial avatars and the product mockup lazy-load.
- The 14 MB demo video uses `preload="none"` and loads only after interaction.
- Below-the-fold sections use `content-visibility`, fixed image dimensions, scoped CSS, and reduced-motion support.
- Mobile navigation uses an accessible menu at 780 px and below; pricing and features collapse to one column.

## Maintenance Notes

- Keep `/` as the canonical marketing URL and preserve redirects for published legacy links.
- Keep CTA destinations and analytics locations aligned when copy or page structure changes.
- Do not add third-party scripts directly to this page; initialize measurement through the Analytics component and consent utilities.
- Confirm pricing copy against the authenticated Stripe pricing table before publishing plan changes.
