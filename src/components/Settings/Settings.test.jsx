import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import Settings from './Settings';
import {
  applyCustomInstructions,
  isCustomInstructionsAvailable,
  loadCustomInstructions,
  resetCustomInstructions
} from '../../services/customInstructions';
import { getAmplifyClient } from '../../services/amplifyClient';
import { fetchUserAttributes } from 'aws-amplify/auth';

jest.mock('aws-amplify/auth', () => ({ fetchUserAttributes: jest.fn() }));
jest.mock('../../services/amplifyClient', () => ({ getAmplifyClient: jest.fn() }));
jest.mock('../../services/customInstructions', () => ({
  CUSTOM_INSTRUCTIONS_MAX_LENGTH: 4000,
  applyCustomInstructions: jest.fn(),
  isCustomInstructionsAvailable: jest.fn(),
  loadCustomInstructions: jest.fn(),
  resetCustomInstructions: jest.fn()
}));

global.IS_REACT_ACT_ENVIRONMENT = true;
const flush = () => act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); });

describe('Settings', () => {
  let container;
  let root;

  beforeEach(() => {
    container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
    getAmplifyClient.mockReturnValue({ graphql: jest.fn(() => Promise.resolve({ data: { getUserSubscription: { hoursSavedLifetime: 12.34 } } })) });
    fetchUserAttributes.mockResolvedValue({ sub: 'synthetic-user' });
    isCustomInstructionsAvailable.mockReturnValue(true);
    loadCustomInstructions.mockResolvedValue({ enabled: false, instructions: null });
    resetCustomInstructions.mockResolvedValue({ enabled: false, instructions: null });
    window.confirm = jest.fn(() => true);
  });

  afterEach(() => { act(() => root.unmount()); document.body.innerHTML = ''; jest.clearAllMocks(); });

  test('formats lifetime hours and renders disabled Create state', async () => {
    act(() => root.render(<Settings />));
    expect(document.body.textContent).toContain('Loading existing settings…');
    await flush();
    expect(document.body.textContent).toContain('12.3 hours');
    expect(document.body.textContent).toContain('Disabled');
    const create = Array.from(document.querySelectorAll('button')).find((button) => button.textContent === 'Create');
    act(() => create.click());
    expect(document.querySelector('[role="dialog"]').textContent).toContain('Create custom instructions');
    expect(document.querySelector('textarea').value).toBe('');
  });

  test('renders server-enabled Update state, prefills original instructions, and resets only after confirmation', async () => {
    loadCustomInstructions.mockResolvedValue({ enabled: true, instructions: 'Use short paragraphs.' });
    act(() => root.render(<Settings />));
    await flush();
    expect(document.body.textContent).toContain('Enabled');
    const update = Array.from(document.querySelectorAll('button')).find((button) => button.textContent === 'Update');
    act(() => update.click());
    expect(document.querySelector('textarea').value).toBe('Use short paragraphs.');
    act(() => document.querySelector('[aria-label="Close dialog"]').click());
    const defaults = Array.from(document.querySelectorAll('button')).find((button) => button.textContent === 'Use defaults');
    await act(async () => { defaults.click(); await Promise.resolve(); });
    expect(resetCustomInstructions).toHaveBeenCalledTimes(1);
    expect(document.body.textContent).toContain('Disabled');
  });

  test('distinguishes unavailable configuration from Disabled', async () => {
    isCustomInstructionsAvailable.mockReturnValue(false);
    act(() => root.render(<Settings />));
    await flush();
    expect(document.body.textContent).toContain('Unavailable');
    expect(loadCustomInstructions).not.toHaveBeenCalled();
    expect(Array.from(document.querySelectorAll('button')).some((button) => ['Create', 'Update'].includes(button.textContent))).toBe(false);
  });

  test('validates input, prevents duplicate apply, and preserves text after request failure', async () => {
    act(() => root.render(<Settings />));
    await flush();
    act(() => Array.from(document.querySelectorAll('button')).find((button) => button.textContent === 'Create').click());
    const textarea = document.querySelector('textarea');
    const form = document.querySelector('form');

    act(() => {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(textarea, '   ');
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    expect(document.body.textContent).toContain('Enter your note-style preferences');
    expect(applyCustomInstructions).not.toHaveBeenCalled();

    applyCustomInstructions.mockRejectedValue(new Error('The request failed safely.'));
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(textarea, 'Use concise synthetic examples.');
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await flush();
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await Promise.resolve();
    });
    expect(applyCustomInstructions).toHaveBeenCalledTimes(1);
    expect(document.querySelector('textarea').value).toBe('Use concise synthetic examples.');
    expect(document.body.textContent).toContain('The request failed safely.');
  });

  test('moves from approximate progress to server-confirmed success', async () => {
    jest.useFakeTimers();
    let resolveApply;
    applyCustomInstructions.mockReturnValue(new Promise((resolve) => { resolveApply = resolve; }));
    act(() => root.render(<Settings />));
    await flush();
    act(() => Array.from(document.querySelectorAll('button')).find((button) => button.textContent === 'Create').click());
    const textarea = document.querySelector('textarea');
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(textarea, 'Prefer concise section summaries.');
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await flush();
    act(() => document.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    expect(document.body.textContent).toContain('Reviewing your preferences…');
    await act(async () => {
      resolveApply({ enabled: true, instructions: 'Prefer concise section summaries.' });
      await Promise.resolve();
    });
    expect(document.body.textContent).toContain('Custom instructions enabled');
    act(() => jest.runOnlyPendingTimers());
    jest.useRealTimers();
  });
});
