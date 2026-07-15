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
