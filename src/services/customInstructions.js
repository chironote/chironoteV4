import { getAmplifyClient } from './amplifyClient';
import { getMyCustomInstructions } from '../graphql/queries';
import {
  disableMyCustomInstructions,
  startMyCustomInstructionsCompilation
} from '../graphql/mutations';

export const CUSTOM_INSTRUCTIONS_MAX_LENGTH = 4000;
export const CUSTOM_INSTRUCTIONS_FAST_POLL_INTERVAL_MS = 3000;
export const CUSTOM_INSTRUCTIONS_SLOW_POLL_INTERVAL_MS = 9000;
export const CUSTOM_INSTRUCTIONS_FAST_POLL_WINDOW_MS = 30000;
export const CUSTOM_INSTRUCTIONS_POLL_CEILING_MS = 5 * 60 * 1000;

const compileStatuses = new Set(['NEVER', 'COMPILING', 'READY', 'FAILED']);
const effectiveModes = new Set(['DEFAULT', 'CUSTOM']);

export const isCustomInstructionsAvailable = () => (
  String(process.env.REACT_APP_CUSTOM_INSTRUCTIONS_ENABLED).toLowerCase() === 'true'
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
  service: 'ChiroNote could not reach custom instructions. Please try again.',
  response: 'ChiroNote received an unexpected custom instructions response. Please try again.'
};

const responseError = () => new CustomInstructionsError('response', messages.response);

const normalizeNullableString = (value) => {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') throw responseError();
  return value;
};

const normalizeView = (value) => {
  if (!value || typeof value !== 'object'
    || typeof value.enableCustomInstructions !== 'boolean'
    || typeof value.hasSavedInstructions !== 'boolean'
    || !compileStatuses.has(value.compileStatus)
    || !effectiveModes.has(value.effectiveMode)) {
    throw responseError();
  }

  const compileJobId = normalizeNullableString(value.compileJobId);
  if (value.compileStatus === 'COMPILING' && (!compileJobId || !compileJobId.trim())) {
    throw responseError();
  }

  return {
    enableCustomInstructions: value.enableCustomInstructions,
    effectiveMode: value.effectiveMode,
    compileStatus: value.compileStatus,
    instructions: normalizeNullableString(value.instructions),
    compileJobId,
    hasSavedInstructions: value.hasSavedInstructions,
    updatedAt: normalizeNullableString(value.updatedAt),
    activeCompiledAt: normalizeNullableString(value.activeCompiledAt),
    lastErrorCode: normalizeNullableString(value.lastErrorCode)
  };
};

const normalizeAccepted = (value) => {
  if (!value || typeof value !== 'object'
    || value.accepted !== true
    || typeof value.jobId !== 'string'
    || !value.jobId.trim()
    || !compileStatuses.has(value.compileStatus)
    || !effectiveModes.has(value.effectiveMode)) {
    throw responseError();
  }

  return {
    accepted: true,
    jobId: value.jobId,
    compileStatus: value.compileStatus,
    effectiveMode: value.effectiveMode
  };
};

const execute = async ({ query, variables, select }) => {
  if (!isCustomInstructionsAvailable()) {
    throw new CustomInstructionsError('configuration', messages.configuration);
  }

  let result;
  try {
    result = await getAmplifyClient().graphql({ query, ...(variables ? { variables } : {}) });
  } catch (error) {
    throw new CustomInstructionsError('service', messages.service);
  }

  if (result?.errors?.length) {
    throw new CustomInstructionsError('service', messages.service);
  }

  return select(result?.data);
};

export const createCustomInstructionsRequestId = () => {
  if (typeof window !== 'undefined' && typeof window.crypto?.randomUUID === 'function') {
    return window.crypto.randomUUID();
  }

  return `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
};

export const loadCustomInstructions = () => execute({
  query: getMyCustomInstructions,
  select: (data) => normalizeView(data?.getMyCustomInstructions)
});

export const startCustomInstructionsCompilation = async (instructions, clientRequestId = createCustomInstructionsRequestId()) => {
  const normalized = typeof instructions === 'string' ? instructions.trim() : '';
  if (!normalized || normalized.length > CUSTOM_INSTRUCTIONS_MAX_LENGTH) {
    throw new CustomInstructionsError(
      'validation',
      `Enter instructions between 1 and ${CUSTOM_INSTRUCTIONS_MAX_LENGTH.toLocaleString()} characters.`
    );
  }

  if (typeof clientRequestId !== 'string' || !clientRequestId.trim()) {
    throw new CustomInstructionsError('validation', 'A valid request identifier is required.');
  }

  return execute({
    query: startMyCustomInstructionsCompilation,
    variables: {
      input: {
        instructions: normalized,
        clientRequestId: clientRequestId.trim()
      }
    },
    select: (data) => normalizeAccepted(data?.startMyCustomInstructionsCompilation)
  });
};

export const disableCustomInstructions = () => execute({
  query: disableMyCustomInstructions,
  select: (data) => normalizeView(data?.disableMyCustomInstructions)
});
