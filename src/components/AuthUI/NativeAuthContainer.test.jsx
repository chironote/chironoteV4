import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { getCurrentUser, signOut } from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';
import {
  clearCredentialState,
  clearLegacyCredentials,
} from '../../plugins/CredentialManager';
import NativeAuthContainer from './NativeAuthContainer';

jest.mock('aws-amplify/auth', () => ({
  getCurrentUser: jest.fn(),
  signOut: jest.fn(),
}));

jest.mock('aws-amplify/utils', () => ({
  Hub: { listen: jest.fn() },
}));

jest.mock('../../plugins/CredentialManager', () => ({
  clearCredentialState: jest.fn(),
  clearLegacyCredentials: jest.fn(),
}));

jest.mock('./SignInForm', () => () => <div>Manual sign-in</div>);

const AuthenticatedContent = ({ signOut: handleSignOut }) => (
  <button type="button" onClick={handleSignOut}>Sign out</button>
);

describe('NativeAuthContainer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    Hub.listen.mockReturnValue(jest.fn());
    getCurrentUser.mockResolvedValue({ username: 'user-id' });
    signOut.mockResolvedValue();
    clearCredentialState.mockResolvedValue({ cleared: true });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('clears legacy plaintext keys even when the user remains signed in', async () => {
    render(
      <NativeAuthContainer>
        <AuthenticatedContent />
      </NativeAuthContainer>,
    );

    await screen.findByRole('button', { name: 'Sign out' });
    expect(clearLegacyCredentials).toHaveBeenCalledTimes(1);
  });

  it('clears provider session state on sign-out without deleting saved passwords', async () => {
    render(
      <NativeAuthContainer>
        <AuthenticatedContent />
      </NativeAuthContainer>,
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Sign out' }));

    await waitFor(() => {
      expect(signOut).toHaveBeenCalledTimes(1);
      expect(clearCredentialState).toHaveBeenCalledTimes(1);
    });
    expect(await screen.findByText('Manual sign-in')).toBeInTheDocument();
  });

  it('keeps the sign-in form hidden until provider state cleanup completes', async () => {
    let finishCleanup;
    clearCredentialState.mockImplementation(
      () => new Promise((resolve) => { finishCleanup = resolve; }),
    );

    render(
      <NativeAuthContainer>
        <AuthenticatedContent />
      </NativeAuthContainer>,
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Sign out' }));
    await waitFor(() => expect(clearCredentialState).toHaveBeenCalledTimes(1));
    expect(screen.queryByText('Manual sign-in')).not.toBeInTheDocument();

    finishCleanup({ cleared: true });
    expect(await screen.findByText('Manual sign-in')).toBeInTheDocument();
  });

  it('does not sign out when Amplify reports a temporary refresh network error', async () => {
    let authListener;
    Hub.listen.mockImplementation((channel, listener) => {
      authListener = listener;
      return jest.fn();
    });

    render(
      <NativeAuthContainer>
        <AuthenticatedContent />
      </NativeAuthContainer>,
    );

    await screen.findByRole('button', { name: 'Sign out' });
    authListener({ payload: { event: 'tokenRefresh_failure', data: { error: { name: 'NetworkError' } } } });

    expect(signOut).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
  });

  it('falls back to manual sign-in when no Cognito session exists', async () => {
    getCurrentUser.mockRejectedValue({ name: 'UserUnAuthenticatedException' });

    render(
      <NativeAuthContainer>
        <AuthenticatedContent />
      </NativeAuthContainer>,
    );

    expect(await screen.findByText('Manual sign-in')).toBeInTheDocument();
  });
});
