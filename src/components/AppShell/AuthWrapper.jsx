import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Authenticator, CheckboxField, withAuthenticator } from '@aws-amplify/ui-react';
import Header from '../AuthUI/SignIn';
import AuthenticatedApp from './AuthenticatedApp';

const components = {
  Header: () => <Header />,
  SignUp: {
    FormFields() {
      return (
        <>
          <Authenticator.SignUp.FormFields />
          <CheckboxField
            name="acknowledgement"
            value="yes"
            label={
              <>
                I agree to the <a href="https://public-docs-and-agreements.s3.us-east-2.amazonaws.com/TermsAndConditions.html" target="_blank" rel="noopener noreferrer">Terms & Privacy Policy</a>
              </>
            }
            required={true}
          />
        </>
      );
    }
  }
};

const services = {
  async validateCustomSignUp(formData) {
    if (!formData.acknowledgement) {
      throw new Error('You must agree to the Terms and Conditions');
    }
  }
};

function AuthWrapper() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialAuthState = searchParams.get('initialState');
  const prefillEmail = searchParams.get('prefillEmail');

  const formFields = prefillEmail ? {
    signUp: {
      email: {
        defaultValue: prefillEmail,
        isReadOnly: false
      }
    },
    signIn: {
      username: {
        defaultValue: prefillEmail,
        isReadOnly: false
      }
    }
  } : undefined;

  const authenticatorProps = {
    components,
    services,
    initialState: initialAuthState === 'signUp' ? 'signUp' : 'signIn',
    ...(formFields && { formFields })
  };

  useEffect(() => {
    if (initialAuthState || prefillEmail) {
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, [initialAuthState, prefillEmail]);

  return withAuthenticator(AuthenticatedApp, authenticatorProps)();
}

export default AuthWrapper;
