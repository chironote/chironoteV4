# ChiroNote Knowledge Update Log

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
