---
type: development-workflow
title: "Frontend and Native Verification Workflow"
description: "Local scripts, authored test coverage, generated boundaries, and verification expectations for the V4 Capacitor client."
resource: "../../package.json"
tags: [development, react, tests, build, capacitor]
---

# Frontend and Native Verification Workflow

The project uses Create React App with React 18 and Capacitor 6. `npm start`
runs the development server, `npm test` runs the Jest/React Testing Library
suite, `npm run build` creates the production web bundle, and `npm run build:mobile`
builds then runs Capacitor sync. The checked-in focused test exercises the
recording manager's delayed iPhone WebKit events, pause/resume rotation, final
chunk ordering, discard, unmount cancellation, and the intentionally preserved
WebM-labelled upload contract.

Amplify-generated GraphQL/model files and native platform projects are part of
the integration surface but should be regenerated or synchronized through their
own tooling when the backend schema or web build changes. `build/`,
`node_modules/`, native build outputs, and secrets/configuration generated outside
the tracked source are evidence exclusions for repository knowledge.

Before a release, verify the web build, the recording and dictation paths on
supported browsers, and native microphone/background behavior on real iOS and
Android devices. Keep cross-repository Lambda and GraphQL assumptions aligned
with their owning repositories; this checkout alone cannot validate the remote
service implementations.

AuthUI regressions use synthetic credentials to verify legacy-key cleanup without reads, standard autocomplete, bounded errors/no credential logging, transient refresh handling, explicit sign-out and stale-session suppression. No live auth or password-provider test is implied.

The workflow candidate also has shared patient capture, save/review, deletion, reassignment, export, route/draft, native clipboard and PDF delivery tests. PatientClipboardFlow tests authoritative identity and native billing route restrictions. useDesktopSave tests native touch Save versus mobile web. Tests/build/OKS checks are delegated and must be recorded separately; source changes alone are not a pass. Synthetic responsive fixtures belong outside app runtime; device release checks remain required.

CRA Jest27 maps Router7 package exports to the installed CommonJS entry points so tests execute the real route guards. The jsdom setup supplies browser encoding/fetch primitives. Secure UUID fallback tests cover older WebViews and fail-closed behavior.

Installed Router 7.2's CommonJS DOM entry duplicates the core router contexts, unlike its shared ESM chunk. The route-guard regression therefore imports the actual core RouterProvider with ReactDOM.flushSync, matching the DOM wrapper behavior while keeping real navigation and useBlocker assertions. This test accommodation does not change the production ESM entry or prove device behavior.

The 2026-10-11 candidate passed 33 suites / 140 tests, production web compilation, synthetic phone/landscape previews and an offline bootstrap of the actual production /app route. A CSS-only sign-in card width fix was rebuilt and verified afterward. Only blocked font requests occurred during offline bootstrap; no app endpoint was contacted. See the [review evidence](../../docs/mobile-catchup-2026-10-11/README.md) for limits and remaining Mac/device gates.

## Provenance

- [Package scripts](../../package.json)
- [Recording lifecycle test](../../src/components/Recording/RecordingManager.test.js)
- [Real route-guard regression](../../src/components/Patients/DraftRouteGuard.test.jsx)
- [Repository README](../../README.md)
- [iOS checklist](../../ios-setup-checklist.md)
- [Recording context](../../src/components/Recording/Context.md)
- [Git ignore rules](../../.gitignore)

Knowledge concepts synthesize domains rather than mirror source documents. Update
the affected concept and [knowledge log](../log.md) when implementation or operational
evidence changes.
