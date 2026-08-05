jest.mock('aws-amplify/auth', () => ({ fetchAuthSession: jest.fn() }));

const { fetchAuthSession } = require('aws-amplify/auth');

describe('customInstructions service', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      REACT_APP_CUSTOM_INSTRUCTIONS_ENABLED: 'true',
      REACT_APP_CUSTOM_INSTRUCTIONS_URL: 'https://example.test/custom'
    };
    fetchAuthSession.mockReset();
    fetchAuthSession.mockResolvedValue({ tokens: { idToken: { toString: () => 'id-token' } } });
    global.fetch = jest.fn();
  });

  afterAll(() => { process.env = originalEnv; });

  test('sends the narrow apply envelope with the Cognito ID token and normalizes the response', async () => {
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({ enabled: true, instructions: 'Use concise phrasing.', ignored: 'server-only' }) });
    const { applyCustomInstructions } = require('./customInstructions');

    await expect(applyCustomInstructions('  Use concise phrasing.  ')).resolves.toEqual({ enabled: true, instructions: 'Use concise phrasing.' });
    expect(global.fetch).toHaveBeenCalledWith('https://example.test/custom', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ Authorization: 'Bearer id-token' }),
      body: JSON.stringify({ action: 'apply', instructions: 'Use concise phrasing.' })
    }));
  });

  test('rejects whitespace, over-limit input, disabled configuration, and invalid response shapes', async () => {
    const service = require('./customInstructions');
    await expect(service.applyCustomInstructions('   ')).rejects.toMatchObject({ code: 'validation' });
    await expect(service.applyCustomInstructions('a'.repeat(service.CUSTOM_INSTRUCTIONS_MAX_LENGTH + 1))).rejects.toMatchObject({ code: 'validation' });

    global.fetch.mockResolvedValue({ ok: true, json: async () => ({ enabled: 'yes', instructions: null }) });
    await expect(service.loadCustomInstructions()).rejects.toMatchObject({ code: 'response' });

    process.env.REACT_APP_CUSTOM_INSTRUCTIONS_ENABLED = 'false';
    await expect(service.loadCustomInstructions()).rejects.toMatchObject({ code: 'configuration' });
  });

  test('maps an aborted hung request to a stable timeout error', async () => {
    jest.useFakeTimers();
    global.fetch.mockImplementation((url, options) => new Promise((resolve, reject) => {
      options.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
    }));
    const service = require('./customInstructions');
    const request = service.loadCustomInstructions();
    for (let index = 0; index < 10 && !global.fetch.mock.calls.length; index += 1) await Promise.resolve();
    expect(global.fetch).toHaveBeenCalledTimes(1);
    jest.runOnlyPendingTimers();
    await expect(request).rejects.toMatchObject({ code: 'timeout' });
    jest.useRealTimers();
  });
});
