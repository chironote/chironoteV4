# LandingNavbar Components

This folder owns the public-site navigation bar used by landing and blog pages.

## Files

- `LandingNavbar.jsx` renders desktop and mobile public navigation.
- `LandingNavbar.css` styles the public nav, mobile menu, logo variants, and sign-in CTA.

## Behavior

`LandingNavbar` can be used in two modes:

- With `onNavClick`, it renders section buttons for landing-page anchors such as `faq` and `prices`.
- Without `onNavClick`, it renders a simpler public nav with `Home`, `Blog`, and `Sign In`.

Section clicks delegate scrolling to the parent:

```js
const handleNavItemClick = (sectionId) => {
  if (onNavClick) {
    onNavClick(sectionId);
  }
  setMobileMenuOpen(false);
};
```

The sign-in link points to `/app` and can emit analytics through `handleButtonClick`.

## Maintenance Notes

- The component uses two logo assets: colored desktop and white mobile variants.
- The mobile menu closes on outside clicks using a document click listener.
- Keep public nav labels aligned with sections available on the landing pages that use it.
