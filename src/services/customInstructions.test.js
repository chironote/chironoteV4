jest.mock('./amplifyClient', () => ({ getAmplifyClient: jest.fn() }));

const { getAmplifyClient } = require('./amplifyClient');
const { getMyCustomInstructions } = require('../graphql/queries');
const {
  disableMyCustomInstructions,
  startMyCustomInstructionsCompilation
} = require('../graphql/mutations');

const view = (overrides = {}) => ({
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

describe('customInstructions service', () => {
  const originalEnv = process.env;
  let graphql;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      REACT_APP_CUSTOM_INSTRUCTIONS_ENABLED: 'true'
    };
    graphql = jest.fn();
    getAmplifyClient.mockReturnValue({ graphql });
  });

  afterEach(() => jest.clearAllMocks());
  afterAll(() => { process.env = originalEnv; });

  test('uses the authenticated AppSync query and normalizes only the safe public projection', async () => {
    graphql.mockResolvedValue({
      data: {
        getMyCustomInstructions: view({
          instructions: 'Use concise phrasing.',
          hasSavedInstructions: true,
          ignoredCompiledPrompt: 'server-only'
        })
      }
    });
    const { loadCustomInstructions } = require('./customInstructions');

    await expect(loadCustomInstructions()).resolves.toEqual(view({
      instructions: 'Use concise phrasing.',
      hasSavedInstructions: true
    }));
    expect(graphql).toHaveBeenCalledWith(expect.objectContaining({
      query: getMyCustomInstructions
    }));
    expect(graphql.mock.calls[0][0]).not.toHaveProperty('variables');
    expect(getMyCustomInstructions).not.toMatch(/compiledPrompt|promptExam|promptTreatment/i);
  });

  test('starts an idempotent asynchronous compile with trimmed source text', async () => {
    graphql.mockResolvedValue({
      data: {
        startMyCustomInstructionsCompilation: {
          accepted: true,
          jobId: 'job-123',
          compileStatus: 'COMPILING',
          effectiveMode: 'DEFAULT',
          ignored: 'server-only'
        }
      }
    });
    const { startCustomInstructionsCompilation } = require('./customInstructions');

    await expect(startCustomInstructionsCompilation('  Use concise phrasing.  ', 'request-123')).resolves.toEqual({
      accepted: true,
      jobId: 'job-123',
      compileStatus: 'COMPILING',
      effectiveMode: 'DEFAULT'
    });
    expect(graphql).toHaveBeenCalledWith(expect.objectContaining({
      query: startMyCustomInstructionsCompilation,
      variables: {
        input: {
          instructions: 'Use concise phrasing.',
          clientRequestId: 'request-123'
        }
      }
    }));
  });

  test('disables through AppSync while preserving the returned saved source', async () => {
    graphql.mockResolvedValue({
      data: {
        disableMyCustomInstructions: view({
          compileStatus: 'READY',
          instructions: 'Keep paragraphs short.',
          hasSavedInstructions: true,
          activeCompiledAt: '2026-08-16T12:00:00Z'
        })
      }
    });
    const { disableCustomInstructions } = require('./customInstructions');

    await expect(disableCustomInstructions()).resolves.toEqual(view({
      compileStatus: 'READY',
      instructions: 'Keep paragraphs short.',
      hasSavedInstructions: true,
      activeCompiledAt: '2026-08-16T12:00:00Z'
    }));
    expect(graphql).toHaveBeenCalledWith(expect.objectContaining({
      query: disableMyCustomInstructions
    }));
    expect(disableMyCustomInstructions).not.toMatch(/compiledPrompt|promptExam|promptTreatment/i);
  });

  test('needs only the global flag and rejects validation or malformed server state', async () => {
    const service = require('./customInstructions');
    expect(service.isCustomInstructionsAvailable()).toBe(true);
    await expect(service.startCustomInstructionsCompilation('   ', 'request')).rejects.toMatchObject({ code: 'validation' });
    await expect(service.startCustomInstructionsCompilation('a'.repeat(service.CUSTOM_INSTRUCTIONS_MAX_LENGTH + 1), 'request')).rejects.toMatchObject({ code: 'validation' });
    await expect(service.startCustomInstructionsCompilation('Valid text', '   ')).rejects.toMatchObject({ code: 'validation' });

    graphql.mockResolvedValue({ data: { getMyCustomInstructions: view({ effectiveMode: 'SURPRISE' }) } });
    await expect(service.loadCustomInstructions()).rejects.toMatchObject({ code: 'response' });

    graphql.mockResolvedValue({
      data: {
        getMyCustomInstructions: view({
          compileStatus: 'COMPILING',
          compileJobId: null,
          instructions: 'Valid source.',
          hasSavedInstructions: true
        })
      }
    });
    await expect(service.loadCustomInstructions()).rejects.toMatchObject({ code: 'response' });

    process.env.REACT_APP_CUSTOM_INSTRUCTIONS_ENABLED = 'false';
    expect(service.isCustomInstructionsAvailable()).toBe(false);
    await expect(service.loadCustomInstructions()).rejects.toMatchObject({ code: 'configuration' });
  });

  test('maps GraphQL rejection and returned errors to a stable service error', async () => {
    const { loadCustomInstructions } = require('./customInstructions');
    graphql.mockRejectedValueOnce(new Error('raw network detail'));
    await expect(loadCustomInstructions()).rejects.toMatchObject({
      code: 'service',
      message: 'ChiroNote could not reach custom instructions. Please try again.'
    });

    graphql.mockResolvedValueOnce({ errors: [{ message: 'raw resolver detail' }] });
    await expect(loadCustomInstructions()).rejects.toMatchObject({ code: 'service' });
  });
});
