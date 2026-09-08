# ChiroNote Knowledge Update Log

## 2026-09-07

- **Landing testimonials**: Added Dr. David Ager first with his supplied portrait and verbatim hours-saved quote, followed by Matt and Jessica. Removed the former third testimonial and unused portrait. Recorded email provenance and website-headshot consent dates in the landing-page concept.

## 2026-09-03

- **Demo hero conversion and mobile trust polish**: Replaced placeholder walkthrough-led hero copy with the benefit-led `SOAP notes, written while you treat.` message and a plain-language product explanation for unfamiliar visitors. Removed the walkthrough button helper line, promoted its main label, converted the adjacent workflow link into the standard tracked sign-up path, centered and widened the compact image assurances, and tightened the mobile HIPAA trust panel so its copy uses a wider measure.

## 2026-09-02

- **Booked-demo GA4 attribution**: Added a Zoom Scheduler `bookingForm` callback listener that validates the iframe source and Zoom origin before recording one non-PII `booked_demo` event per scheduled-event ID. This restores the established GA4-to-Google-Ads conversion path while preserving consent-aware click-ID forwarding. Organic and non-consenting bookings remain unaffected, and pre-consent click IDs are not written to session storage.

## 2026-09-01

- **Manual note-history recovery**: Documented the explicit Recent Notes refresh path, which reuses the server fetch when an AppSync subscription update is missed.
- **Demo landing-page privacy trust**: Replaced the demo page's rolling assurance strip between the hero and testimonials with a static blue HIPAA trust signal using a shield SVG, while retaining the canonical landing-page strip. Added a demo-only FAQ prompt for Business Associate Agreement (BAA) requirements and recorded the visual/motion distinction.

## 2026-08-25

- **Demo landing page**: Added the `/demo` public route as a scheduler-focused variant of the canonical landing page. It retains the established responsive presentation, replaces conversion CTAs with anchored walkthrough actions, embeds the existing Zoom scheduler, omits pricing, and frames the session as practical workflow teaching for treatment processes including shockwave visits.

## 2026-08-24

- **Style-system cross-platform update**: Audited the rendered landing page at compact and desktop widths, reconciled the stale marketing breakpoint with the current `880px` implementation, recorded the current scroll-linked desktop assurance handoff, and expanded [ChiroNote Visual Style System](./development/STYLE.md) with shared semantic tokens, CSS/pt/dp/sp rules, safe-area and keyboard behavior, native platform adaptations, component parity acceptance criteria, and an ordered iOS/Android migration backlog. Updated the index route accordingly; no native parity is claimed because the current checkout contains only the website while the Capacitor branches remain historical evidence.

## 2026-08-23

- **Content popup Treatment copy control**: Documented that the saved-note popup treats `Treatment:` as a clickable section-copy header alongside the SOAP headers, including the same copy-result feedback states.
- **Landing assurance motion and copy**: Updated the desktop trust strip to tie each assurance's left-to-right reveal directly to scroll position, moved the sequence earlier, and added a scroll-distance reading pause after the final `No setup required` message before handing off to the testimonials heading; preserved reduced-motion fallback.

## 2026-08-16

- **Custom Instructions backend reconciliation and UI finalization**: Refreshed the frontend GraphQL schema snapshot from the installed production AppSync contract, generated/imported the three safe Cognito-authenticated operations, preserved request IDs across uncertain retries, reconciled accepted jobs after interrupted starts, improved error semantics and focus restoration, and replaced the inaccessible timed success dismissal with an explicit close. All 48 repository tests and the production build pass. Review and merge evidence is [PR #6](https://github.com/chironote/chironoteV4/pull/6) from `codex/custom-instructions-ui-finalization`, including implementation commit `e5c1c9182c2a1e5373f3bf87fe0ccecbe6403824`, into `prod`; hosting deployment remains a separate owner action and was not performed here. The feature flag remains off because the SQS event-source mapping, reserved concurrency, authenticated provider end-to-end validation, and runtime configuration gate remain incomplete.
- **Custom Instructions async UX**: Replaced the planned direct-Lambda, long-held browser request with authenticated AppSync start/status/disable operations, persisted job polling, focus resume, stale-response protection, an explicit first-compile/update/failure status matrix, preserved disabled source text, and server-only success confirmation. All 47 repository tests and the production build passed; unrelated pre-existing lint warnings remain. That earlier closeout changed frontend source only; the backend control plane was installed later the same day as recorded above, while feature enablement and production deployment remain outstanding.

## 2026-08-13

- **Landing-page scroll motion**: Extended the existing dependency-free reveal treatment across features, pricing, FAQ, and the final CTA using one-time opacity/transform entrances, restrained card/step staggers, and the existing reduced-motion and browser fallbacks.

## 2026-07-22

- **Mobile pricing condensation**: Documented the landing page's unified compact pricing comparison at 880 px and below, including preserved plan actions and the consolidated unlimited-devices benefit.
- **Landing-page refinement**: Shortened the hero for a stronger mobile fold, replaced the unsupported percentage badge with a desktop-only qualitative note-status card, promoted real testimonial portraits, lightly polished the video, and bounded accessible motion to the hero/testimonial/video scope.
- **Mobile assurance composition**: Moved the three compact trust messages into the hero image on compact layouts, reframed system compatibility as keeping the user's workflow, and retained the existing assurance strip only on desktop.
- **Mobile hero-image refinement**: Normalized the clinical image to a filled portrait frame on phones, introduced a shallower compact ratio for tablet widths, and tightened the overlay panel while preserving clear space around the clinician's face.
- **Desktop hero cleanup**: Removed the qualitative SOAP-note overlay from all laptop and desktop hero views so the clinical photo remains the sole visual focus; compact assurance treatment is unchanged.

## 2026-07-20

- **Authenticated account redesign**: Split Account into first-class Billing and Settings destinations, retained compatibility redirects, moved current-period usage to Billing, and limited Settings impact reporting to lifetime hours saved.
- **Custom instructions boundary**: Documented the feature-flagged natural-language editor, server-confirmed state model, authenticated one-endpoint service adapter, timeout/error handling, safe reset, and deliberate exclusion of generated SOATP fields.
- **Feedback modal**: Replaced the routed subject-select form with an accessible controlled dialog that preserves the current page and always submits the literal Feedback subject.
- **Shared dialog foundation**: Added the reusable authenticated modal contract for focus containment/restoration, body scroll lock, safe dismissal blocking, mobile viewport containment, and reduced motion.
- **Dashboard visual refinement**: Standardized Clipboard, authenticated navbar, and Smart Editor around the history panel's calm clinical surfaces, shared radii, restrained depth, toolbar hierarchy, accessible control states, and responsive editor sizing.
- **Style authority update**: Recorded the implemented `64px` navigation, Clipboard/Smart Editor sibling contract, constrained-width composition, and mobile menu treatment.

## 2026-07-17

- **Creation**: Added the [ChiroNote Visual Style System](./development/STYLE.md) as the reproducible visual authority for authenticated product UI and the scoped public-marketing exception.
- **Recent notes redesign**: Documented the responsive history panel structure, bounded desktop and mobile sizing, grouped weekly surfaces, note-count hierarchy, and semantic note rows.

## 2026-07-16

- **History timestamps**: Standardized history metadata as `time | weekday | date`, using `time | Today` for notes from the current local calendar day across the website, Android app, and Chrome extension.
- **History navigation**: Documented the compact flat history rows, visible per-note dates, and collapsible week separators shared by the website and Android UI.
- **Conversion experiment**: Removed the personal walkthrough option from landing-page pricing so the funnel emphasizes self-service sign-up and purchase.
- **Landing launch**: Replaced three competing landing implementations with one canonical, production-ready page at `/`, retained compatibility redirects, repaired public destinations and tutorial styling, and documented responsive and performance boundaries.
- **Analytics correction**: Centralized GA4 and Google Ads behind Consent Mode, removed raw email collection and unconditional third-party landing scripts, and defined stable events for acquisition, funnel interaction, feature adoption, and Core Web Vitals.
- **Performance update**: Documented responsive WebP assets, deferred video, scoped landing CSS, and lazy loading of Amplify, authenticated styles, and Material Symbols.
- **Deprecation**: Removed the obsolete landing-page upgrade record after its useful requirements were incorporated into the maintained landing-page concept.

## 2026-07-15

- **Consolidation**: Replaced three overlapping and source-shaped recording documents with one implementation-checked [Recording, Dictation, and Note Generation](./components/recording.md) concept covering architecture, refactor history, browser behavior, failure risks, and the manual test matrix.
- **Creation**: Added [Web, Android, and iPhone Codebase Divergence](./architecture/platform-divergence.md) from the available native branch history, including the real scope of the remembered manifest work and a contract-first convergence path.
- **Creation**: Added [Website Publish State and Release Checklist](./operations/website-release.md) with the live asset fingerprint, unpublished delta, validation results, owner-only release procedure, blockers, and rollback evidence.
- **Correction**: Recorded that production predates the 2026-03-15 note-generation Lambda switch and May-July recording/dictation work, while already containing the March 2 blob and Safari fixes.
- **Update**: Clarified the [system architecture](./architecture/system-overview.md) platform boundary and documented the sharply reduced recording test coverage in the [development workflow](./development/workflow.md).
- **Safety fix**: Updated [Recording, Dictation, and Note Generation](./components/recording.md) and [Website Publish State and Release Checklist](./operations/website-release.md) after removing token logging, adding session-scoped upload/SQS cancellation, surfacing fatal submission failures, matching audio extensions to MIME types, and making unmount cancellation-only.
- **Correction**: Changed failed and zero-credit subscription checks to discard the newly opened recorder rather than submit a final audio chunk.
- **Validation**: Recorded the rebuilt 13-test recording/dictation suite, including final-chunk ordering, and the new local production asset fingerprint.

## 2026-07-12

- **Preservation**: Added the validated 24-concept knowledge bundle and its maintenance guidance to the production history so the curated repository knowledge is retained with the application.

## 2026-07-01

- **Correction**: Added this required root log after identifying that chronological knowledge history had been omitted from the initial Healtech simplified OKS design.
- **System**: Formalized the [Healtech Simplified Open Knowledge System](./knowledge-management/healtech-simplified-oks.md) as a reusable method and Codex skill.
- **Refactor**: Replaced source-shaped repository concepts with [system architecture](./architecture/system-overview.md) and [development workflow](./development/workflow.md) concepts.
- **Organization**: Flattened the knowledge bundle to one category level, retained security as a first-class domain, and rebuilt the [index](./index.md) as a concept-oriented query map.
- **Initialization**: Consolidated repository READMEs, agent guidance, context documents, security documentation, and standalone references into the initial ChiroNote knowledge bundle.
