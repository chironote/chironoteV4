# ChiroNote Knowledge Update Log

## 2026-08-29

- **Production/Internal audio parity audit**: Verified in Play Console that Production is `24 (1.24)` at 100% in the existing single country and Internal testing is `27 (1.27)`. Both target SDK 36, support API 22+, and report the same 20,838-device coverage. The source comparison from `74e4df6` to `c9b54de` has no recording, native-lifecycle, upload, transcription, or note-generation changes; releases 25-27 are authenticated-product UI and Clipboard catch-up. The retained signed `com.chironote.app` AABs verify as SHA-256 `E36D72900C2EA079F1F2BC4686859F199CDD98F92C894E3C3809B14D862FB0F8` for Production 24 and `EB8B92E229A69FA690620BCCC5F683AA609656C10F12F6B7DB259ED8E343EA8E` for Internal 27. Production was not changed during this audit.
- **History timestamp completion**: Restored the date and local-calendar-day fields already consumed by the aligned Recent Notes UI, with focused regression coverage for `Today` and prior-day labels.

## 2026-08-27

- **Android Internal release 27**: Published `27 (1.27)` to the one-person `Early Beta` Internal testing track at 4:26 PM PDT. This signed build delivers the Clipboard reference-layout correction; Play confirmed target SDK 36, API 22+, unchanged supported-device coverage, and availability to Internal testers. The sole warning remains the expected absence of a deobfuscation file. Production was not changed.
- **Clipboard reference correction**: Verified the authenticated Android workspace locally at the supplied phone viewport against the prior native reference. Restored the production surface tokens that had been omitted from `index.css`, then aligned the clipboard card, header, toolbar, and textarea geometry without changing native clipboard, recording, or billing behavior. The next Internal build is required to deliver this source correction.
- **Android Internal release 26**: Published `26 (1.26)` to the one-person `Early Beta` Internal testing track at 4:07 PM PDT. The signed bundle contains the Clipboard workspace surface correction; Play confirmed target SDK 36, API 22+, unchanged supported-device coverage, and availability to Internal testers. The sole warning remains the expected absence of a deobfuscation file. Production was not changed.
- **Clipboard workspace surface**: Restored the default workspace's quiet off-white canvas while keeping a single white clipboard canvas. The textarea begins directly after the SOAP rail with a subtle border and 12px top inset, removing the dark band behind rounded corners without introducing a second colored surface.
- **Android Internal release 25**: Published `25 (1.25)` to the active Internal testing track after a signed, verified bundle build. The release contains the production-UI lineage correction; Play confirmed package `com.chironote.app`, target SDK 36, API 22+, no supported-device loss, and availability to Internal testers. The sole warning is the existing absence of a deobfuscation file. Production remained on `24 (1.24)` and was not changed.
- **Android UI lineage correction**: Re-aligned the shared authenticated UI on `cap-and` with the production Billing, Settings, Feedback, Navbar, Sidebar, and App CSS lineage while retaining Android-only native routing, clipboard, foreground history refresh, and the finalized-container recorder boundary. Android Billing remains usage-only and `/app/pricingplans` remains a safe redirect to `/app/billing`; no Play track or release configuration changed.
- **Production release 24 submitted**: Promoted the exact Internal-tested Android `24 (1.24)` bundle to the United States Production track at the existing 100% rollout scope with managed publishing off. Both production reviews passed, device support was unchanged, and the only Play warning remained the expected missing deobfuscation file. Google Play accepted the change as `Changes in review`; it is not yet available on Google Play. The prior `23 (1.23)` rollout remains rollback evidence, with Play serving `20 (1.20)` to new users while 23 is halted.

## 2026-08-26

- **Android recording container correction**: Replaced Android `MediaRecorder` timeslices with four-minute stop/restart rotation so each separately transcribed upload is a finalized WebM container, while retaining pause/resume container renewal, foreground rotation, upload ordering, and stable `rc2` identities.
- **Internal test release 24**: Published Android `24 (1.24)` to the one-person `Early Beta` Internal testing list at 1:47 PM PDT. The signed target-SDK-36 bundle contains the recording container correction; Play reported no device-support loss and only the expected missing-deobfuscation-file warning. Production was untouched.

## 2026-08-25

- **Android account boundary**: Made billing and purchasing web-only in the Capacitor runtime. Native accounts show the current plan and usage summary, while the pricing route redirects to Account; no native Stripe pricing table or billing-portal action is exposed.
- **Account presentation**: Rebalanced the account hierarchy so Hours saved is the primary professional metric and monthly availability is quieter supporting context, including a consistent `Unlimited` state for Professional usage.
- **Platform lineage**: Clarified that `cap-and` is the maintained Android/Play Internal-testing convergence line, whereas `cap-ios` is an older separate iOS preparation line with divergent native and recording work that requires its own reconciliation.
- **Android recording incident**: Production evidence showed three valid regular audio chunks followed by a structurally invalid final WebM after pause/resume. The backend preserved and finalized the accepted transcript; both transcription providers rejected only the invalid final object.
- **Release-lineage correction**: Google Play Production remains on `20 (1.20)`, whose release notes identify the recording-boundary fix. Internal testing `21 (1.21)`, built from the production-alignment workspace, contained the older recorder and superseded `1.20` for enrolled testers. The retained local `1.21` AAB hash is `A8DD5492A91F378B555AADB22DFB3753482A70F30FBE0A15EB701DDC03D0D77F`.
- **Lifecycle hardening**: Restored the Android single-scheduler invariant on `cap-and`, made Pause flush the current container and Resume start a fresh WebM container, snapshotted and serialized audio events, preserved final markers, enforced regular-before-final uploads, and added an `rc2` object-name marker with stable backend chunk identities plus focused regression tests.

## 2026-07-15

- **Update**: Clarified that native analytics event helpers are disabled with the web marketing instrumentation.
- **Scope**: Recorded that the retained iOS project still requires its deferred plugin and release reconciliation; Android-only sync must not rewrite it meanwhile.

- **Creation**: Added [Capacitor Android Application](./architecture/capacitor-android.md) to define the native wrapper boundary, preserved lifecycle behavior, validation flow, and minimal-difference alignment rule.
- **Update**: Extended the system, development, routing, app-shell, clipboard, and recording concepts with the verified Android adaptations while retaining the production concept structure.
- **Index**: Rechecked the query router and linked the Android platform concept exactly once under Architecture.

## 2026-07-12

- **Preservation**: Added the validated 24-concept knowledge bundle and its maintenance guidance to the production history so the curated repository knowledge is retained with the application.

## 2026-07-01

- **Correction**: Added this required root log after identifying that chronological knowledge history had been omitted from the initial Healtech simplified OKS design.
- **System**: Formalized the [Healtech Simplified Open Knowledge System](./knowledge-management/healtech-simplified-oks.md) as a reusable method and Codex skill.
- **Refactor**: Replaced source-shaped repository concepts with [system architecture](./architecture/system-overview.md) and [development workflow](./development/workflow.md) concepts.
- **Organization**: Flattened the knowledge bundle to one category level, retained security as a first-class domain, and rebuilt the [index](./index.md) as a concept-oriented query map.
- **Initialization**: Consolidated repository READMEs, agent guidance, context documents, security documentation, and standalone references into the initial ChiroNote knowledge bundle.
