import { fetchAuthSession } from 'aws-amplify/auth';

export const CUSTOM_INSTRUCTIONS_MAX_LENGTH = 4000;
export const CUSTOM_INSTRUCTIONS_TIMEOUT_MS = 105000;

const endpoint = () => (process.env.REACT_APP_CUSTOM_INSTRUCTIONS_URL || '').trim();

export const isCustomInstructionsAvailable = () => (
  String(process.env.REACT_APP_CUSTOM_INSTRUCTIONS_ENABLED).toLowerCase() === 'true' && Boolean(endpoint())
);

export class CustomInstructionsError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'CustomInstructionsError';
    this.code = code;
  }
}

const messages = {
  configuration: 'Custom instructions are not available yet.',
  auth: 'Your session could not be verified. Please sign in again.',
  timeout: 'The request took too long. Your changes were not applied. Please try again.',
  network: 'ChiroNote could not reach the custom instructions service. Please try again.',
  server: 'The custom instructions service could not complete the request. Please try again.',
  response: 'ChiroNote received an unexpected response. Please try again.'
};

const normalizeResponse = (value) => {
  if (!value || typeof value !== 'object' || typeof value.enabled !== 'boolean') {
    throw new CustomInstructionsError('response', messages.response);
  }
  if (value.instructions !== null && typeof value.instructions !== 'string') {
    throw new CustomInstructionsError('response', messages.response);
  }
  return {
    enabled: value.enabled,
    instructions: value.instructions,
    ...(typeof value.updatedAt === 'string' ? { updatedAt: value.updatedAt } : {})
  };
};

const request = async (payload) => {
  if (!isCustomInstructionsAvailable()) {
    throw new CustomInstructionsError('configuration', messages.configuration);
  }

  let token;
  try {
    const session = await fetchAuthSession();
    token = session.tokens?.idToken?.toString();
  } catch (error) {
    throw new CustomInstructionsError('auth', messages.auth);
  }
  if (!token) throw new CustomInstructionsError('auth', messages.auth);

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), CUSTOM_INSTRUCTIONS_TIMEOUT_MS);
  try {
    const response = await fetch(endpoint(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    if (!response.ok) throw new CustomInstructionsError('server', messages.server);
    return normalizeResponse(await response.json());
  } catch (error) {
    if (error instanceof CustomInstructionsError) throw error;
    if (error?.name === 'AbortError') throw new CustomInstructionsError('timeout', messages.timeout);
    throw new CustomInstructionsError('network', messages.network);
  } finally {
    window.clearTimeout(timeoutId);
  }
};

export const loadCustomInstructions = () => request({ action: 'get' });

export const applyCustomInstructions = async (instructions) => {
  const normalized = typeof instructions === 'string' ? instructions.trim() : '';
  if (!normalized || normalized.length > CUSTOM_INSTRUCTIONS_MAX_LENGTH) {
    throw new CustomInstructionsError(
      'validation',
      `Enter instructions between 1 and ${CUSTOM_INSTRUCTIONS_MAX_LENGTH.toLocaleString()} characters.`
    );
  }
  const result = await request({ action: 'apply', instructions: normalized });
  if (!result.enabled) throw new CustomInstructionsError('response', messages.response);
  return result;
};

export const resetCustomInstructions = async () => {
  const result = await request({ action: 'reset' });
  if (result.enabled) throw new CustomInstructionsError('response', messages.response);
  return result;
};
