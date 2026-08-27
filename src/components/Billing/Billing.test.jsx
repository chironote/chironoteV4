import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import Billing from './Billing';
import { fetchUserAttributes } from 'aws-amplify/auth';
import { getAmplifyClient } from '../../services/amplifyClient';

jest.mock('react-router-dom', () => ({ useNavigate: () => jest.fn() }), { virtual: true });
jest.mock('aws-amplify/auth', () => ({ fetchUserAttributes: jest.fn(), getCurrentUser: jest.fn() }));
jest.mock('../../services/amplifyClient', () => ({ getAmplifyClient: jest.fn() }));
jest.mock('../../services/nativePlatform', () => ({ isNativePlatform: () => true }));
jest.mock('../../utils/analytics', () => ({ trackPageView: jest.fn(), trackAccountPageButtonClick: jest.fn() }));

global.IS_REACT_ACT_ENVIRONMENT = true;

test('keeps Capacitor Billing usage-only and excludes web purchase controls', async () => {
  fetchUserAttributes.mockResolvedValue({ sub: 'synthetic-user' });
  getAmplifyClient.mockReturnValue({
    graphql: jest.fn(() => Promise.resolve({ data: { getUserSubscription: { tier: 'free', hoursleft: 0.5, notesleft: 3 } } }))
  });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => root.render(<Billing />));
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });

  expect(container.textContent).toContain('Usage this month');
  expect(container.textContent).not.toContain('Current plan and available plans');
  expect(container.textContent).not.toContain('Browse available plans');
  act(() => root.unmount());
  container.remove();
});
