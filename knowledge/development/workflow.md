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

## Provenance

- [Package scripts](../../package.json)
- [Recording lifecycle test](../../src/components/Recording/RecordingManager.test.js)
- [Repository README](../../README.md)
- [iOS checklist](../../ios-setup-checklist.md)
- [Recording context](../../src/components/Recording/Context.md)
- [Git ignore rules](../../.gitignore)

Knowledge concepts synthesize domains rather than mirror source documents. Update
the affected concept and `knowledge/log.md` when implementation or operational
evidence changes.
