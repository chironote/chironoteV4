# Navbar Components

This folder owns the authenticated app navigation bar.

## Files

- `Navbar.jsx` renders desktop and mobile authenticated navigation.
- `Navbar.css` styles the app nav, logos, links, mobile menu, and logout states.

## Behavior

`Navbar` receives `onSignOut` and `onFeedback` from `AuthenticatedApp`. Feedback is a semantic button that opens a modal without navigation.

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

- Use `Link` for real authenticated routes and reserve `aria-current` for those links. Feedback remains a button.
- Logout is a semantic button that calls `onSignOut`.
- Any new authenticated route exposed in nav should also be added to `AuthenticatedApp` routes.
- Keep the header at `64px`, links and the mobile trigger at least `44px` high, and current-page/focus semantics visible.
- The mobile menu is a white product surface with the standard border, `12px` radius, and menu shadow.
