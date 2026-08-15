import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { getCurrentUser, signIn } from 'aws-amplify/auth';
import {
  getPasswordCredential,
  savePasswordCredential,
} from '../../plugins/CredentialManager';
import SignInForm from './SignInForm';

jest.mock('aws-amplify/auth', () => ({
  getCurrentUser: jest.fn(),
  signIn: jest.fn(),
}));

jest.mock('../../plugins/CredentialManager', () => ({
  getPasswordCredential: jest.fn(),
  savePasswordCredential: jest.fn(),
}));

describe('SignInForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
    getPasswordCredential.mockResolvedValue({ available: false });
    savePasswordCredential.mockResolvedValue({ saved: true });
  });

  it('exposes Android autofill hints without a browser-storage checkbox', async () => {
    render(<SignInForm onSignInSuccess={jest.fn()} />);

    await waitFor(() => expect(getPasswordCredential).toHaveBeenCalledTimes(1));

    expect(screen.getByLabelText('Email')).toHaveAttribute('autocomplete', 'username');
    expect(screen.getByLabelText('Password')).toHaveAttribute('autocomplete', 'current-password');
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('fills a password selected from the native credential provider', async () => {
    getPasswordCredential.mockResolvedValue({
      available: true,
      username: 'saved@example.com',
      password: 'provider-password',
    });

    render(<SignInForm onSignInSuccess={jest.fn()} />);

    expect(await screen.findByDisplayValue('saved@example.com')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toHaveValue('provider-password');
  });

  it('offers a password to the native provider only after Cognito confirms sign-in', async () => {
    const currentUser = { username: 'user-id' };
    const onSignInSuccess = jest.fn();
    signIn.mockResolvedValue({ isSignedIn: true });
    getCurrentUser.mockResolvedValue(currentUser);

    render(<SignInForm onSignInSuccess={onSignInSuccess} />);

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: '  person@example.com  ' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'correct-password' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => expect(onSignInSuccess).toHaveBeenCalledWith(currentUser));

    expect(signIn).toHaveBeenCalledWith({
      username: 'person@example.com',
      password: 'correct-password',
    });
    expect(getCurrentUser).toHaveBeenCalledTimes(1);
    expect(savePasswordCredential).toHaveBeenCalledWith({
      username: 'person@example.com',
      password: 'correct-password',
    });
  });

  it('does not offer an invalid password to the credential provider', async () => {
    signIn.mockRejectedValue({ name: 'NotAuthorizedException' });

    render(<SignInForm onSignInSuccess={jest.fn()} />);

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'person@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'wrong-password' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect email or password.');
    expect(getCurrentUser).not.toHaveBeenCalled();
    expect(savePasswordCredential).not.toHaveBeenCalled();
  });
});
