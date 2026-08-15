import React, { useEffect, useState } from 'react';
import { getCurrentUser, signIn } from 'aws-amplify/auth';
import textLogo from '../../assets/fulllogo.svg';
import {
  getPasswordCredential,
  savePasswordCredential,
} from '../../plugins/CredentialManager';
import './AuthUI.css';

const SignInForm = ({ onSignInSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadCredential = async () => {
      try {
        const credential = await getPasswordCredential();

        if (
          isMounted
          && credential?.available
          && typeof credential.username === 'string'
          && typeof credential.password === 'string'
        ) {
          setEmail(credential.username);
          setPassword(credential.password);
        }
      } catch {
        // Credential retrieval is optional; manual sign-in remains available.
      }
    };

    loadCredential();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setError('');

    const username = email.trim();

    try {
      await signIn({ username, password });

      // Confirm Cognito established a session before offering the credential
      // to the user's selected Android password provider.
      const currentUser = await getCurrentUser();

      try {
        await savePasswordCredential({ username, password });
      } catch {
        // A dismissed or unavailable save prompt must not undo a valid sign-in.
      }

      onSignInSuccess(currentUser);
    } catch (signInError) {
      let errorMessage = 'Sign in failed. Please try again.';

      if (signInError.name === 'NotAuthorizedException') {
        errorMessage = 'Incorrect email or password.';
      } else if (signInError.name === 'UserNotConfirmedException') {
        errorMessage = 'Please check your email and confirm your account.';
      } else if (signInError.name === 'UserNotFoundException') {
        errorMessage = 'No account found with this email address.';
      }

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="auth-container">
      <header className="auth-header">
        <img
          src={textLogo}
          alt="ChiroNote"
          className="auth-logo"
        />
        <div className="auth-subtitle">HIPAA compliant software</div>
      </header>

      <section className="auth-content" aria-labelledby="sign-in-heading">
        <h1 id="sign-in-heading" className="auth-visually-hidden">Sign in</h1>

        <form
          onSubmit={handleSubmit}
          className="auth-form"
          autoComplete="on"
          aria-busy={isLoading}
        >
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <div className="input-container">
              <input
                id="email"
                name="username"
                type="email"
                inputMode="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Enter your email here"
                required
                disabled={isLoading}
                className="auth-input"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
                aria-invalid={Boolean(error)}
                aria-describedby={error ? 'sign-in-error' : undefined}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="input-container">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter Password Here"
                required
                disabled={isLoading}
                className="auth-input auth-password-input"
                autoComplete="current-password"
                aria-invalid={Boolean(error)}
                aria-describedby={error ? 'sign-in-error' : undefined}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((visible) => !visible)}
                disabled={isLoading}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
              >
                <span className="material-symbols-rounded" aria-hidden="true">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          {error && (
            <div id="sign-in-error" className="error-message" role="alert">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !email.trim() || !password}
            className={`auth-submit-btn${isLoading ? ' loading' : ''}`}
          >
            {isLoading ? 'Signing in...' : 'Sign in'}
          </button>

          <div className="website-info-text">
            Sign-up and password recovery are available on our website.
          </div>
        </form>
      </section>
    </main>
  );
};

export default SignInForm;
