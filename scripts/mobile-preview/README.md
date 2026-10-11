# Synthetic mobile review

`node scripts/mobile-workflow-preview.cjs` builds an isolated webpack fixture in ignored `.mobile-preview`, outside the release `build` directory so Capacitor sync cannot package the fixture. Serve that directory with a local static server, then use `/#patients`, `/#export`, `/#capture`, `/#clipboard`, or `/#popup` at 375px portrait and phone landscape widths. Patient and Amplify modules are replaced at bundle time with synthetic read-only fixtures; there are no authentication, patient/provider or export endpoint calls. Only the public icon font stylesheet is external.

These are the actual components/styles. The fixture does not simulate a native WebView, OS keyboard, microphone or share receiver. Use it for visual/touch layout review, and the focused Jest tests for identity/version/draft/diagnosis and PDF adapter behavior. Hardware acceptance remains separate. The fixture is never imported by the production entrypoint.
