import React, { act, createRef } from 'react';
import { createRoot } from 'react-dom/client';
import Feedback from './Feedback';
import { fetchUserAttributes } from 'aws-amplify/auth';

jest.mock('aws-amplify/auth', () => ({ fetchUserAttributes: jest.fn() }));
global.IS_REACT_ACT_ENVIRONMENT = true;

const flush = () => act(async () => { await Promise.resolve(); await Promise.resolve(); });

describe('Feedback modal', () => {
  let container;
  let root;
  beforeEach(() => {
    container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
    global.fetch = jest.fn(() => Promise.resolve({ ok: true }));
    fetchUserAttributes.mockResolvedValue({ email: 'synthetic@example.test' });
  });
  afterEach(() => { act(() => root.unmount()); document.body.innerHTML = ''; });

  test('has no subject UI and always submits the literal Feedback subject', async () => {
    const onClose = jest.fn();
    const returnFocusRef = createRef();
    act(() => root.render(<Feedback isOpen onClose={onClose} returnFocusRef={returnFocusRef} />));
    await flush();
    expect(document.querySelector('select')).toBeNull();
    const textarea = document.querySelector('textarea');
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(textarea, 'Helpful synthetic feedback.');
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await flush();
    const form = document.querySelector('form');
    await act(async () => { form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await Promise.resolve(); });
    expect(JSON.parse(global.fetch.mock.calls[0][1].body)).toEqual({
      content: 'Helpful synthetic feedback.',
      subject: 'Feedback',
      userEmail: 'synthetic@example.test'
    });
    expect(document.body.textContent).toContain('Thank you for your feedback.');
  });
});
