import React from 'react';
import '@testing-library/jest-dom';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { getCurrentUser, signOut } from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';
import AuthContainer from './AuthContainer';

jest.mock('aws-amplify/auth', () => ({ getCurrentUser: jest.fn(), signOut: jest.fn() }));
jest.mock('aws-amplify/utils', () => ({ Hub: { listen: jest.fn() } }));
jest.mock('./SignInForm', () => () => <div>Manual sign-in</div>);
let listener, unsubscribe;
const Content = ({ signOut: leave }) => <button onClick={leave}>Clinical workspace</button>;
const mount = () => render(<AuthContainer><Content /></AuthContainer>);
beforeEach(() => {
  jest.clearAllMocks(); localStorage.clear();
  unsubscribe = jest.fn(); Hub.listen.mockImplementation((_, callback) => { listener = callback; return unsubscribe; });
  getCurrentUser.mockResolvedValue({ username: 'synthetic-user' }); signOut.mockResolvedValue();
});
afterEach(() => jest.restoreAllMocks());

test('startup purges legacy credentials even with a surviving session and keeps unrelated storage', async () => {
  localStorage.setItem('saved_email', 'synthetic@example.test'); localStorage.setItem('saved_password', 'synthetic-only-secret'); localStorage.setItem('noteSettings', '{}');
  const get = jest.spyOn(Storage.prototype, 'getItem'); const log = jest.spyOn(console, 'log').mockImplementation(() => {});
  const { unmount } = mount(); await screen.findByRole('button', { name: 'Clinical workspace' });
  expect(get).not.toHaveBeenCalled(); expect(log).not.toHaveBeenCalled();
  expect(localStorage.getItem('saved_password')).toBeNull(); expect(localStorage.getItem('saved_email')).toBeNull(); expect(localStorage.getItem('noteSettings')).toBe('{}');
  unmount(); expect(unsubscribe).toHaveBeenCalledTimes(1);
});

test('Amplify NetworkError refresh failure preserves the current clinical session', async () => {
  mount(); await screen.findByRole('button', { name: 'Clinical workspace' });
  act(() => listener({ payload: { event: 'tokenRefresh_failure', data: { error: { name: 'NetworkError' } } } }));
  expect(signOut).not.toHaveBeenCalled(); expect(screen.getByRole('button', { name: 'Clinical workspace' })).toBeInTheDocument();
});

test('non-network refresh failure ends the clinical view immediately and waits for sign-out completion', async () => {
  let finish; signOut.mockReturnValue(new Promise(resolve => { finish = resolve; }));
  mount(); await screen.findByRole('button', { name: 'Clinical workspace' });
  act(() => listener({ payload: { event: 'tokenRefresh_failure', data: { error: { name: 'NotAuthorizedException' } } } }));
  expect(screen.queryByRole('button', { name: 'Clinical workspace' })).toBeNull(); expect(screen.queryByText('Manual sign-in')).toBeNull();
  expect(signOut).toHaveBeenCalledTimes(1);
  await act(async () => finish()); expect(screen.getByText('Manual sign-in')).toBeInTheDocument();
});

test('a signed-out event invalidates pending session restoration', async () => {
  let finish; getCurrentUser.mockReturnValue(new Promise(resolve => { finish = resolve; }));
  mount(); act(() => listener({ payload: { event: 'signedOut' } }));
  expect(screen.getByText('Manual sign-in')).toBeInTheDocument();
  await act(async () => finish({ username: 'stale-synthetic-user' }));
  expect(screen.queryByRole('button', { name: 'Clinical workspace' })).toBeNull();
});

test('explicit logout hides the session even when provider cleanup fails, without logging its error', async () => {
  const error = jest.spyOn(console, 'error').mockImplementation(() => {});
  signOut.mockRejectedValue({ message: 'synthetic-sensitive-error' });
  mount(); fireEvent.click(await screen.findByRole('button', { name: 'Clinical workspace' }));
  expect(await screen.findByText('Manual sign-in')).toBeInTheDocument(); expect(error).not.toHaveBeenCalled();
});
