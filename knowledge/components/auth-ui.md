---
type: component-readme
title: "AuthUI Components"
description: "Authentication UI component ownership and customization guidance."
resource: "../../src/components/AuthUI/README.md"
tags: [chironote, component, auth-ui]
---


> Source: [`README.md`](../../src/components/AuthUI/README.md)

# AuthUI Components

This folder customizes the Amplify Authenticator UI.

## Files

- `SignIn.jsx` exports the custom `Header` used by the authentication screen.

## Important Code

The header uses Amplify UI primitives and theme tokens rather than regular HTML wrappers:

```jsx
const Header = () => {
  const { tokens } = useTheme();

  return (
    <View style={{ textAlign: 'center', width: '100%' }}>
      <Image alt="ChiroNote" src={textLogo} />
      <View>HIPAA compliant software</View>
    </View>
  );
};
```

## Maintenance Notes

- This is branding-only UI; authentication behavior is controlled by Amplify/AuthWrapper.
- Keep assets imported from `src/assets` so CRA processes them correctly.
- If changing copy here, verify it still fits inside the Amplify Authenticator layout on mobile.

## Visual Style Reference

Follow [Third-party and Amplify UI](../development/STYLE.md#third-party-and-amplify-ui) and the product [Forms](../development/STYLE.md#forms) rules when changing Amplify tokens, branding, focus, field, or button presentation.

## Provenance

Derived from [`README.md`](../../src/components/AuthUI/README.md).

