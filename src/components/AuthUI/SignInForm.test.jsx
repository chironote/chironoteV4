import React from 'react';
import '@testing-library/jest-dom';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { signIn, getCurrentUser } from 'aws-amplify/auth';
import SignInForm from './SignInForm';

jest.mock('aws-amplify/auth', () => ({ signIn: jest.fn(), getCurrentUser: jest.fn() }));
beforeEach(() => { localStorage.clear(); jest.clearAllMocks(); signIn.mockResolvedValue({ isSignedIn: true }); getCurrentUser.mockResolvedValue({ username: 'synthetic-user' }); });
afterEach(() => jest.restoreAllMocks());
const fill = () => {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'synthetic@example.test' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'synthetic-only-secret' } });
};

test('removes obsolete plaintext keys without autofilling and delegates to standard password autocomplete', () => {
  localStorage.setItem('saved_email', 'legacy@example.test'); localStorage.setItem('saved_password', 'legacy-synthetic');
  const get = jest.spyOn(Storage.prototype, 'getItem'); const set = jest.spyOn(Storage.prototype, 'setItem');
  render(<SignInForm onSignInSuccess={jest.fn()} />);
  expect(screen.getByLabelText('Email')).toHaveValue(''); expect(screen.getByLabelText('Password')).toHaveValue('');
  expect(screen.getByLabelText('Email')).toHaveAttribute('autocomplete', 'username');
  expect(screen.getByLabelText('Password')).toHaveAttribute('autocomplete', 'current-password');
  expect(screen.queryByRole('checkbox')).toBeNull(); expect(screen.queryByText(/Remember me/i)).toBeNull();
  expect(get).not.toHaveBeenCalled(); expect(set).not.toHaveBeenCalled();
  expect(localStorage.length).toBe(0);
});

test('successful sign-in passes the session but never stores or logs credentials', async () => {
  const onSuccess = jest.fn(), set = jest.spyOn(Storage.prototype, 'setItem');
  const log = jest.spyOn(console, 'log').mockImplementation(() => {}), error = jest.spyOn(console, 'error').mockImplementation(() => {});
  render(<SignInForm onSignInSuccess={onSuccess} />); fill();
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Sign in' })));
  expect(signIn).toHaveBeenCalledWith({ username: 'synthetic@example.test', password: 'synthetic-only-secret' });
  expect(onSuccess).toHaveBeenCalledWith({ username: 'synthetic-user' });
  expect(screen.getByLabelText('Password')).toHaveValue('');
  expect(set).not.toHaveBeenCalled(); expect(log).not.toHaveBeenCalled(); expect(error).not.toHaveBeenCalled();
});

test('unrecognized errors do not echo provider error objects or messages', async () => {
  signIn.mockRejectedValue({ name: 'Unexpected', message: 'synthetic-only-secret' });
  const error = jest.spyOn(console, 'error').mockImplementation(() => {});
  render(<SignInForm onSignInSuccess={jest.fn()} />); fill();
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Sign in' })));
  expect(screen.getByRole('alert')).toHaveTextContent('Sign in failed. Please try again.');
  expect(screen.getByRole('alert')).not.toHaveTextContent('synthetic-only-secret'); expect(error).not.toHaveBeenCalled();
});

test('an incomplete sign-in does not request or expose an authenticated session', async () => {
  signIn.mockResolvedValue({ isSignedIn: false, nextStep: { signInStep: 'CONFIRM_SIGN_IN_WITH_SMS_CODE' } });
  const onSuccess = jest.fn(); render(<SignInForm onSignInSuccess={onSuccess} />); fill();
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Sign in' })));
  expect(screen.getByRole('alert')).toHaveTextContent('Complete your account verification');
  expect(getCurrentUser).not.toHaveBeenCalled(); expect(onSuccess).not.toHaveBeenCalled();
});

test('duplicate submissions and late unmounted completions cannot reopen a session', async () => {
  let finish; signIn.mockReturnValue(new Promise(resolve => { finish = resolve; }));
  const onSuccess = jest.fn(); const { container, unmount } = render(<SignInForm onSignInSuccess={onSuccess} />); fill();
  fireEvent.submit(container.querySelector('form')); fireEvent.submit(container.querySelector('form'));
  expect(signIn).toHaveBeenCalledTimes(1); unmount();
  await act(async () => finish({ isSignedIn: true })); expect(onSuccess).not.toHaveBeenCalled();
});
