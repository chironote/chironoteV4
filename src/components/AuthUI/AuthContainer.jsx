import React, { useState, useEffect } from 'react';
import { getCurrentUser, signOut } from 'aws-amplify/auth';
import SignInForm from './SignInForm';
import { Hub } from 'aws-amplify/utils';

const AuthContainer = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authState, setAuthState] = useState('loading'); // 'loading', 'signedOut', 'signedIn'

  // Check authentication status on mount
  useEffect(() => {
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
      console.log('Current user:', currentUser);
      setUser(currentUser);
      setAuthState('signedIn');
    } catch (error) {
      console.log('No authenticated user:', error);
      setUser(null);
      setAuthState('signedOut');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignInSuccess = (authenticatedUser) => {
    console.log('Sign in successful:', authenticatedUser);
    setUser(authenticatedUser);
    setAuthState('signedIn');
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setUser(null);
      setAuthState('signedOut');
      console.log('Sign out successful');
    } catch (error) {
      console.error('Sign out error:', error);
      // Force sign out even if there's an error
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
