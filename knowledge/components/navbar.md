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
  { name: 'Billing', path: '/app/billing', icon: 'credit_card' },
  { name: 'Settings', path: '/app/settings', icon: 'settings' }
];
```

Feedback is a nav-styled semantic button that opens a modal without navigation and never receives `aria-current`. The mobile menu closes on outside clicks using refs for the menu and menu button.

## Maintenance Notes

- Use `Link` for internal authenticated routes.
- Logout is a semantic button that calls `onSignOut`.
- Any new authenticated route exposed in nav should also be added to `AuthenticatedApp` routes.
- The dashboard header is a stable `64px` product bar with `44px` targets, restrained white-on-green states, and a white `216px` mobile menu surface.
- Current routes expose `aria-current`; the menu trigger exposes expanded state and its menu relationship.

## Visual Style Reference

Follow [Authenticated navigation](../development/STYLE.md#authenticated-navigation) for the exact desktop/mobile header, logo, spacing, link, menu, focus, and destructive logout treatment.

## Provenance

Derived from [`README.md`](../../src/components/Navbar/README.md).

