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
