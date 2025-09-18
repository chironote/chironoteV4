import React, { useState, useEffect } from 'react';
import { signIn, getCurrentUser } from 'aws-amplify/auth';
import { Capacitor } from '@capacitor/core';
import textLogo from '../../assets/fulllogo.svg';
import './AuthUI.css';

const SignInForm = ({ onSignInSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Load saved credentials on component mount
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      loadSavedCredentials();
    }
  }, []);

  const loadSavedCredentials = () => {
    try {
      const savedEmail = localStorage.getItem('saved_email');
      const savedPassword = localStorage.getItem('saved_password');
      
      if (savedEmail) {
        setEmail(savedEmail);
        setRememberMe(true);
      }
      if (savedPassword) {
        setPassword(savedPassword);
      }
    } catch (error) {
      console.log('No saved credentials found:', error);
    }
  };

  const saveCredentials = () => {
    if (Capacitor.isNativePlatform() && rememberMe) {
      try {
        localStorage.setItem('saved_email', email);
        localStorage.setItem('saved_password', password);
      } catch (error) {
        console.log('Failed to save credentials:', error);
      }
    }
  };

  const clearCredentials = () => {
    if (Capacitor.isNativePlatform()) {
      try {
        localStorage.removeItem('saved_email');
        localStorage.removeItem('saved_password');
      } catch (error) {
        console.log('Failed to clear credentials:', error);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const user = await signIn({
        username: email,
        password: password
      });
      
      // Save credentials if remember me is checked
      if (rememberMe) {
        saveCredentials();
      } else {
        clearCredentials();
      }
      
      // Get current user details after successful sign in
      const currentUser = await getCurrentUser();
      onSignInSuccess(currentUser);
    } catch (error) {
      console.error('Sign in error:', error);
      let errorMessage = 'Sign in failed. Please try again.';
      
      if (error.name === 'NotAuthorizedException') {
        errorMessage = 'Incorrect email or password.';
      } else if (error.name === 'UserNotConfirmedException') {
        errorMessage = 'Please check your email and confirm your account.';
      } else if (error.name === 'UserNotFoundException') {
        errorMessage = 'No account found with this email address.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
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
                autoComplete="email"
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
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                <span className="material-symbols-rounded">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="remember-me-container">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={isLoading}
                className="remember-me-checkbox"
              />
              <span className="remember-me-text">Remember me on this device</span>
            </label>
          </div>

          {error && (
            <div className="error-message">
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
