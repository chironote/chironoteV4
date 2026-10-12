# Knowledge Update Log

## 2026-10-11

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
