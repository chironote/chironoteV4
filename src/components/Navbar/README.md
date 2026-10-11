# Navbar Components

This folder owns the authenticated app navigation bar.

## Files

- `Navbar.jsx` renders desktop and mobile authenticated navigation.
- `Navbar.test.jsx` covers dashboard/subroute order, Patients gating, desktop/mobile parity, current-page semantics, Feedback and Logout.
- `Navbar.css` styles the app nav, logos, links, mobile menu, and logout states.

## Behavior

`Navbar` receives `onSignOut` and `onFeedback` from `AuthenticatedApp`. Feedback is a semantic button that opens a modal without navigation.

Desktop and mobile share one route list: Home, Patients (when `patientNotesEnabled`), Billing, Settings. Home is omitted on the dashboard (`/app`); on subroutes it appears first, before Patients. Feedback keeps its existing position after Settings, followed by Logout. The exact current route receives `aria-current="page"`.

The mobile menu closes on outside clicks using refs for the menu and menu button.

## Maintenance Notes

- Use `Link` for real authenticated routes and reserve `aria-current` for those links. Feedback remains a button.
- Logout is a semantic button that calls `onSignOut`.
- Any new authenticated route exposed in nav should also be added to `AuthenticatedApp` routes.
- Keep the header at `64px`, links and the mobile trigger at least `44px` high, and current-page/focus semantics visible.
- The mobile menu is a white product surface with the standard border, `12px` radius, and menu shadow.

## Patient notes integration

`patientNotesEnabled` adds a Patients link at `/app/patients`. Navigation remains inside the application data router so the shared dirty-note guard can hold a route transition; sign-out remains delegated to the guarded shell callback.
