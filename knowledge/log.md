# Knowledge Update Log

## 2026-10-21

- **TestFlight 1.9 (15)**: PR #74 source
  d601e4c21188039e78b24c3ad28dc65484803fd7 passed 38 suites / 246 tests and 2
  focused suites / 52 tests; production web build, iOS sync, OKS and diff checks
  passed. The verified TestFlight IPA is 4,177,276 bytes (SHA-256
  e038071d303927fa9dee7a257bc82c9762ec63aadac59608afcbaa9160c7529f). Apple
  accepted the Internal Only upload at 3:32 PM PDT; build
  f2674026-fc63-4c49-870d-4fe0ef56f364 is Testing for Inner Circle (one
  invitation, 90 days). Tester notes are saved. The WebM/Opus candidate still
  needs physical-device completeness verification; the recording-integrity and
  public-release hold remain open. No App Review or public release is claimed.
  See [mobile build](operations/mobile-build.md).

- **WebM recording candidate after build 14 failed**: the owner reports about 41 seconds survived the next longer recording. iOS now prefers supported WebM/Opus to avoid the MP4 writer, retaining MP4 on older devices and the existing segment assembly/upload contract. [Recording lifecycle](components/recording-lifecycle.md) records the rationale; physical-device verification and the public-release hold remain pending.

- **Retry banner lifetime**: the default note-generation failure message clears after 10 seconds; replacement and unmount cancel dismissal without clearing newer note drafts or other errors. [App shell](architecture/app-shell.md) documents this presentation-only change; backend retries and recording/transcription timeouts are unchanged.

- **TestFlight 1.9 (14) and recording hold**: PR #73 merge
  `367eb6558c1ccfdc0852d56f12c39e3a51d10bef` passed 38 suites / 245 tests, 51
  focused tests, production web build and iOS sync. Organizer accepted the
  Internal Only upload; build `3ca05248-94f1-46d9-abac-0a945eea5b2e` is Testing
  for Inner Circle (one invitation, 90 days). IPA SHA256:
  `c6483942da5fdcfe46d33ea1289725807e953bcea7a592fa74efeb1b1b1f26ef`.
  The owner clarified the first build-13 symptom as about 20 seconds / 32 words,
  not a fixed five-second clip; Apple tester records identify iPad Air 5 / iOS
  26.1. The existing provider transcript and final note roughly align, placing the loss
  before note generation; recorder versus transcription remains unresolved.
  WebKit bug 299164 is plausible, not proven. Device acceptance and the
  App Review/public-release hold remain. The primary fast-forwarded after backing
  up 5 tracked and 9 untracked files. See [mobile build](operations/mobile-build.md).

- **App Store 1.8 (13) upload**: recorded explicit public-release authorization, source d5218b8, signed archive and distribution IPA checks/hash, byte-identical build-12 web assets, saved 1.8 draft and error-free upload acceptance at 1:42 PM PDT with Apple processing underway in [mobile build](operations/mobile-build.md). [Privacy boundaries](security/privacy-boundaries.md) records published Name/Health/Other User Content label corrections. No App Review submission or live public 1.8 is yet claimed; device checks and Capacitor advisory remain unresolved.

- **iOS 15 minimum**: raised all project/app Debug/Release deployment targets and the CocoaPods platform to 15.0, dropping iOS 13/14 support for future builds. Updated [mobile build](operations/mobile-build.md) and the setup checklist. Existing TestFlight build 12 is unchanged; this source update does not publish a new build or resolve the separate Capacitor advisory.

- **TestFlight 1.8 (12) Testing**: published archived source d5a3776 to unchanged Inner Circle, one invitation/90 days; build 11 remains Testing with 85 days. [Mobile build](operations/mobile-build.md) records desktop-session archive, upload receipt, distribution IPA hash/signature/privacy/export, saved tester notes and outstanding device checks. [Privacy boundaries](security/privacy-boundaries.md) records pre-existing Capacitor 6.2.1 advisory and unresolved public-release review; dependencies were not changed. No public App Store release occurred.

- **TestFlight preparation**: recorded PR #63 integration, real production configuration, 243 passing Mac tests, clean native sync and unsigned Release build in [mobile build](operations/mobile-build.md). Preserved build-11 historical fallback evidence, dirty primary and precise Apple/desktop access handoff. No public release or current tester availability is claimed.

- **Recovered-result candidate**: documented split stream controls, authoritative recovered body/version retrieval, session ownership, uncertainty and platform acceptance limits in [the recovery contract](components/recording-lifecycle.md). PR #63 subsequently merged at fe1a2d5; real-config Mac release checks are recorded in [mobile build](operations/mobile-build.md). No new signed/uploaded artifact is yet claimed.


## 2026-10-15

- Reviewed retry and next-appointment races in [recording lifecycle](./components/recording-lifecycle.md) and [app shell](./architecture/app-shell.md): bounded/fenced auth reads, acknowledged S3 success after cancellation races, one dispatch credential refresh, WebKit final classification at onstop, accepted-capture credit guards, early presentation handoff and separate NoSleep ownership. Late credit denials cancel only their capture's remaining work, preserving policy without cancelling B; startup dismissal cancels pending acquisition. Clarified FIFO's finite deduplication window and unverified backend duplicate/billing guarantees. Delegated validation passed 36 suites / 217 tests, web compilation with a temporary empty ignored Amplify configuration, OKS and diff checks; fixture removed. Source integration is distinct from App Store/TestFlight publication; device gates remain open.

- Updated [recording lifecycle](./components/recording-lifecycle.md), [data integration](./architecture/data-integration.md), [app shell](./architecture/app-shell.md) and [mobile release gates](./operations/mobile-build.md) for process-alive audio retention, staged S3/SQS retries, no-progress cancellation and per-recording completion/presentation ownership. Next capture proceeds while earlier work remains pending; discard is session-scoped. Preserved WebKit/media labels and transcript timeout policy. No backend, restart persistence, deployment or physical-device evidence is implied.

- Updated [patient capture](./architecture/patient-notes.md) and [recording lifecycle](./components/recording-lifecycle.md) for visible new/unassigned Exam Layout, separate persisted manual intent, synchronous effective settings snapshots and typed-name confirmation preserving Exam/PI when unassigned. Retained legacy/existing-patient and WebKit semantics. Scoped source correction only; no deployment or device acceptance implied.

## 2026-10-12

- Aligned native Clipboard control typography and 44px minimum targets across phone/tablet platforms using a separate native presentation class. Kept phone 44/48px geometry and tablet insets intact; scoped iOS icon surface feedback to native Clipboard controls.

- Restored the complete labelled phone New Note action and documented shared portrait/landscape detection, bounded targets/gaps, independent native Save, preserved SOAP rail behavior and iOS cascade overrides in [note workspace](./components/note-workspace.md). Scoped recording dialog styles so they no longer resize Clipboard.
- Updated [app shell](./architecture/app-shell.md) for guarded native phone/tablet and phone web Smart Editor toggle/shortcut access, omitted panel mounting and stale open-state closure with edit text retained. Desktop web access and patient/draft/save guards remain intact; native tablet Save is independent and tablet geometry is preserved. Source changes require delegated tests/build/visual validation; no device acceptance or publication is implied.

## 2026-10-11

- **Conditional iOS phone layout correction**: Owner requested iOS changes only if visual checks reproduced the Android regression. The unmodified 375px iOS preview showed toolbar wrapping and a reserved 52px empty SOAP rail. Applied the same compact 48px phone toolbar, balanced empty-note gutters, 16px text and spaced patient/visit identity as Android, preserving SOAP-copy behavior. Updated workspace concept, index and Clipboard README. This source correction is separate from TestFlight 1.8 (9) already Testing and from physical-device acceptance.

- **TestFlight 1.8 (9) Testing**: Uploaded source `99ab5d2` through Xcode TestFlight Internal Only at 6:05 PM PDT; Apple processing completed and the exact build is Testing for Inner Circle (1 tester, 1 invitation, 90 days remaining). Saved beta acceptance notes. Signed archive, delivered Apple Distribution IPA, identity/team, privacy packaging and codesign checks passed. IPA SHA-256 `1c4b8a80953e732c7ec860388081f7705d412a28fbe2b3fc85b78b1ba36a9a84`. Recorded explicit version/build overrides, registered `ai.chironote.app`, automatic distribution and prior 1.7 fallback availability (41 days) in mobile-build/index. Warning 90068 concerns the April 2027 minimum-iOS-15 upload requirement; current minimum 13 retained. Both patient flags remain enabled for testing. Public 1.7 and dirty primary checkouts preserved. Physical-device acceptance remains unverified.

- **Mac native validation**: CocoaPods 1.16.2 resolved Share 6.0.2; committed the generated lockfile with no other pod version changes. Capacitor sync preserved the Xcode project, and Xcode 26.6 built the unsigned simulator app with the app privacy manifest included. Updated mobile-build guidance and native validation evidence. Signed archive, registered Apple identity and physical-device acceptance remain open; no store submission occurred.

- **Local source validation**: 33 Jest suites / 140 tests passed. Production web build and actual offline /app bootstrap passed; the subsequent CSS-only auth-card correction was rebuilt and verified at375px and812px without horizontal overflow or router/page errors. Synthetic patient workflow evidence is preserved in docs/mobile-catchup-2026-10-11. Static privacy/plist/resource and Share dependency checks passed. Mac Podfile.lock resolution, Xcode archive/signing and device acceptance remain pending; no Apple submission or backend change occurred.

- Corrected auth container/card box sizing and removed the fixed card minimum after offline production bootstrap measured horizontal overflow at 375px. Retained sign-in presentation; rebuild and portrait/landscape validation are delegated, without live authentication.

- Documented Router 7.2 CommonJS duplicate-context behavior and the real core-provider/flushSync test accommodation; production ESM and real failed-save/discard navigation assertions remain intact. Delegated rerun and offline ESM bootstrap evidence are tracked separately.

- Corrected mobile clipboard/landscape navigation layout after synthetic overflow evidence: wrap toolbar while keeping visible Edit/Save together, widen the established section-copy rail for 44px targets, and bound/scroll the compact navigation menu. Documented older-WebView crypto and array-index compatibility without claiming device verification.

- Added secure UUID fallback semantics for older iOS WebViews and narrow FileTimestamp C617.1 app-container privacy-manifest provenance. Documented real Router7/Jest resolution, isolated recorder plugin imports and Mac archive verification still pending.

- Corrected native credential/session documentation: removed plaintext saved-email/password storage and Remember me, purge legacy keys without reading them, retain standard autocomplete, suppress raw auth logs, preserve transient refresh NetworkError and prevent stale restoration after sign-out. No Keychain integration or live authentication is claimed.

- Updated app-shell and note-workspace ownership for the shared patient workflow port from prod142383e onto cap-ios2326d34. Native phones/tablets now expose guarded versioned Save, diagnosis confirmation and one main clinical editor; browser-mobile retains its prior gate.
- Updated patient-notes and mobile-build concepts for compact capture, deletion/reassignment, complete PDF selection and native cache/share delivery. Recorded Share6.0.2 and required Mac signing/pod/device checks without changing bundle identities.
- Updated history refresh and dictation concepts for the new shell, native foreground recovery, preserved insertion ranges and unchanged WebKit recorder stop semantics. Native account/auth and no-op analytics boundaries are retained.
- Added verification routing for mocked patient/native adapter regressions and synthetic responsive fixtures. No live provider/patient validation or App Store release is implied.


## 2026-10-10

- **Update**: Added patient capture/history integration, separate names/labels, guarded saved-note workflows and automatic language selection. Removed full clinical payload logging. iOS keeps native edit/copy behavior with no new clinical-body Save. Native presentation tokens, scoped ios.css and status-bar appearance were ported from the original dirty checkout; unrelated original changes remain untouched. Local candidate only; no push, release or deployment.

## 2026-09-13

- **Initialization**: Expanded the thin knowledge layer into a shallow,
  concept-oriented OKF bundle covering the authenticated app shell, data
  integration, recording, dictation, note workspace, mobile build, privacy
  boundaries, and verification workflow.
- **Synthesis**: Reviewed the authored React, Capacitor, GraphQL, native project,
  documentation, configuration, and focused test sources while excluding
  generated dependencies, build outputs, binaries, and secret values. Preserved
  the existing recording lifecycle concept and unrelated working-tree edits.

## 2026-09-01

- **Creation**: Added [Recent history refresh](./components/recent-history.md) to document the shared history query, realtime updates, and manual recovery action.

## 2026-08-20

- **Initialization**: Added the [Recording lifecycle](./components/recording-lifecycle.md) concept from the current recorder implementation and recording context.
- **Correction**: Recorded the WebKit stop ordering while preserving the established WebM-labelled upload contract; the older component context described a generic frequent-timeslice flow that does not apply to iPhone.
