import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { getCurrentUser, signOut } from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';
import {
  clearCredentialState,
  clearLegacyCredentials,
} from '../../plugins/CredentialManager';
import AuthContainer from './AuthContainer';

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

describe('AuthContainer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Hub.listen.mockReturnValue(jest.fn());
    getCurrentUser.mockResolvedValue({ username: 'user-id' });
    signOut.mockResolvedValue();
    clearCredentialState.mockResolvedValue({ cleared: true });
  });

  it('clears provider session state on sign-out without deleting saved passwords', async () => {
    render(
      <AuthContainer>
        <AuthenticatedContent />
      </AuthContainer>,
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Sign out' }));

    await waitFor(() => {
      expect(signOut).toHaveBeenCalledTimes(1);
      expect(clearCredentialState).toHaveBeenCalledTimes(1);
    });
    expect(await screen.findByText('Manual sign-in')).toBeInTheDocument();
  });

  it('starts legacy credential cleanup even when the user remains signed in', async () => {
    render(
      <AuthContainer>
        <AuthenticatedContent />
      </AuthContainer>,
    );

    await screen.findByRole('button', { name: 'Sign out' });

    expect(clearLegacyCredentials).toHaveBeenCalledTimes(1);
  });
});
