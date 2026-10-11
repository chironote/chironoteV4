# iOS authentication boundary

AuthContainer restores the Amplify/Cognito session, keys the clinical workspace by principal and handles explicit and Hub sign-out transitions. A narrow `NetworkError` token-refresh failure retains the current session, matching the established Android classifier; other refresh failures sign out. Signing out immediately removes the clinical view and holds loading until Amplify cleanup completes. Revision and mounted guards prevent stale restoration from reopening a signed-out/unmounted session.

SignInForm keeps entered email/password only in React memory. It supports standard `username` / `current-password` autocomplete and an accessible password-visibility button. It does not implement or promise iOS Keychain credential saving. Incomplete Cognito steps stay unauthenticated and direct the user to the existing website verification/recovery path. Concurrent submits and post-unmount completions cannot open a session. Unknown provider errors become generic copy, and no auth user/error/credential objects are logged.

credentialStorage removes the historical saved_email and saved_password localStorage keys without reading them. Cleanup runs on AuthContainer startup (including surviving sessions), standalone form mount and explicit sign-out; it leaves Cognito tokens and other preferences alone and tolerates unavailable storage. The misleading plaintext Remember me option is removed. Tests use synthetic credentials only and cover cleanup, session races, network refresh, sign-out, autocomplete and log boundaries. No live auth or password-provider integration was tested.

Source provenance: existing cap-ios AuthContainer/SignInForm layout; NetworkError classification from Android NativeAuthContainer; bounded credential/session correction on 2026-10-11.

The auth container and card use border-box sizing so their padding stays inside the available width. The card can shrink below 320px while retaining its 400px maximum; this addresses the measured 375px bootstrap overflow without changing the sign-in design. Responsive evidence is from offline synthetic browser checks, not an iOS device or live sign-in.
