---
type: component-readme
title: "Authenticated Navigation"
description: "Stable authenticated route order, feature gating, accessible state and desktop/mobile navigation behavior."
resource: "../../src/components/Navbar/README.md"
tags: [chironote, component, navbar]
---


# Authenticated Navigation

Desktop and mobile navigation share the same route list: Home, Patients (when `patientNotesEnabled`), Billing, Settings. Home is omitted on the dashboard (`/app`); on subroutes it appears first, before Patients. Disabling Patients leaves Home (on subroutes), Billing, Settings in that order. Feedback retains its position after Settings, followed by Logout.

`Navbar` receives `onSignOut` and `onFeedback` from `AuthenticatedApp`. Routes use `Link` inside the application data router so the shared dirty-note guard can hold transitions; sign-out delegates to the guarded shell callback. Only an exact current route receives `aria-current="page"`. Feedback is a semantic button that opens a modal without navigation and never receives `aria-current`. The mobile menu closes on route selection and outside clicks; Feedback and Logout retain their existing menu-close behavior.

## Maintenance Notes

- Use `Link` for internal authenticated routes.
- Logout is a semantic button that calls `onSignOut`.
- Any new authenticated route exposed in nav should also be added to `AuthenticatedApp` routes.
- The dashboard header is a stable `64px` product bar with `44px` targets, restrained white-on-green states, and a white `216px` mobile menu surface.
- Current routes expose `aria-current`; the menu trigger exposes expanded state and its menu relationship.

## Visual Style Reference

Follow [Authenticated navigation](../development/STYLE.md#authenticated-navigation) for the exact desktop/mobile header, logo, spacing, link, menu, focus, and destructive logout treatment.

## Provenance

- [Navbar implementation](../../src/components/Navbar/Navbar.jsx): shared route list, active state and handlers.
- [Navbar tests](../../src/components/Navbar/Navbar.test.jsx): dashboard/subroute order, Patients gating and desktop/mobile parity.
- [Navbar feature README](../../src/components/Navbar/README.md): ownership and maintenance guidance.
- [Authenticated shell](../../src/components/AppShell/AuthenticatedApp.jsx): guarded route/sign-out integration.

