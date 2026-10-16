import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import Settings from './Settings';
import {
  createCustomInstructionsRequestId,
  disableCustomInstructions,
  isCustomInstructionsAvailable,
  loadCustomInstructions,
  startCustomInstructionsCompilation
} from '../../services/customInstructions';
import { getAmplifyClient } from '../../services/amplifyClient';
import { fetchUserAttributes } from 'aws-amplify/auth';
import { addNativeAppStateListener } from '../../services/nativePlatform';

jest.mock('aws-amplify/auth', () => ({ fetchUserAttributes: jest.fn() }));
jest.mock('../../services/nativePlatform', () => ({ addNativeAppStateListener: jest.fn() }));
jest.mock('../../services/amplifyClient', () => ({ getAmplifyClient: jest.fn() }));
jest.mock('../../services/customInstructions', () => ({
  CUSTOM_INSTRUCTIONS_MAX_LENGTH: 4000,
  CUSTOM_INSTRUCTIONS_FAST_POLL_INTERVAL_MS: 3000,
  CUSTOM_INSTRUCTIONS_SLOW_POLL_INTERVAL_MS: 9000,
  CUSTOM_INSTRUCTIONS_FAST_POLL_WINDOW_MS: 30000,
  CUSTOM_INSTRUCTIONS_POLL_CEILING_MS: 300000,
  createCustomInstructionsRequestId: jest.fn(),
  disableCustomInstructions: jest.fn(),
  isCustomInstructionsAvailable: jest.fn(),
  loadCustomInstructions: jest.fn(),
  startCustomInstructionsCompilation: jest.fn()
}));

global.IS_REACT_ACT_ENVIRONMENT = true;

const customView = (overrides = {}) => ({
  enableCustomInstructions: false,
  effectiveMode: 'DEFAULT',
  compileStatus: 'NEVER',
  instructions: null,
  compileJobId: null,
  hasSavedInstructions: false,
  updatedAt: null,
  activeCompiledAt: null,
  lastErrorCode: null,
  ...overrides
});

const flush = () => act(async () => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
});

const advance = (milliseconds) => act(async () => {
  jest.advanceTimersByTime(milliseconds);
  await Promise.resolve();
  await Promise.resolve();
});

const button = (label) => Array.from(document.querySelectorAll('button')).find((item) => item.textContent === label);

const capture = (name) => {
  const output = process.env.CHIRONOTE_VISUAL_OUTPUT_DIR;
  if (!output) return;
  const fs = require('fs');
  const path = require('path');
  fs.mkdirSync(output, { recursive: true });
  const styles = ['index.css', 'App.css', 'components/Settings/Settings.css', 'components/Dialog/ProductDialog.css'];
  fs.writeFileSync(path.join(output, `${name}.html`), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Synthetic Settings preview</title><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded">${styles.map(file => `<link rel="stylesheet" href="../android/src/${file}">`).join('')}</head><body>${document.body.innerHTML}</body></html>`);
};

const changeTextarea = (value) => {
  const textarea = document.querySelector('textarea');
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(textarea, value);
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  });
  return textarea;
};

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

describe('Settings', () => {
  let container;
  let root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    addNativeAppStateListener.mockResolvedValue(null);
    getAmplifyClient.mockReturnValue({ graphql: jest.fn(() => Promise.resolve({ data: { getUserSubscription: { hoursSavedLifetime: 12.34 } } })) });
    fetchUserAttributes.mockResolvedValue({ sub: 'synthetic-user' });
    isCustomInstructionsAvailable.mockReturnValue(true);
    createCustomInstructionsRequestId.mockReturnValue('request-1');
    loadCustomInstructions.mockResolvedValue(customView());
    disableCustomInstructions.mockResolvedValue(customView());
    startCustomInstructionsCompilation.mockResolvedValue({
      accepted: true,
      jobId: 'job-1',
      compileStatus: 'COMPILING',
      effectiveMode: 'DEFAULT'
    });
    window.confirm = jest.fn(() => true);
    window.matchMedia = jest.fn(() => ({ matches: false }));
  });

  afterEach(() => {
    if (root) act(() => root.unmount());
    document.body.innerHTML = '';
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  test('formats lifetime hours and renders the never-configured Create state', async () => {
    act(() => root.render(<Settings />));
    expect(document.body.textContent).toContain('Loading existing settings…');
    await flush();
    expect(document.body.textContent).toContain('12.3 hours');
    expect(document.body.textContent).toContain('Not set up');

    act(() => button('Create').click());
    expect(document.querySelector('[role="dialog"]').textContent).toContain('Create custom instructions');
    capture('android-custom-editor');
    expect(document.querySelector('textarea').value).toBe('');
  });

  test('uses only the global feature flag for a distinct unavailable state', async () => {
    isCustomInstructionsAvailable.mockReturnValue(false);
    act(() => root.render(<Settings />));
    await flush();
    expect(document.body.textContent).toContain('Unavailable');
    expect(loadCustomInstructions).not.toHaveBeenCalled();
    expect(button('Create')).toBeUndefined();
  });

  test.each([
    [
      customView({
        enableCustomInstructions: true,
        effectiveMode: 'CUSTOM',
        compileStatus: 'COMPILING',
        instructions: 'Keep the active version while updating.',
        compileJobId: 'job-update',
        hasSavedInstructions: true,
        activeCompiledAt: '2026-08-16T12:00:00Z'
      }),
      'Updating',
      'Your previous custom instructions remain active'
    ],
    [
      customView({
        enableCustomInstructions: true,
        effectiveMode: 'CUSTOM',
        compileStatus: 'FAILED',
        instructions: 'Keep the failed update for retry.',
        compileJobId: 'job-failed-update',
        hasSavedInstructions: true,
        activeCompiledAt: '2026-08-16T12:00:00Z',
        lastErrorCode: 'PROVIDER_TIMEOUT'
      }),
      'Update needs attention',
      'Your previous custom instructions are still active'
    ],
    [
      customView({
        enableCustomInstructions: true,
        compileStatus: 'FAILED',
        instructions: 'Keep the failed first attempt for retry.',
        compileJobId: 'job-failed-first',
        hasSavedInstructions: true,
        lastErrorCode: 'INVALID_OUTPUT'
      }),
      'Needs attention',
      'ChiroNote defaults remain active'
    ]
  ])('renders the persisted update/failure matrix without losing the effective mode', async (serverView, badge, copy) => {
    loadCustomInstructions.mockResolvedValue(serverView);
    act(() => root.render(<Settings />));
    await flush();
    expect(document.body.textContent).toContain(badge);
    expect(document.body.textContent).toContain(copy);
  });

  test('preserves saved source when disabled and after choosing defaults', async () => {
    loadCustomInstructions.mockResolvedValue(customView({
      enableCustomInstructions: true,
      effectiveMode: 'CUSTOM',
      compileStatus: 'READY',
      instructions: 'Use short paragraphs.',
      compileJobId: 'job-ready',
      hasSavedInstructions: true,
      activeCompiledAt: '2026-08-16T12:00:00Z'
    }));
    disableCustomInstructions.mockResolvedValue(customView({
      compileStatus: 'READY',
      instructions: 'Use short paragraphs.',
      compileJobId: 'job-ready',
      hasSavedInstructions: true,
      activeCompiledAt: '2026-08-16T12:00:00Z'
    }));

    act(() => root.render(<Settings />));
    await flush();
    expect(document.body.textContent).toContain('Enabled');
    act(() => button('Update').click());
    expect(document.querySelector('textarea').value).toBe('Use short paragraphs.');
    act(() => document.querySelector('[aria-label="Close dialog"]').click());

    await act(async () => {
      button('Use defaults').click();
      await Promise.resolve();
    });
    expect(disableCustomInstructions).toHaveBeenCalledTimes(1);
    expect(document.body.textContent).toContain('Using defaults');
    act(() => button('Edit and enable').click());
    expect(document.querySelector('textarea').value).toBe('Use short paragraphs.');
  });

  test('validates source, blocks duplicate submission, and preserves text after start failure', async () => {
    act(() => root.render(<Settings />));
    await flush();
    act(() => button('Create').click());

    changeTextarea('   ');
    act(() => document.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    expect(document.body.textContent).toContain('Enter your note-style preferences');
    expect(startCustomInstructionsCompilation).not.toHaveBeenCalled();
    expect(document.querySelector('textarea').getAttribute('aria-invalid')).toBe('true');

    startCustomInstructionsCompilation.mockRejectedValueOnce(new Error('The request failed safely.'));
    changeTextarea('Use concise synthetic examples.');
    await act(async () => {
      const form = document.querySelector('form');
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await Promise.resolve();
    });
    expect(startCustomInstructionsCompilation).toHaveBeenCalledTimes(1);
    expect(startCustomInstructionsCompilation).toHaveBeenLastCalledWith('Use concise synthetic examples.', 'request-1');
    expect(document.querySelector('textarea').value).toBe('Use concise synthetic examples.');
    expect(document.querySelector('textarea').getAttribute('aria-invalid')).toBe('false');
    expect(document.body.textContent).toContain('The request failed safely.');

    await act(async () => {
      document.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await Promise.resolve();
    });
    expect(startCustomInstructionsCompilation).toHaveBeenCalledTimes(2);
    expect(startCustomInstructionsCompilation).toHaveBeenLastCalledWith('Use concise synthetic examples.', 'request-1');
    expect(createCustomInstructionsRequestId).toHaveBeenCalledTimes(1);
  });

  test('never reports timer-based success and shows completion only after server-confirmed READY', async () => {
    jest.useFakeTimers();
    const compiling = customView({
      enableCustomInstructions: true,
      compileStatus: 'COMPILING',
      instructions: 'Prefer concise section summaries.',
      compileJobId: 'job-1',
      hasSavedInstructions: true
    });
    loadCustomInstructions.mockResolvedValueOnce(customView()).mockResolvedValue(compiling);

    act(() => root.render(<Settings />));
    await flush();
    act(() => button('Create').click());
    changeTextarea('Prefer concise section summaries.');
    act(() => document.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    await flush();
    expect(document.body.textContent).toContain('Reading how you prefer to document…');

    await advance(30000);
    expect(document.body.textContent).not.toContain('Custom instructions enabled');
    expect(document.body.textContent).toContain('Close and continue later');

    loadCustomInstructions.mockResolvedValue(customView({
      enableCustomInstructions: true,
      effectiveMode: 'CUSTOM',
      compileStatus: 'READY',
      instructions: 'Prefer concise section summaries.',
      compileJobId: 'job-1',
      hasSavedInstructions: true,
      activeCompiledAt: '2026-08-16T12:00:00Z'
    }));
    await act(async () => {
      window.dispatchEvent(new Event('focus'));
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(document.body.textContent).toContain('Custom instructions enabled');
    capture('android-custom-ready');
    expect(document.body.textContent).toContain('Server-confirmed');
    await advance(850);
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    act(() => button('Close').click());
    await advance(0);
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(button('Update'));
  });

  test('preserves the draft when a secure request identifier cannot be created', async () => {
    createCustomInstructionsRequestId.mockImplementation(() => { throw new Error('Unavailable'); });
    act(() => root.render(<Settings />));
    await flush();
    act(() => button('Create').click());
    changeTextarea('Keep the assessment concise.');
    act(() => document.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    expect(document.querySelector('textarea').value).toBe('Keep the assessment concise.');
    expect(document.querySelector('[role="alert"]').textContent).toContain('A secure request could not be created');
    expect(startCustomInstructionsCompilation).not.toHaveBeenCalled();
  });

  test('reconciles an uncertain start failure when AppSync already persisted the job', async () => {
    const compiling = customView({
      enableCustomInstructions: true,
      compileStatus: 'COMPILING',
      instructions: 'Use concise reassessments.',
      compileJobId: 'job-uncertain',
      hasSavedInstructions: true
    });
    loadCustomInstructions
      .mockResolvedValueOnce(customView())
      .mockResolvedValueOnce(compiling);
    startCustomInstructionsCompilation.mockRejectedValueOnce(new Error('The response was interrupted.'));

    act(() => root.render(<Settings />));
    await flush();
    act(() => button('Create').click());
    changeTextarea('Use concise reassessments.');
    await act(async () => {
      document.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(loadCustomInstructions).toHaveBeenCalledTimes(2);
    expect(document.body.textContent).toContain('Compiling your instructions');
    expect(document.body.textContent).toContain('Close and continue later');
    expect(document.body.textContent).not.toContain('The response was interrupted.');
  });

  test('refreshes saved instructions on native foreground and removes its listener on unmount', async () => {
    const remove = jest.fn();
    addNativeAppStateListener.mockResolvedValue({ remove });
    act(() => root.render(<Settings />));
    await flush();
    const listener = addNativeAppStateListener.mock.calls[0][0];
    const initialLoads = loadCustomInstructions.mock.calls.length;
    act(() => listener({ isActive: false }));
    expect(loadCustomInstructions).toHaveBeenCalledTimes(initialLoads);

    loadCustomInstructions.mockResolvedValue(customView({
      enableCustomInstructions: true,
      effectiveMode: 'CUSTOM',
      compileStatus: 'READY',
      hasSavedInstructions: true,
      instructions: 'Saved from website Settings.'
    }));
    act(() => listener({ isActive: true }));
    await flush();
    expect(button('Update')).toBeTruthy();
    expect(loadCustomInstructions).toHaveBeenCalledTimes(initialLoads + 1);

    act(() => root.unmount());
    root = null;
    expect(remove).toHaveBeenCalledTimes(1);
    act(() => listener({ isActive: true }));
    expect(loadCustomInstructions).toHaveBeenCalledTimes(initialLoads + 1);
  });

  test('removes a native listener whose registration finishes after Settings unmounts', async () => {
    const registration = deferred();
    const remove = jest.fn();
    addNativeAppStateListener.mockReturnValue(registration.promise);
    act(() => root.render(<Settings />));
    await flush();
    act(() => root.unmount());
    root = null;
    registration.resolve({ remove });
    await flush();
    expect(remove).toHaveBeenCalledTimes(1);
  });

  test('keeps the newer server result when overlapping reloads resolve out of order', async () => {
    act(() => root.render(<Settings />));
    await flush();
    const older = deferred();
    const newer = deferred();
    loadCustomInstructions
      .mockImplementationOnce(() => older.promise)
      .mockImplementationOnce(() => newer.promise);

    act(() => {
      window.dispatchEvent(new Event('focus'));
      window.dispatchEvent(new Event('focus'));
    });
    newer.resolve(customView({
      enableCustomInstructions: true,
      effectiveMode: 'CUSTOM',
      compileStatus: 'READY',
      instructions: 'Newer instructions.',
      compileJobId: 'job-new',
      hasSavedInstructions: true,
      activeCompiledAt: '2026-08-16T12:00:00Z'
    }));
    await flush();
    older.resolve(customView());
    await flush();

    expect(document.body.textContent).toContain('Enabled');
    expect(button('Update')).toBeTruthy();
  });

  test('stops polling on unmount and resumes persisted compilation on reopen', async () => {
    jest.useFakeTimers();
    const compiling = customView({
      enableCustomInstructions: true,
      compileStatus: 'COMPILING',
      instructions: 'Keep findings concise.',
      compileJobId: 'job-persisted',
      hasSavedInstructions: true
    });
    loadCustomInstructions.mockResolvedValue(compiling);
    act(() => root.render(<Settings />));
    await flush();
    expect(document.body.textContent).toContain('Compiling');
    expect(loadCustomInstructions).toHaveBeenCalledTimes(1);

    act(() => root.unmount());
    root = null;
    await advance(6000);
    expect(loadCustomInstructions).toHaveBeenCalledTimes(1);

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    loadCustomInstructions
      .mockResolvedValueOnce(compiling)
      .mockResolvedValueOnce(customView({
        enableCustomInstructions: true,
        effectiveMode: 'CUSTOM',
        compileStatus: 'READY',
        instructions: 'Keep findings concise.',
        compileJobId: 'job-persisted',
        hasSavedInstructions: true,
        activeCompiledAt: '2026-08-16T12:00:00Z'
      }));
    act(() => root.render(<Settings />));
    await flush();
    await advance(3000);
    expect(document.body.textContent).toContain('Enabled');
  });

  test('shows honest timeout guidance and reloads real status on focus', async () => {
    jest.useFakeTimers();
    const compiling = customView({
      enableCustomInstructions: true,
      compileStatus: 'COMPILING',
      instructions: 'Use direct language.',
      compileJobId: 'job-slow',
      hasSavedInstructions: true
    });
    loadCustomInstructions.mockResolvedValue(compiling);
    act(() => root.render(<Settings />));
    await flush();
    await advance(300001);
    expect(document.body.textContent).toContain('Still working. You can return later');
    expect(document.body.textContent).toContain('Compiling');

    loadCustomInstructions.mockResolvedValue(customView({
      enableCustomInstructions: true,
      effectiveMode: 'CUSTOM',
      compileStatus: 'READY',
      instructions: 'Use direct language.',
      compileJobId: 'job-slow',
      hasSavedInstructions: true,
      activeCompiledAt: '2026-08-16T12:00:00Z'
    }));
    await act(async () => {
      window.dispatchEvent(new Event('focus'));
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(document.body.textContent).toContain('Enabled');
    expect(document.body.textContent).not.toContain('Still working. You can return later');
  });

  test('Use defaults during compilation prevents the UI from implying late re-enable', async () => {
    const compiling = customView({
      enableCustomInstructions: true,
      compileStatus: 'COMPILING',
      instructions: 'Prefer brief plans.',
      compileJobId: 'job-disable-race',
      hasSavedInstructions: true
    });
    loadCustomInstructions.mockResolvedValue(compiling);
    disableCustomInstructions.mockResolvedValue(customView({
      compileStatus: 'COMPILING',
      instructions: 'Prefer brief plans.',
      compileJobId: 'job-disable-race',
      hasSavedInstructions: true
    }));
    act(() => root.render(<Settings />));
    await flush();
    expect(document.body.textContent).toContain('ChiroNote defaults remain active');

    await act(async () => {
      button('Use defaults').click();
      await Promise.resolve();
    });
    expect(disableCustomInstructions).toHaveBeenCalledTimes(1);
    expect(document.body.textContent).toContain('it will not re-enable your saved instructions');
    expect(button('Use defaults')).toBeUndefined();
  });
});
