# AuthUI Components

This folder owns the platform-specific authentication presentation. The website keeps Amplify Authenticator, while Capacitor Android uses a small custom Cognito form so the native AndroidX Credential Manager can retrieve and save passwords through the user's selected provider.

## Files

- `SignIn.jsx` exports the branded header used by the website's Amplify Authenticator.
- `NativeAuthContainer.jsx` restores the existing Cognito session on Android, listens for auth lifecycle events, and passes `user` and `signOut` into `AuthenticatedApp`.
- `SignInForm.jsx` renders Android's manual sign-in fallback and connects successful Cognito sign-in to the native credential provider.
- `AuthUI.css` contains styles scoped beneath `.auth-container` so they do not affect the website or authenticated product UI.
- Adjacent tests cover credential selection, save timing, rejected passwords, legacy cleanup, session restoration, and sign-out.

## Important Code

`AuthWrapper` selects the authentication boundary by runtime:

```jsx
if (isNativePlatform()) {
  return (
    <NativeAuthContainer>
      <AuthenticatedApp />
    </NativeAuthContainer>
  );
}
```

On Android, `SignInForm` asks Credential Manager for a password on mount. A manually entered password is offered to the provider only after Cognito confirms a complete sign-in. A provider-selected password is not offered again.

## Maintenance Notes

- Never store raw passwords in WebView storage. `NativeAuthContainer` removes the historical `saved_email` and `saved_password` keys on every launch.
- Credential retrieval and saving are optional. Provider cancellation or unavailability must always fall back to manual sign-in without invalidating a successful Cognito session.
- Keep website signup, password recovery, and terms acceptance in Amplify Authenticator; the native form intentionally directs those workflows to the website.
- Preserve `autocomplete="username"` and `autocomplete="current-password"` on the native fields.
- `chironote.ai/.well-known/assetlinks.json` must eventually serve valid Digital Asset Links JSON for verified app/site credential sharing. The Android app can use its provider without that cross-surface association.
