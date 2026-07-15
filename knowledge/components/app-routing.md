---
type: component-readme
title: "AppRouting Components"
description: "Public and authenticated route ownership, redirects, and maintenance guidance."
resource: "../../src/components/AppRouting/README.md"
tags: [chironote, component, app-routing]
---


> Source: [`README.md`](../../src/components/AppRouting/README.md)

# AppRouting Components

This folder owns top-level route selection and cross-route side effects. It sits above the authenticated app shell and public marketing pages.

## Files

- `AppRoutes.jsx` defines the public and app route table.
- `RouteTracker.jsx` sends GA4 pageviews, captures `gclid`, and records descriptive page-view analytics events.
- `PWARedirect.jsx` redirects standalone PWA launches from `/` to `/app`.

## Route Table

`AppRoutes` lazy-loads public pages and routes authenticated app traffic to `AuthWrapper`:

```jsx
<Route path="/" element={<Navigate to="/ai-chiropractic-soap-notes" replace />} />
<Route path="/ai-chiropractic-soap-notes" element={<ConsiderationLandingPage />} />
<Route path="/learn-more" element={<ConversionLandingPage />} />
<Route path="/tutorial" element={<TutorialPage />} />
<Route path="/blog" element={<BlogList />} />
<Route path="/blog/:slug" element={<BlogPost />} />
<Route path="/app/*" element={<AuthWrapper />} />
```

When `App` detects a native Capacitor runtime, `AppRoutes` exposes only `/app/*` and redirects every other path to `/app`. The shared marketing files remain aligned with production, but public routes, route tracking, cookie consent, and advertising analytics are not activated in the wrapper.

## Side Effects

`RouteTracker` intentionally renders `null`; its job is analytics:

```js
ReactGA.send({ hitType: 'pageview', page: location.pathname + location.search });
captureGclid();
```

`PWARedirect` detects standalone mode with `matchMedia('(display-mode: standalone)')`, iOS `window.navigator.standalone`, and Android app referrers.

## Maintenance Notes

- Add new public routes here, not in `AuthenticatedApp`.
- Add authenticated subroutes inside `AppShell/AuthenticatedApp.jsx`.
- Keep route names in `RouteTracker` aligned with analytics reporting.
- Keep the native route table authenticated-only; add shared authenticated routes under `/app` instead of creating a second mobile app shell.

## Provenance

Derived from [`README.md`](../../src/components/AppRouting/README.md), [`App.jsx`](../../src/App.jsx), and [`AppRoutes.jsx`](../../src/components/AppRouting/AppRoutes.jsx).

