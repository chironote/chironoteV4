---
type: component-readme
title: "Navbar Components"
description: "Current authenticated navigation, Feedback modal trigger, and route-link semantics."
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

`Navbar` receives `onSignOut` and `onFeedback` from `AuthenticatedApp`; Feedback opens a modal without navigation.

The link list depends on the current route. On `/app`, the Home link is omitted:

```js
const links = [
  ...(isOnDashboard ? [] : [{ name: 'Home', path: '/app', icon: 'home' }]),
  { name: 'Billing', path: '/app/billing', icon: 'credit_card' },
  { name: 'Settings', path: '/app/settings', icon: 'settings' }
];
```

The mobile menu closes on outside clicks using refs for the menu and menu button.

## Maintenance Notes

- Use `Link` for internal authenticated routes.
- Feedback and Logout are semantic buttons; internal destinations use `Link` and reserve `aria-current` for the active route.
- Any new authenticated route exposed in nav should also be added to `AuthenticatedApp` routes.

## Provenance

Derived from [`README.md`](../../src/components/Navbar/README.md).

