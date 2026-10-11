import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import Navbar from './Navbar';

let mockPathname = '/app/settings';
let mockPatientNotesEnabled = true;

jest.mock('react-router-dom', () => ({
  Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a>,
  useLocation: () => ({ pathname: mockPathname })
}), { virtual: true });

jest.mock('../../services/patientNotes', () => ({
  get patientNotesEnabled() { return mockPatientNotesEnabled; }
}));

global.IS_REACT_ACT_ENVIRONMENT = true;

let container;
let root;

beforeEach(() => {
  mockPathname = '/app/settings';
  mockPatientNotesEnabled = true;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

test.each(['/app', '/app/patients', '/app/patients/example', '/app/billing', '/app/settings'])(
  'keeps route order in desktop and mobile navigation on %s', (pathname) => {
    mockPathname = pathname;
    act(() => root.render(<Navbar onSignOut={() => {}} onFeedback={() => {}} />));
    const menuButton = container.querySelector('.menu-button');
    act(() => menuButton.click());
    expect(menuButton.getAttribute('aria-expanded')).toBe('true');

    for (const selector of ['.desktop-nav', '.mobile-menu']) {
      const nav = container.querySelector(selector);
      const links = Array.from(nav.querySelectorAll('a'));
      expect(links.map((link) => link.getAttribute('href'))).toEqual([
        ...(pathname === '/app' ? [] : ['/app']), '/app/patients', '/app/billing', '/app/settings'
      ]);
      expect(links[0].textContent).toContain(pathname === '/app' ? 'Patients' : 'Home');
      expect(links.filter((link) => link.getAttribute('aria-current') === 'page')
        .map((link) => link.getAttribute('href'))).toEqual(
        links.some((link) => link.getAttribute('href') === pathname) ? [pathname] : []
      );
      expect(Array.from(nav.querySelectorAll('button')).map((button) =>
        button.classList.contains('logout-link') ? 'Logout' : 'Feedback'
      )).toEqual(['Feedback', 'Logout']);
    }
  }
);

test.each(['/app', '/app/settings'])(
  'keeps route order when Patients is disabled on %s', (pathname) => {
    mockPathname = pathname;
    mockPatientNotesEnabled = false;
    act(() => root.render(<Navbar onSignOut={() => {}} onFeedback={() => {}} />));
    act(() => container.querySelector('.menu-button').click());
    for (const selector of ['.desktop-nav', '.mobile-menu']) {
      expect(Array.from(container.querySelectorAll(`${selector} a`))
        .map((link) => link.getAttribute('href'))).toEqual([...(pathname === '/app' ? [] : ['/app']), '/app/billing', '/app/settings']);
    }
  }
);

test('renders Billing and Settings route links and Feedback as a button', () => {
  act(() => root.render(<Navbar onSignOut={() => {}} onFeedback={() => {}} />));
  expect(container.querySelector('a[href="/app/billing"]').textContent).toContain('Billing');
  expect(container.querySelector('a[href="/app/settings"]').textContent).toContain('Settings');
  const feedback = Array.from(container.querySelectorAll('button')).find((button) => button.textContent.includes('Feedback'));
  expect(feedback).toBeTruthy();
  expect(feedback.hasAttribute('aria-current')).toBe(false);
});

test('mobile Home selection closes the menu and Logout calls the shell handler', () => {
  const onSignOut = jest.fn();
  act(() => root.render(<Navbar onSignOut={onSignOut} onFeedback={() => {}} />));
  act(() => container.querySelector('.menu-button').click());
  act(() => container.querySelector('.mobile-menu a[href="/app"]').dispatchEvent(
    new MouseEvent('click', { bubbles: true, cancelable: true })
  ));
  expect(container.querySelector('.mobile-menu')).toBeNull();
  act(() => container.querySelector('.menu-button').click());
  act(() => container.querySelector('.mobile-menu .logout-link').click());
  expect(onSignOut).toHaveBeenCalledTimes(1);
  expect(container.querySelector('.mobile-menu')).toBeNull();
});
