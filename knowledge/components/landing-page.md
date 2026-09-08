---
type: component-readme
title: "Public Landing Pages"
description: "Canonical landing-page funnel, destinations, responsive behavior, analytics, and performance boundaries."
resource: "../../src/components/LandingPage/README.md"
tags: [chironote, component, landing-page, marketing, performance]
---

# Public Landing Pages

ChiroNote has one canonical public marketing page: `LandingPage.jsx` at `/`. `DemoLandingPage.jsx` selects its scheduler-focused demo variant at `/demo`, preserving the same visual and interaction foundation without duplicating the full implementation. The former consideration page, prototype conversion route, and archived conversion implementation were removed after the prototype was completed. `/ai-chiropractic-soap-notes` and `/learn-more` redirect to `/` so published links remain valid.

`TutorialPage.jsx` remains a separate public route at `/tutorial` with its own `TutorialPage.css`.

## Funnel Contract

The landing page exposes real destinations rather than placeholders:

- Free-trial and plan calls to action open `/app?initialState=signUp`.
- Login opens `/app`.
- Blog opens `/blog`.
- Pricing directs visitors to self-service sign-up without a personal walkthrough option.
- The demo variant omits pricing. Its hero pairs a primary embedded-scheduler action with a consent-aware, `landing_cta_click`-tracked sign-up link to `/app?initialState=signUp`; later walkthrough actions continue to target the scheduler. The hero leads with the documentation benefit and then explains the unfamiliar product in plain language: ChiroNote listens during a patient visit, creates a structured chiropractic SOAP note, and leaves it ready to review and copy into the EHR. The page also includes an FAQ prompt to discuss Business Associate Agreement (BAA) requirements.
- The demo scheduler forwards a consented Google Ads click identifier (`gclid`, `gbraid`, or `wbraid`) through Zoom's UTM tracking fields. Zoom's origin-validated `bookingForm` callback records one non-PII GA4 `booked_demo` event per scheduled-event ID after a confirmed booking. Organic and non-consenting visitors load the scheduler without an identifier.
- Terms & Privacy opens the same public agreement used by the sign-up form.
- Section, video, testimonial, mobile-menu, and FAQ controls are keyboard accessible.

SEO metadata declares `https://www.chironote.ai/` as canonical. `public/sitemap.xml` contains only public pages and registered blog posts; authenticated app routes are intentionally absent.

## Measurement Contract

Landing decisions can be evaluated with stable GA4 events:

- `landing_section_view` compares how far visitors move through hero, trust, testimonials, video, features, pricing, FAQ, and final CTA sections.
- `landing_cta_click` captures CTA location, label, destination, and plan where relevant.
- `landing_navigation`, `landing_faq_open`, `video_progress`, and `landing_testimonial_navigation` measure content interaction.
- `landing_engagement` records meaningful dwell time and maximum scroll depth.
- `booked_demo` records a confirmed Zoom Scheduler booking and is the event imported from GA4 into Google Ads.
- Global `page_view` and `web_vital` events cover acquisition, bounce/engagement reporting, and mobile performance.

Never send form values, email addresses, note content, transcripts, or protected health information with these events.

Booked-demo attribution follows the existing GA4 conversion pattern: Zoom's embedded booking confirmation posts a `bookingForm` message to the parent page, which validates the Zoom origin and iframe source before sending `booked_demo` to GA4. Configure the imported GA4 action as the sole Google Ads primary conversion; do not also use the Make offline-import route for the same booking.

## Performance Boundaries

The hero uses 720 px and 1200 px WebP variants rather than the former 3.2 MB PNG. The video poster and testimonial avatars are also compressed WebP assets. The 14 MB demonstration video uses `preload="none"`; below-the-fold images lazy-load, and below-the-fold sections use `content-visibility` with intrinsic size estimates.

Landing CSS is scoped below `.marketing-page`, so navigating between the marketing page and authenticated app cannot leak generic `nav`, `footer`, `body`, or root-variable styles. Amplify UI, authenticated-app CSS, and Material Symbols are lazy-loaded with `/app` instead of blocking the landing route.

## Visual Style Reference

The landing page intentionally follows the [Public marketing exception](../development/STYLE.md#public-marketing-exception). Keep its warm tokens, Inter/Georgia typography, responsive section rhythm, editorial radii, and scoped selectors separate from the authenticated clinical workspace.

The conversion-critical top of the page is mobile-first: concise hero copy brings the primary action and clinical image into the first screen sooner, laptop and desktop views leave that image unobstructed, and the hero/navigation stack at 880 px. The demo walkthrough button uses a single, larger label without helper text. Compact layouts place the centered `HIPAA-compliant`, `Quick setup`, and `Keep your workflow` assurances in an unbulleted portrait panel over unused image space and hide the separate desktop assurance strip. The clinical image fills a portrait frame through 460 px, then uses a shallower compact ratio through 880 px to preserve the subject and avoid an oversized tablet-height image. On `/demo`, the space between hero and testimonials instead holds a static blue HIPAA trust panel with a shield SVG; compact spacing gives its heading and body a wider text measure. It replaces the three rolling desktop assurances without changing the canonical landing page. Testimonials use the real practitioner portraits as prominent visual proof, with three cards on desktop and a swipeable carousel on compact layouts. At the same 880 px breakpoint, the three desktop pricing cards become one bordered comparison card: each plan is a compact row, the repeated unlimited-devices benefit is consolidated into one shared footer, and every plan retains a 44 px-high sign-up action. The video keeps deferred loading and receives only presentation polish. The hero uses a short page-entry treatment; major content groups below it reveal once on scroll through the page's shared `IntersectionObserver`. These entrances are limited to opacity and a 14 px vertical transform, with 70 ms staggers for feature steps and pricing cards. The standard landing page's desktop trust assurance strip instead continuously follows scroll progress from left to right, pauses for a short scroll distance after the final assurance resolves, then hands off to the testimonials heading. Reduced-motion users and browsers without `IntersectionObserver` receive immediately visible content.

## Provenance

Testimonial order on both public variants is Dr. David Ager, Dr. Matt Fryauf, then Dr. Jessica Yeung. David's quote, "Chironote is a real help and saves me hours per week.", is verbatim from his August 27, 2026 email in the "AI Problem" conversation (Gmail message `1a044ef33bbdc582`). He agreed to provide a website headshot on August 28 (`1a04a5b4cfafd75e`) and supplied the photographs on September 3 (`1a0676068541709b`). The first supplied photograph is the source of `src/assets/david-ager-avatar.webp`, with background replacement and square framing to match the existing portraits. Keep private correspondence and original full-resolution photos outside the repository. The former third testimonial and its unused portrait were removed.

Derived from [`src/components/LandingPage/README.md`](../../src/components/LandingPage/README.md), [`LandingPage.jsx`](../../src/components/LandingPage/LandingPage.jsx), [`LandingPage.css`](../../src/components/LandingPage/LandingPage.css), [`AppRoutes.jsx`](../../src/components/AppRouting/AppRoutes.jsx), and [`utils/analytics.js`](../../src/utils/analytics.js).
