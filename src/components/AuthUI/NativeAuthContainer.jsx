import React, { useCallback, useEffect, useState } from 'react';
import { getCurrentUser, signOut } from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';
import {
  clearCredentialState,
  clearLegacyCredentials,
} from '../../plugins/CredentialManager';
import SignInForm from './SignInForm';
import './AuthUI.css';

function NativeAuthContainer({ children }) {
  const [user, setUser] = useState(null);
  const [authState, setAuthState] = useState('loading');

  const checkAuthState = useCallback(async () => {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      setAuthState('signedIn');
    } catch {
      setUser(null);
      setAuthState('signedOut');
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
    } catch (signOutError) {
      console.error('Sign out failed:', signOutError?.name ?? 'UnknownAuthError');
    } finally {
      try {
        await clearCredentialState();
      } catch {
        // Credential Manager is optional; local sign-out must still complete.
      }

      setUser(null);
      setAuthState('signedOut');
    }
  }, []);

  useEffect(() => {
    // Older Android releases wrote raw credentials to WebView localStorage.
    // Remove both keys even when the Cognito session survives an upgrade.
    clearLegacyCredentials();
    checkAuthState();
  }, [checkAuthState]);

  useEffect(() => {
    const stopListening = Hub.listen('auth', ({ payload }) => {
      switch (payload.event) {
        case 'signedIn':
          checkAuthState();
          break;
        case 'signedOut':
          setUser(null);
          setAuthState('signedOut');
          break;
        case 'tokenRefresh_failure':
          handleSignOut();
          break;
        default:
          break;
      }
    });

    return stopListening;
  }, [checkAuthState, handleSignOut]);

  if (authState === 'loading') {
    return (
      <main className="auth-container" aria-live="polite">
        <div className="auth-loading">
          <span className="auth-loading-spinner" aria-hidden="true" />
          Loading...
        </div>
      </main>
    );
  }

  if (authState === 'signedOut' || !user) {
    return (
      <SignInForm
        onSignInSuccess={(authenticatedUser) => {
          setUser(authenticatedUser);
          setAuthState('signedIn');
        }}
      />
    );
  }

  return React.cloneElement(children, {
    user,
    signOut: handleSignOut,
  });
}

export default NativeAuthContainer;
