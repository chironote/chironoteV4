# AppRouting Components

This folder owns top-level route selection and cross-route side effects. It sits above the authenticated app shell and public marketing pages.

## Files

- `AppRoutes.jsx` defines the public and app route table.
- `PWARedirect.jsx` redirects standalone PWA launches from `/` to `/app`.

## Route Table

`AppRoutes` lazy-loads public pages and routes authenticated app traffic to `AuthWrapper`:

```jsx
<Route path="/" element={<LandingPage />} />
<Route path="/demo" element={<DemoLandingPage />} />
<Route path="/ai-chiropractic-soap-notes" element={<Navigate to="/" replace />} />
<Route path="/learn-more" element={<Navigate to="/" replace />} />
<Route path="/tutorial" element={<TutorialPage />} />
<Route path="/blog" element={<BlogList />} />
<Route path="/blog/:slug" element={<BlogPost />} />
<Route path="/app/*" element={<AuthWrapper />} />
```

`/demo` is the scheduler-focused public landing variant. The former public landing URLs redirect to `/` so saved links keep working while search engines and analytics converge on one canonical page.

`PWARedirect` detects standalone mode with `matchMedia('(display-mode: standalone)')`, iOS `window.navigator.standalone`, and Android app referrers.

## Maintenance Notes

- Add new public routes here, not in `AuthenticatedApp`.
- Add authenticated subroutes inside `AppShell/AuthenticatedApp.jsx`.
- Application-wide page measurement lives in `Analytics/GoogleAnalytics.jsx`; keep its page-type mapping aligned with this route table.
