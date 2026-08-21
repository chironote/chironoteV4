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
- Logout is a semantic button that calls `onSignOut`.
- Any new authenticated route exposed in nav should also be added to `AuthenticatedApp` routes.
- Keep the header at `64px`, navigation targets at least `44px` high, and current-page/focus semantics visible.
- The mobile menu is a white product surface with the standard border, `12px` radius, and menu shadow.
