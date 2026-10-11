# ChiroNote Knowledge Update Log

## 2026-10-11

- **Removed Recent Notes counter**: Removed the loaded-note count badge and unused CSS; history loading, search and Refresh remain unchanged. Updated Sidebar README, [Sidebar](./components/sidebar.md), [visual style](./development/STYLE.md) and index.

- **Removed Patients visit-details entry**: Visit rows now only open the saved note in the shared clipboard; removed the separate Visit details button and page-level dialog state/wiring. Documented the retained export date-correction helper, History reassignment/label editing, and unchanged backend/save behavior in [Patient notes](./architecture/patient-notes.md), feature README and index.

- **Clinical-information export acknowledgment**: Corrected the earlier dates-only copy to “I acknowledge that the clinical information herein is accurate.” Updated accessible label/blocker, local state naming, selectors, Patients README and [Patient notes](./architecture/patient-notes.md), and index. The local export gate now resets its clinical acknowledgment for selection/range/date changes, refreshed visit details and saved signatures, while keeping per-note review separate; no backend assent persistence or legal-terms change.

- **Export date acknowledgment copy (superseded by clinical-information acknowledgment above)**: Updated [Patient notes](./architecture/patient-notes.md) and the Patients README for the export checkbox acknowledgment of date verification responsibility and intentional blank dates. Accessible label, checked state and export requirements are unchanged; no backend or legal-terms change.

- **Stable authenticated navigation order**: Corrected [Authenticated Navigation](./components/navbar.md) and the Navbar README for Home first when shown on subroutes, followed by gated Patients, Billing and Settings on desktop/mobile; Home remains omitted on the dashboard. Feedback and Logout retain their existing controls and position; updated index routing and source/test provenance. No website publication.

- **Simplified PDF selection**: Documented default-all selection, inclusive custom service-date ranges with on-demand calendar helpers, individual exclusions, compact note rows and PDF details, automatic refresh/retry, and preserved date/signature/review checks in [Patient notes](./architecture/patient-notes.md). Updated feature README and index. No backend contract or website deployment change.

- **Clipboard toolbar divider**: Documented the existing thin divider between Smart Editor and Save, conditional on Save visibility, in [Clipboard](./components/clipboard.md), its feature README and index. Visual markup correction only; no website deployment.

- **Saved-note drop parity**: History drops reload the authoritative record and use the Patients clipboard-opening path, including identity/version, draft guards and blocked pending-save replacement. Documented mobile overlay parity, superseded-fetch protection and preserved external text behavior in [Clipboard](./components/clipboard.md), [Sidebar](./components/sidebar.md), [App shell](./components/app-shell.md) and [Patient notes](./architecture/patient-notes.md); updated feature READMEs and index routing. Fictional local fixtures only; no deployment.

- **Simplified diagnosis continuity (source candidate)**: Retained the clipboard code preview and removed user-facing status controls. Confirmed code changes on any visit type establish a chronological diagnosis source; other saved notes stay unchanged. Documented destination-code copying during reassignment, unknown/empty handling and retained deletion warnings. Updated Patients ownership, patient-notes/clipboard concepts and index. Requires PatientNotesApi release before website publication.

- **Label, deletion and export corrections**: Documented clickable descriptor/pencil, explicit permanent patient deletion and last-visit cleanup warnings, local state clearing, history pagination past deletion markers, and actionable PDF blockers/development configuration. Backend deletion requires the coordinated audio replay guard before release.

- **History patient reassignment**: Updated Sidebar, AppShell and patient-notes concepts for clickable patient identity, compact assignment, version protection and history/clipboard synchronization. Sources: ContentPopup, ReassignPatientDialog, AuthenticatedApp.

- **Single clipboard editor**: Patients visit/source selection now loads the exact saved note into the [Clipboard](./components/clipboard.md). Retired the duplicate clinical editor; retained metadata/suggestions/retry in Patients. Documented inline explicit diagnosis-list approval, server re-exam confirmation, version/draft safety and synthetic initial-visit correction in [Patient notes](./architecture/patient-notes.md) and [App shell](./components/app-shell.md). Corrected the prior incomplete description of reconciliation during saved-note edits. No deployment or real-patient write.

- **Recording lookup copy**: Simplified the unselected picker to Patient Name and one instructional placeholder covering existing/new/unassigned choices; removed duplicate status/helper text. Add New now checks matching directory pages, rejects an existing normalized name with an inline selection message, and preserves input on lookup failure. Updated [Recording](./components/recording.md) and the Patients README.

- **Simplified recording selection**: Documented the name-only panel with × reset, automatic saved history, existing-patient Re-Exam and new-patient initial exam defaults in [Recording](./components/recording.md) and [Patient notes](./architecture/patient-notes.md). Updated component READMEs and index routing.

- **Patient UI corrections**: Restored the original [History popup and transcript view](./components/sidebar.md); added only a read-only patient name above the existing label. Moved desktop Save into the [Clipboard toolbar](./components/clipboard.md) while preserving conditional saves/review and draft conflict safety. Corrected [recording](./components/recording.md) clipping and empty-query patient rosters; visit fields remain on Patients. Aligned patient cards/dialogs with established styles and added masked signature preview in [Settings](./components/billing-settings.md). Updated AppShell/patient contracts and original-folder release guidance; no backend/schema/prompt publication or real patient changes.

## 2026-10-10

- **Original local website reconciliation**: Preserved local overview/workflow videos and default-available Custom Instructions with emergency opt-out alongside the patient release. Corrected stale Custom Instructions blockers and superseded alternate-worktree instructions in [Website release](./operations/website-release.md), retained both dated evidence histories, and documented production build defaults in [Development workflow](./development/workflow.md). Private capture/tooling remains local with an independent recovery snapshot. No hosting/backend publication or clinical prompt changes.

- **Synthetic patient release acceptance completed**: Recorded successful authenticated acceptance for four fictional patients and seven visits, including one synthetic WAV through the normal audio/transcription path, initial/follow-up saves, exact-code correction, conflict and generic-write guard checks, retry, reassignment, re-exam reconciliation, and saved-note PDF verification. The owner has not published the feature-enabled website; post-publication microphone/screen review, physical-device/native checks, and broad clinical prompt review remain separate. Updated [Patient notes](./architecture/patient-notes.md), [Patient infrastructure cutover](./operations/patient-infrastructure-release.md), [Website release](./operations/website-release.md), and the index.

- **Earlier infrastructure checkpoint**: The existing Amplify root/API/Notes/CustomResources stacks completed their updates; Notes physical/table identity, owner/timestamp key, patient GSI, Retain policies, deletion protection and 35-day PITR were preserved. The processed API environment and active post-auth functions confirm `PATIENT_WRITES_GUARDED=true`; runtime flags are active. At this checkpoint the first authenticated synthetic capture had succeeded and later workflow checks were pending; the acceptance entry above records their completion. The feature-enabled website build remains unpublished. Clinical prompt text was unchanged, and the infrastructure verification itself did not write patient data. See [cutover evidence](./operations/patient-infrastructure-release.md).

- Prepared strict clinical-writer guard source for coordinated runtime cutover, preserving Notes identity/recovery settings. Documented legacy prompt preservation and the separately approved Decisions diagnosis review; no additional data schema migration.

- **Saved-note diagnosis corrections**: Added desktop-only per-visit ICD code correction with whole-token replacement, visible note preview, code descriptions/status, and one version-checked save of body plus explicit diagnosis list. Invalid codes, collisions and partial-only matches are blocked; drafts survive failed/conflicting saves. Documented the clinician-edit boundary and re-exam-only AI reconciliation scope in [Patient notes](./architecture/patient-notes.md).
- **Verified infrastructure installation**: Installed additive patient schema/index/resolvers with legacy-writer compatibility, Retain/PITR/deletion protection and all preexisting physical IDs preserved. Recorded the completed deployment, federated-role rollback and successful existing-profile retry, disabled companions, unchanged runtime/prompt state and the owner work that was pending at that checkpoint. Completed metadata/provenance and normalized source-link labels for OKS validation.

- **Additive backend compatibility**: Added a default-strict AppSync environment gate for the create/update clinical-write restrictions, with explicit `false` during prompt deferral. Six synthetic AWS VTL evaluations pass. Corrected override validation to use `amplify build` after tracing the installed CLI; `api gql-compile` omits overrides. Emitted Notes Retain/PITR/deletion protection and API compatibility configuration were inspected successfully. No clinical prompt publication is included.

- **Production preparation and recovery**: Merged patient source to `prod` via PR #16 (`dcd1e8c`), without website/backend publication. Clinical prompt release is deferred. Added the CLI-generated source override for Notes Retain policies, deletion protection and PITR so future stack changes preserve the retention/recovery decision. Documented legacy-writer compatibility and the pending coordinated cutover; automatic cleanup retirement and backup/PITR were separately verified in AWS.

- **Update**: Added patient capture/history integration, separate names/labels, guarded saved-note workflows and automatic language selection. Removed full clinical payload logging. Desktop web has persistent Save; mobile web keeps local edit/copy. The Patients route owns profiles, source diagnosis display and PDF selection. Settings owns Configure Signature. Local candidate only; no push, release or deployment.

## 2026-10-09

- **Landing overview video replacement**: Replaced the canonical `/` overview with the owner-supplied 58-second ambient-scribe video and an opening-scene WebP poster. Preserved deferred playback and the `/demo` overview exclusion. Updated LandingPage ownership, [Public Landing Pages](./components/landing-page.md), and the index; source: `LandingPage.jsx` and the new overview assets.

## 2026-09-26

- **Custom Instructions restoration**: Replaced the missing-build-flag opt-in with default availability and an explicit emergency opt-out. Verified the production Cognito/AppSync/SQS/Astra path with a disposable login: idempotent acceptance, READY/CUSTOM, source round-trip, and disable preservation all passed. Updated Settings ownership and [Billing and User Settings](./components/billing-settings.md); superseded stale August backend blockers and recorded narrow frontend release/rollback evidence in [Website Publish State and Release Checklist](./operations/website-release.md). Existing landing-page changes are preserved.

## 2026-09-24

- **Recording clip polish**: Recaptured the first workflow step with a visible pointer, deliberate cadence between New Note, Exam Layout, and Start Recording, and a hold on the live recording state; aligned carousel timing with the new clip in [Public Landing Pages](./components/landing-page.md).
- **Workflow media recapture**: Documented real ScreenCLI footage of a fictional recording and the completed SOAP generation/review sequence, plus a native two-window drag of the note into the fictional Rosewood EHR chart. All three clips now have MP4 playback that starts at the beginning of each selected step, matching carousel timing, and GIF fallbacks in [Public Landing Pages](./components/landing-page.md).

## 2026-09-17

- **Demo funnel and workflow display refinement**: Removed the redundant overview-video section from `/demo` while retaining it on `/`, preserved the three-step workflow lesson on both routes, corrected its desktop GIF frame to the native 3:2 composition, and delayed carousel autoplay until the lesson is actually visible.
- **Workflow GIF demonstrations**: Replaced the three static landing-page workflow screenshots with compact live-app GIFs for starting an Exam Layout recording, stopping it through transcript preparation, and copying the Subjective section followed by the full note. Captures use a synthetic fictional exam and keep recent-note history hidden.
- **Workflow mobile motion**: Documented the phone-width horizontal sliding track for the three-step public landing-page workflow, including testimonial-style spatial continuity and reduced-motion behavior.
- **Workflow carousel refinement**: Replaced the marketing-page simulations with a compact three-step screenshot lesson for record, SOAP review, and EHR transfer. Desktop consistently shows the larger numbered rail; the first step simply omits its back arrow, while arrows otherwise sit at the card edges. The lesson keeps reduced serif explanation, dots plus mobile swiping, and compact Apple App Store and Google Play badges. Both overview videos now read “Watch our explainer video”; the top “How it works” navigation targets the workflow lesson. The demo scheduler introduces “LET'S CHAT” and “Have a Human explain it,” then moves directly to its embed. Documented the behavior and SOAP-facing terminology in [Public Landing Pages](./components/landing-page.md).

## 2026-09-16

- **Demo copy refinement**: Preserved the headline, hero image/layout, walkthrough CTA, and testimonials; refined demo-only copy around after-hours charting and learning the workflow, renamed the secondary CTA “Try It Now,” and kept the agenda visible on mobile. Separately drafted Zoom copy in [Public Landing Pages](./components/landing-page.md). No live Zoom update is implied.
- **Five-habits education funnel**: Added the SEO route `/ai-scribe-habits-for-chiropractors`, its five locally owned illustrations, accessible editorial layout, page metadata, and tracked conversion paths. The guide sends visitors primarily to the existing `/demo` walkthrough and retains an email-only sign-up alternative; documented the routing and measurement boundary in [Public Landing Pages](./components/landing-page.md).

## 2026-09-15

- **Correction**: Documented enforcement of the Meta marketing-only boundary in [Cookie Consent and Analytics](./components/cookie-consent.md) and [Application Routing](./components/app-routing.md): adapter-level route/consent checks and a fresh document before app entry after Meta has loaded. Google click-ID storage and Stripe attribution remain unchanged.

## 2026-09-14

- **Update**: Documented the unified confirmed Zoom booking contract across `/demo` and `/tutorial`, consent-gated Meta `PageView`/`Schedule` measurement, and the retained Google click-ID path for Stripe in [Public Landing Pages](./components/landing-page.md) and [Cookie Consent and Analytics](./components/cookie-consent.md). Added the owner-facing [Meta booking measurement guide](../docs/meta-booking-measurement.md).
- **Correction**: Centralized the confirmed website Meta Dataset ID with the existing hardcoded GA4 and Google Ads destinations; no new deployment-environment workflow is required.

## 2026-09-13

- **Correction**: Identified the generated local asset manifest as historical build evidence rather than a repository link in [Website Release](./operations/website-release.md), so knowledge navigation works in a clean Git checkout. No application files changed.

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
