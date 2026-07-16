---
type: component-readme
title: "Application Routing"
description: "Public and authenticated route ownership, compatibility redirects, PWA behavior, and page measurement."
resource: "../../src/components/AppRouting/README.md"
tags: [chironote, component, app-routing]
---

# Application Routing

`AppRoutes.jsx` owns the React Router route table. Public pages are code-split, and `AuthWrapper` is lazy-loaded so Amplify and authenticated application code do not inflate the initial landing-page route.

## Route Table

| Route | Owner | Behavior |
| --- | --- | --- |
| `/` | `LandingPage` | Canonical public landing page. |
| `/ai-chiropractic-soap-notes` | redirect | Compatibility redirect to `/`. |
| `/learn-more` | redirect | Compatibility redirect to `/`. |
| `/tutorial` | `TutorialPage` | Standalone tutorial workflow. |
| `/blog` | `BlogList` | Public post index. |
| `/blog/:slug` | `BlogPost` | Registered public post or a no-index not-found state. |
| `/app/*` | `AuthWrapper` | Amplify authentication and signed-in application. |
| unmatched | redirect | Returns visitors to `/`. |

`PWARedirect` sends standalone PWA launches from `/` to `/app`, including the iOS and Android standalone detection paths.

## Cross-route Measurement

`Analytics/GoogleAnalytics.jsx` initializes Consent Mode, captures `gclid`, emits a `page_view` for each pathname and query change, classifies the route type, and starts Core Web Vitals reporting. Do not add duplicate page-view effects inside route components.

## Provenance

Derived from [`src/components/AppRouting/README.md`](../../src/components/AppRouting/README.md), [`AppRoutes.jsx`](../../src/components/AppRouting/AppRoutes.jsx), [`PWARedirect.jsx`](../../src/components/AppRouting/PWARedirect.jsx), and [`GoogleAnalytics.jsx`](../../src/components/Analytics/GoogleAnalytics.jsx).
