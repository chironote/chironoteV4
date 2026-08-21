# ChiroNote Knowledge Update Log

## 2026-08-20

- **Android recording boundary**: Documented the single-scheduler invariant: Android uses only the four-minute `MediaRecorder` timeslice, while external stop/restart rotation remains non-Android behavior. Recorded serialized audio-event/upload ordering, intentional final-chunk classification, paused-stop flushing, and discard-like unmount cleanup.
- **Internal testing 19**: Published the signed `19 (1.19)` Android bundle to the active Internal testing track. Play confirmed the package `com.chironote.app`, target SDK 35, no device-support loss, and availability to internal testers at 17:08 Pacific. The verified local AAB SHA-256 is `8F71DAA283C3FDBC7BAAD7580D9E4EA3976BFC351A4D53423348ED1BB7DB32B6`; Production was not changed.

## 2026-07-20

- **Cross-platform visual convergence**: Ported the production Clipboard, authenticated navbar, and Smart Editor visual contracts to the Capacitor Android line while preserving the native clipboard adapter, lifecycle code, and packaging boundary.
- **Accessibility alignment**: Added semantic navigation state, button-based logout, explicit toolbar/editor labels, and consistent target sizing.

## 2026-07-19

- **Android release versioning**: Documented the required `versionCode` and `versionName`, Play Console version-code preflight, and the signed App Bundle workflow.
- **Private beta boundary**: Recorded that beta delivery uses the active Internal testing track and its one-user `Early Beta` list; it does not authorize Production promotion.
- **API 35 toolchain**: Recorded Android Gradle Plugin 8.6.1, Gradle 8.7, and JDK 17+ as the supported build pairing for the current target.
- **Internal beta 16**: Published signed bundle `16 (1.16)` to the one-tester Internal testing track at 18:58 Pacific; Play confirmed it available to internal testers. Production was not changed.
- **Signing automation**: Added the safe CLI pattern: external keystore, user-scoped secrets, non-interactive Gradle signing, artifact verification, and an explicit Internal-only publication guard.
- **Local CLI signing**: Wired release builds to the external ChiroNote upload keystore through the ignored `android/keystore.properties` file, with alias `key0`, required-property validation, and broader keystore ignore rules.
- **Production 16 submission**: After two production-readiness reviews, promoted the exact Play-hosted Internal artifact `16 (1.16)` to a 100% Production rollout for the existing one-country audience and submitted it to Google review. Play reported zero device loss, target SDK 35, and two non-blocking warnings (larger download and no deobfuscation file with `minifyEnabled false`). Production `13 (1.13)` is the rollback reference until review completes; the same-version local AAB was not uploaded because its signature could not be verified.

## 2026-07-16

- **History timestamps**: Standardized history metadata as `time | weekday | date`, using `time | Today` for notes from the current local calendar day across the website, Android app, and Chrome extension.
- **History navigation**: Documented the compact flat history rows, visible per-note dates, and collapsible week separators shared by the website and Android UI.

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
