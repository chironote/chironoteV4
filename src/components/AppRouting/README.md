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
