---
type: component-readme
title: "Navbar Components"
description: "Authenticated navigation behavior and route-link maintenance guidance."
resource: "../../src/components/Navbar/README.md"
tags: [chironote, component, navbar]
---


> Source: [`README.md`](../../src/components/Navbar/README.md)

# Navbar Components

This folder owns the authenticated app navigation bar.

## Files

- `Navbar.jsx` renders desktop and mobile authenticated navigation.
- `Navbar.css` styles the app nav, logos, links, mobile menu, and logout states.

## Behavior

`Navbar` receives `username` and `onSignOut` from `AuthenticatedApp`, though the current render only uses `onSignOut`.

The link list depends on the current route. On `/app`, the Home link is omitted:

```js
const links = [
  ...(isOnDashboard ? [] : [{ name: 'Home', path: '/app', icon: 'home' }]),
  { name: 'Account', path: '/app/account', icon: 'person' },
  { name: 'Feedback', path: '/app/feedback', icon: 'feedback' }
];
```

The mobile menu closes on outside clicks using refs for the menu and menu button.

## Maintenance Notes

- Use `Link` for internal authenticated routes.
- Logout is an anchor with `preventDefault()` that calls `onSignOut`.
- Any new authenticated route exposed in nav should also be added to `AuthenticatedApp` routes.

## Provenance

Derived from [`README.md`](../../src/components/Navbar/README.md).

