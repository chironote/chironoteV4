import React, { useState, useEffect, useRef } from 'react';
import { signIn, getCurrentUser } from 'aws-amplify/auth';
import { clearLegacyCredentials } from './credentialStorage';
import textLogo from '../../assets/fulllogo.svg';
import './AuthUI.css';

const SignInForm = ({ onSignInSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const mounted = useRef(false);
  const submitting = useRef(false);
  useEffect(() => {
    mounted.current = true;
    clearLegacyCredentials();
    return () => { mounted.current = false; };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setIsLoading(true);
    setError('');

    try {
      const result = await signIn({
        username: email,
        password: password
      });
      
      if (!result.isSignedIn) {
        if (mounted.current) setError('Complete your account verification or password recovery on the ChiroNote website, then try again.');
        return;
      }

      // Get current user details after successful sign in
      const currentUser = await getCurrentUser();
      if (mounted.current) { setPassword(''); onSignInSuccess(currentUser); }
    } catch (error) {
      let errorMessage = 'Sign in failed. Please try again.';
      
      if (error.name === 'NotAuthorizedException') {
        errorMessage = 'Incorrect email or password.';
      } else if (error.name === 'UserNotConfirmedException') {
        errorMessage = 'Please check your email and confirm your account.';
      } else if (error.name === 'UserNotFoundException') {
        errorMessage = 'No account found with this email address.';
      } else if (error.name === 'NetworkError') {
        errorMessage = 'Check your connection and try signing in again.';
      }
      
      if (mounted.current) setError(errorMessage);
    } finally {
      submitting.current = false;
      if (mounted.current) setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      {/* Header with logo - moved outside white container */}
      <div className="auth-header">
        <img 
          src={textLogo} 
          alt="ChiroNote" 
          className="auth-logo"
        />
        <div className="auth-subtitle">
          HIPAA compliant software
        </div>
      </div>
      
      <div className="auth-content">

        {/* Sign In Form */}
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <div className="input-container">
              <input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email here"
                required
                disabled={isLoading}
                className="auth-input"
                autoComplete="username"
              />
              <span className="input-icon error-icon">!</span>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="input-container">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter Password Here"
                required
                disabled={isLoading}
                className="auth-input"
                autoComplete="current-password"
              />
              <span className="input-icon error-icon">!</span>
              <button
                type="button"
                className="password-toggle"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                <span className="material-symbols-rounded">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          {error && (
            <div className="error-message" role="alert">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !email || !password}
            className="auth-submit-btn"
          >
            {isLoading ? 'Signing in...' : 'Sign in'}
          </button>

          <div className="website-info-text">
            Sign-Up and Password recovery available on our website
          </div>
        </form>
      </div>
    </div>
  );
};

export default SignInForm;
