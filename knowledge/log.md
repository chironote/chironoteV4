# ChiroNote Knowledge Update Log

## 2026-09-01

- **Update**: Documented the manual Recent Notes recovery path in [Authenticated Application Shell](./components/app-shell.md) and [History Sidebar and Smart Editor](./components/sidebar.md): it reuses the canonical note fetch after a missed realtime update, represents loading and retryable errors honestly, and keeps existing results visible.

## 2026-08-31

- **Android Internal release 28**: Published `28 (1.28)` to the one-person `Early Beta` Internal testing track at 6:51 PM PDT. The signed bundle restores secure Android password saving and autofill; Play confirmed package `com.chironote.app`, target SDK 36, API 22+, zero supported-device loss, and availability to Internal testers. The sole warning remains the expected absence of a deobfuscation file. The release AAB SHA-256 is `DA8C08513E5D2EAC05402C1397DB82949C6F00942D66C8356F7E8299D833485E`. Production was untouched.
- **Android credential restoration**: Ported the reviewed AndroidX Credential Manager sign-in behavior from the unmerged `codex/android-login-credentials` branch into the current `cap-and` architecture. Android now uses a native-only Cognito form that retrieves provider passwords, offers manual passwords only after confirmed authentication, clears legacy plaintext WebView keys, and preserves the website's Amplify Authenticator flow.
- **Recovered authentication history**: Expanded [Authentication UI](./components/auth-ui.md) with the previously unlogged sequence from the 2025 WebView `localStorage` “Remember me” attempt through the 2026 reviewed Credential Manager branch and the branch-lineage failure that kept it out of later Android releases.
- **Credential association follow-up**: Recorded that the manifest's `chironote.ai` Digital Asset Links endpoint still serves the SPA HTML shell rather than association JSON, so app/site credential sharing remains externally blocked even though app-scoped Android provider behavior is restored.

## 2026-08-29

- **Production release 27 submitted**: Promoted the exact Internal-tested `27 (1.27)` bundle to the United States Production track at the existing 100% rollout with managed publishing off. Both production reviews passed: package/version/release notes matched, API 22+ and target SDK 36 were preserved, zero devices were lost across all form factors, and the only warning was the understood missing deobfuscation file. Google Play accepted the submission as `Changes in review` at approximately 12:06 PM PDT; it is not yet available on Google Play. Production `24 (1.24)` and its signed AAB remain rollback evidence.
- **Production/Internal audio parity audit**: Verified before promotion that Production `24 (1.24)` and Internal testing `27 (1.27)` had identical recording, native-lifecycle, upload, transcription, and note-generation source. The source comparison from `74e4df6` to `c9b54de` changes no relevant runtime paths; releases 25-27 are authenticated-product UI and Clipboard catch-up. The retained signed `com.chironote.app` AABs verify as SHA-256 `E36D72900C2EA079F1F2BC4686859F199CDD98F92C894E3C3809B14D862FB0F8` for Production 24 and `EB8B92E229A69FA690620BCCC5F683AA609656C10F12F6B7DB259ED8E343EA8E` for Internal 27.
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
