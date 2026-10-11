import React, { useCallback, useState, useEffect, useRef } from 'react';
import { getCurrentUser, signOut } from 'aws-amplify/auth';
import SignInForm from './SignInForm';
import { Hub } from 'aws-amplify/utils';
import { clearLegacyCredentials } from './credentialStorage';

const AuthContainer = ({ children }) => {
  const [user, setUser] = useState(null);
  const [authState, setAuthState] = useState('loading');
  const mounted = useRef(false);
  const revision = useRef(0);
  const signingOut = useRef(false);

  const checkAuthState = useCallback(async () => {
    if (signingOut.current) return;
    const current = ++revision.current;
    try {
      const currentUser = await getCurrentUser();
      if (!mounted.current || current !== revision.current) return;
      setUser(currentUser);
      setAuthState('signedIn');
    } catch {
      if (!mounted.current || current !== revision.current) return;
      setUser(null);
      setAuthState('signedOut');
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    if (signingOut.current) return;
    signingOut.current = true;
    revision.current += 1;
    setUser(null);
    setAuthState('signingOut');
    clearLegacyCredentials();
    try { await signOut(); } catch { /* End the local authenticated view even if remote cleanup fails. */ }
    finally {
      signingOut.current = false;
      if (mounted.current) setAuthState('signedOut');
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    clearLegacyCredentials();
    const stopListening = Hub.listen('auth', ({ payload }) => {
      switch (payload.event) {
        case 'signedIn': checkAuthState(); break;
        case 'signedOut':
          revision.current += 1;
          setUser(null);
          setAuthState(signingOut.current ? 'signingOut' : 'signedOut');
          break;
        case 'tokenRefresh_failure':
          // Same narrow Amplify NetworkError exemption as the Android client.
          if (payload.data?.error?.name !== 'NetworkError') handleSignOut();
          break;
        default: break;
      }
    });
    checkAuthState();
    return () => { mounted.current = false; revision.current += 1; stopListening(); };
  }, [checkAuthState, handleSignOut]);

  const handleSignInSuccess = authenticatedUser => {
    if (!mounted.current || signingOut.current) return;
    revision.current += 1;
    setUser(authenticatedUser);
    setAuthState('signedIn');
  };

  if (authState === 'loading' || authState === 'signingOut') {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #c8e6c9 0%, #a5d6a7 100%)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          color: '#006400',
          fontSize: '18px',
          fontWeight: '500'
        }}>
          <div style={{
            width: '24px',
            height: '24px',
            border: '3px solid #006400',
            borderTop: '3px solid transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          Loading...
        </div>
      </div>
    );
  }

  if (authState === 'signedOut' || !user) {
    return <SignInForm onSignInSuccess={handleSignInSuccess} />;
  }
  return React.cloneElement(children, {
    key: user.userId || user.username,
    user,
    signOut: handleSignOut,
  });
};

export default AuthContainer;
