import React, { useEffect, useRef, useState } from 'react';
import { getCurrentUser, signIn } from 'aws-amplify/auth';
import textLogo from '../../assets/fulllogo.svg';
import {
  getPasswordCredential,
  savePasswordCredential,
} from '../../plugins/CredentialManager';
import './AuthUI.css';

const SIGN_IN_ERROR_MESSAGES = {
  LimitExceededException: 'Too many sign-in attempts. Please wait and try again.',
  NotAuthorizedException: 'Incorrect email or password.',
  PasswordResetRequiredException: 'A password reset is required. Please reset your password on our website.',
  TooManyRequestsException: 'Too many sign-in attempts. Please wait and try again.',
  UserNotConfirmedException: 'Please check your email and confirm your account.',
  UserNotFoundException: 'No account found with this email address.',
};

const getNextStepMessage = (signInStep) => {
  if (signInStep === 'CONFIRM_SIGN_UP') {
    return 'Please check your email and confirm your account.';
  }

  if (
    signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED'
    || signInStep === 'RESET_PASSWORD'
  ) {
    return 'A password update is required. Please continue on our website.';
  }

  return 'Additional verification is required. Please complete sign-in on our website.';
};

const getSignInErrorMessage = (signInError) => {
  const errorName = signInError?.name;

  if (errorName && SIGN_IN_ERROR_MESSAGES[errorName]) {
    return SIGN_IN_ERROR_MESSAGES[errorName];
  }

  if (
    errorName === 'NetworkError'
    || errorName === 'TimeoutError'
    || (
      typeof signInError?.message === 'string'
      && signInError.message.toLowerCase().includes('network')
    )
  ) {
    return 'Unable to reach ChiroNote. Check your connection and try again.';
  }

  return 'Sign in failed. Please try again.';
};

function SignInForm({ onSignInSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const credentialSourceRef = useRef('untouched');

  useEffect(() => {
    let isMounted = true;

    const loadCredential = async () => {
      try {
        const credential = await getPasswordCredential();

        if (
          isMounted
          && credentialSourceRef.current === 'untouched'
          && credential?.available
          && typeof credential.username === 'string'
          && typeof credential.password === 'string'
        ) {
          credentialSourceRef.current = 'provider';
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
    const passwordCameFromProvider = credentialSourceRef.current === 'provider';

    try {
      const signInResult = await signIn({ username, password });

      if (signInResult?.isSignedIn === false) {
        const signInStep = signInResult.nextStep?.signInStep;
        console.error('Sign-in requires an unsupported next step:', signInStep ?? 'unknown');
        setError(getNextStepMessage(signInStep));
        return;
      }

      const currentUser = await getCurrentUser();

      if (!passwordCameFromProvider) {
        try {
          await savePasswordCredential({ username, password });
        } catch {
          // Dismissing the provider prompt must not undo a valid sign-in.
        }
      }

      onSignInSuccess(currentUser);
    } catch (signInError) {
      // Never log submitted usernames or passwords.
      console.error('Sign-in failed:', signInError?.name ?? 'UnknownAuthError');
      setError(getSignInErrorMessage(signInError));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="auth-container">
      <header className="auth-header">
        <img src={textLogo} alt="ChiroNote" className="auth-logo" />
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
                onChange={(event) => {
                  credentialSourceRef.current = 'edited';
                  setEmail(event.target.value);
                }}
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
                onChange={(event) => {
                  credentialSourceRef.current = 'edited';
                  setPassword(event.target.value);
                }}
                placeholder="Enter your password"
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
}

export default SignInForm;
