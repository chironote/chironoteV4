import React, { useState, useEffect } from 'react';
import { getCurrentUser, signOut } from 'aws-amplify/auth';
import SignInForm from './SignInForm';
import { Hub } from 'aws-amplify/utils';
import {
  clearCredentialState,
  clearLegacyCredentials,
} from '../../plugins/CredentialManager';

const AuthContainer = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authState, setAuthState] = useState('loading'); // 'loading', 'signedOut', 'signedIn'

  // Check authentication status on mount
  useEffect(() => {
    // Older Android releases persisted raw credentials in WebView localStorage.
    // Clear both keys on every launch, including when a Cognito session survives
    // the upgrade and the sign-in form is never rendered.
    clearLegacyCredentials();
    checkAuthState();
  }, []);

  // Listen to auth events
  useEffect(() => {
    const hubListener = Hub.listen('auth', (data) => {
      const { event } = data.payload;
      console.log('Auth event:', event);
      
      switch (event) {
        case 'signedIn':
          checkAuthState();
          break;
        case 'signedOut':
          setUser(null);
          setAuthState('signedOut');
          break;
        case 'tokenRefresh':
          // Token refresh is handled automatically
          break;
        case 'tokenRefresh_failure':
          console.error('Token refresh failed');
          handleSignOut();
          break;
        default:
          break;
      }
    });

    return () => {
      hubListener();
    };
  }, []);

  const checkAuthState = async () => {
    try {
      setIsLoading(true);
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      setAuthState('signedIn');
    } catch {
      setUser(null);
      setAuthState('signedOut');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignInSuccess = (authenticatedUser) => {
    setUser(authenticatedUser);
    setAuthState('signedIn');
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      try {
        // This clears the provider's active-session state without deleting
        // any password the user chose to save with their password manager.
        await clearCredentialState();
      } catch {
        // Credential Manager is optional; sign-out must always complete locally.
      }

      setUser(null);
      setAuthState('signedOut');
    }
  };

  // Show loading spinner while checking auth state
  if (authState === 'loading' || isLoading) {
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

  // Show sign in form if not authenticated
  if (authState === 'signedOut' || !user) {
    return <SignInForm onSignInSuccess={handleSignInSuccess} />;
  }

  // Show authenticated app
  return React.cloneElement(children, { 
    user: user, 
    signOut: handleSignOut 
  });
};

export default AuthContainer;
