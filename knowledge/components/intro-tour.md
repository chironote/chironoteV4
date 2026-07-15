---
type: component-readme
title: "IntroTour Components"
description: "First-run Shepherd tour behavior, targets, persistence, and cleanup guidance."
resource: "../../src/components/IntroTour/README.md"
tags: [chironote, component, intro-tour]
---


> Source: [`README.md`](../../src/components/IntroTour/README.md)

# IntroTour Components

This folder owns the first-run guided tour for authenticated users.

## Files

- `IntroTour.jsx` initializes and controls the Shepherd.js onboarding tour.

## How It Decides To Run

`IntroTour` treats the `UserSubscription.isActivated` field as the source of truth. It fetches user attributes, loads the subscription, and exits when the user is already activated:

```js
if (subscription?.isActivated === true) {
  return;
}
```

When the tour runs for a new user, it tracks signup and later updates `isActivated` to prevent repeat tours.

## Tour Targets

The tour depends on selectors rendered by other folders:

```js
'#new-note-btn'
'.popup-content'
'#dictation-mic-btn'
'.left-panel'
'#edit-panel-btn'
'.edit-panel'
```

Changing those ids or class names can break onboarding.

## Maintenance Notes

- The component renders `null`; all visible UI is created by Shepherd.js and injected styles.
- Cleanup is extensive because the tour temporarily disables pointer events and adds overlays.
- Do not reintroduce localStorage as the source of truth for whether to show the tour; the current code comments explicitly prefer the database flag.

## Provenance

Derived from [`README.md`](../../src/components/IntroTour/README.md).

