---
type: component-readme
title: "AuthUI Components"
description: "Web/native authentication boundaries, Android Credential Manager behavior, security invariants, and recovered implementation history."
resource: "../../src/components/AuthUI/README.md"
tags: [chironote, component, auth-ui]
---


> Source: [`README.md`](../../src/components/AuthUI/README.md)

# Authentication UI

ChiroNote has one Cognito authentication authority with two presentation boundaries. The website uses Amplify Authenticator for sign-in, signup, password recovery, and terms acceptance. Capacitor Android uses a focused custom sign-in form so AndroidX Credential Manager can retrieve and save passwords through the user's selected system provider. Both paths render `AuthenticatedApp` only after Cognito confirms a session.

## Runtime Boundary

`AuthWrapper.jsx` selects the boundary with `isNativePlatform()`. Web behavior remains owned by `withAuthenticator`. Android renders `NativeAuthContainer`, which restores the current user with `getCurrentUser()`, listens to Amplify auth events, and supplies the same `user` and `signOut` props expected by `AuthenticatedApp`.

`SignInForm` requests an available password credential on mount. A provider-selected credential fills the username and password fields. Manual credentials are offered to the provider only after `signIn()` completes and `getCurrentUser()` proves Cognito created a session; invalid passwords and incomplete Cognito next steps are never offered for saving. Provider cancellation or unavailability is non-fatal and leaves manual sign-in available.

## Security Invariants

- Never persist a raw password in WebView or browser storage.
- Delete the historical `saved_email` and `saved_password` keys on every Android auth-boundary mount, including launches where the Cognito session survives an upgrade.
- Let the Android provider own save confirmation and password management.
- On sign-out, clear Cognito and Credential Manager's active provider state without deleting passwords the user chose to save.
- Keep `autocomplete="username"` and `autocomplete="current-password"` on the native fields.
- Never include submitted usernames or passwords in application logs.

## Recovered Implementation History

The previous knowledge log did not record the credential work. Git history supplies the missing chronology:

- Commit `24f3cd4` on 2025-09-11 added a native “Remember me” checkbox that wrote `saved_email` and `saved_password` directly to WebView `localStorage`. It remembered credentials but created the security/compliance problem later flagged in the data-safety map.
- Commits `ef3f2a4` and `b9a2a52` on 2026-08-15 replaced plaintext storage with AndroidX Credential Manager, added safe failure handling, delayed provider saves until after confirmed Cognito authentication, avoided redundant saves for provider-selected passwords, and added focused tests.
- Those reviewed commits remained only on `codex/android-login-credentials`, which forked before the maintained `cap-and` architecture and was never merged. Installing a later `cap-and` build therefore removed both the native provider behavior and the older fallback even though no rollback commit explicitly deleted them.
- The 2026-08-31 port adapted the reviewed behavior to current `cap-and` by creating a native-only auth boundary and retaining Amplify Authenticator unchanged on the website.

## App/Site Association

The Android manifest declares `https://chironote.ai/.well-known/assetlinks.json` for app/site credential association. As verified on 2026-08-31, the endpoint returns the React SPA HTML shell rather than Digital Asset Links JSON. Android can still use its app-scoped credential provider, but verified password sharing with the website remains blocked until the site serves valid JSON with the production signing-certificate fingerprint and `application/json` content type.

## Maintenance Notes

- Keep native provider integration thin: the Capacitor plugin bridges AndroidX results, while Cognito remains responsible for authentication.
- Keep website-only signup, recovery, and terms flows in Amplify Authenticator unless a complete native workflow is explicitly designed.
- Scope native auth CSS beneath `.auth-container`; this stylesheet is bundled with `AuthWrapper` and must not restyle the website or authenticated application.
- Run the focused AuthUI/plugin tests, a production web build, and an Android Gradle build. Installed-device verification is still required for provider UI and saved-credential retrieval.

## Provenance

Synthesized from [`AuthUI README`](../../src/components/AuthUI/README.md), [`AuthWrapper.jsx`](../../src/components/AppShell/AuthWrapper.jsx), [`NativeAuthContainer.jsx`](../../src/components/AuthUI/NativeAuthContainer.jsx), [`SignInForm.jsx`](../../src/components/AuthUI/SignInForm.jsx), [`CredentialManager.js`](../../src/plugins/CredentialManager.js), [`CredentialManagerPlugin.java`](../../android/app/src/main/java/com/chironote/app/CredentialManagerPlugin.java), [`AndroidManifest.xml`](../../android/app/src/main/AndroidManifest.xml), [`DataSafetyDisclosuresMap.md`](../../src/DataSafetyDisclosuresMap.md), the `codex/android-login-credentials`/`cap-and` Git history, and the app-association endpoint checked on 2026-08-31.

