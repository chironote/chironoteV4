import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import Navbar from './Navbar';

jest.mock('react-router-dom', () => ({
  Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a>,
  useLocation: () => ({ pathname: '/app/settings' })
}), { virtual: true });

global.IS_REACT_ACT_ENVIRONMENT = true;

test('renders Billing and Settings route links and Feedback as a button', () => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => root.render(<Navbar onSignOut={() => {}} onFeedback={() => {}} />));
  expect(container.querySelector('a[href="/app/billing"]').textContent).toContain('Billing');
  expect(container.querySelector('a[href="/app/settings"]').textContent).toContain('Settings');
  const feedback = Array.from(container.querySelectorAll('button')).find((button) => button.textContent.includes('Feedback'));
  expect(feedback).toBeTruthy();
  expect(feedback.hasAttribute('aria-current')).toBe(false);
  act(() => root.unmount());
  container.remove();
});
