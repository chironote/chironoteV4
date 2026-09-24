import { Amplify } from 'aws-amplify';
import { fetchAuthSession } from 'aws-amplify/auth';
import { getRecordingClientContext } from './recordingTelemetryContext';
import {
  createRecordingTelemetryEvent,
  isRecordingTerminalEvent,
  toSafeErrorCode
} from './recordingTelemetrySchema';

const DEFAULT_BATCH_SIZE = 10;
const DEFAULT_FLUSH_DELAY_MS = 750;
const DEFAULT_MAX_BUFFER_SIZE = 100;
const DEFAULT_RETRY_DELAYS_MS = Object.freeze([250, 1000, 3000]);
const DEFAULT_RETRY_COOLDOWN_MS = 30000;
const DEFAULT_REQUEST_TIMEOUT_MS = 10000;
const DUPLICATE_EVENT_ERROR_PATTERN = /(?:conditional.*(?:failed|request)|already exists|duplicate)/i;
const NON_RETRYABLE_GRAPHQL_ERROR_PATTERN = /(?:telemetryvalidationerror|validation error|validationerror|variable .*invalid|unknown argument|cannot query field|fieldundefined)/i;
const AUTH_GRAPHQL_ERROR_PATTERN = /(?:unauthorized|unauthenticated|not authorized)/i;

class TelemetryDeliveryError extends Error {
  constructor(code, { discardedIds = [], settledIds = [] } = {}) {
    super(`Recording telemetry delivery failed: ${code}`);
    this.name = 'TelemetryDeliveryError';
    this.code = code;
    this.discardedIds = discardedIds;
    this.settledIds = settledIds;
  }
}

const getDefaultEndpoint = () => Amplify.getConfig()?.API?.GraphQL?.endpoint || null;

const getDefaultAuthToken = async () => {
  const session = await fetchAuthSession();
  return session.tokens?.idToken?.toString() || session.tokens?.accessToken?.toString() || null;
};

const wait = (delayMs, setTimeoutFn) => new Promise(resolve => {
  setTimeoutFn(resolve, delayMs);
});

const serializeEventForAppSync = (event) => ({
  ...event,
  ...(event.requestedTrackSettings
    ? { requestedTrackSettings: JSON.stringify(event.requestedTrackSettings) }
    : {}),
  ...(event.appliedTrackSettings
    ? { appliedTrackSettings: JSON.stringify(event.appliedTrackSettings) }
    : {})
});

const createBatchMutation = (events) => {
  const variableDefinitions = events
    .map((event, index) => `$input${index}: CreateRecordingTelemetryEventInput!`)
    .join(', ');
  const mutations = events
    .map((event, index) => (
      `event${index}: createRecordingTelemetryEvent(input: $input${index}) { id }`
    ))
    .join('\n');
  const variables = {};
  events.forEach((event, index) => {
    variables[`input${index}`] = serializeEventForAppSync(event);
  });

  return {
    query: `mutation PutRecordingTelemetry(${variableDefinitions}) {\n${mutations}\n}`,
    variables
  };
};

const getGraphQLErrorMessage = (error) => (
  typeof error?.message === 'string' ? error.message : ''
);

const getGraphQLErrorText = (error) => [
  getGraphQLErrorMessage(error),
  typeof error?.errorType === 'string' ? error.errorType : ''
].join(' ');

const getGraphQLErrorAlias = (error) => {
  const alias = Array.isArray(error?.path) ? error.path[0] : null;
  return typeof alias === 'string' && /^event\d+$/.test(alias) ? alias : null;
};

const classifyBatchResponse = (responseBody, events) => {
  const errors = Array.isArray(responseBody?.errors) ? responseBody.errors : [];
  const errorsByAlias = new Map();
  let hasUnscopedError = false;

  errors.forEach((error) => {
    const alias = getGraphQLErrorAlias(error);
    if (!alias) {
      hasUnscopedError = true;
      return;
    }
    const existingErrors = errorsByAlias.get(alias) || [];
    existingErrors.push(error);
    errorsByAlias.set(alias, existingErrors);
  });

  const discardedIds = [];
  const retryIds = [];
  const settledIds = [];

  events.forEach((event, index) => {
    const alias = `event${index}`;
    const aliasErrors = errorsByAlias.get(alias) || [];
    if (responseBody?.data?.[alias]?.id) {
      settledIds.push(event.id);
      return;
    }
    if (aliasErrors.some(error => DUPLICATE_EVENT_ERROR_PATTERN.test(getGraphQLErrorText(error)))) {
      settledIds.push(event.id);
      return;
    }
    if (
      aliasErrors.length > 0 &&
      aliasErrors.every(error => NON_RETRYABLE_GRAPHQL_ERROR_PATTERN.test(
        getGraphQLErrorText(error)
      ))
    ) {
      discardedIds.push(event.id);
      return;
    }
    retryIds.push(event.id);
  });

  if (hasUnscopedError && retryIds.length === 0) {
    events.forEach((event) => {
      if (!settledIds.includes(event.id) && !discardedIds.includes(event.id)) {
        retryIds.push(event.id);
      }
    });
  }

  return { discardedIds, retryIds, settledIds };
};

export class RecordingTelemetryClient {
  constructor({
    batchSize = DEFAULT_BATCH_SIZE,
    clientContext = getRecordingClientContext(),
    endpointResolver = getDefaultEndpoint,
    fetchImpl = (...args) => fetch(...args),
    flushDelayMs = DEFAULT_FLUSH_DELAY_MS,
    getAuthToken = getDefaultAuthToken,
    maxBufferSize = DEFAULT_MAX_BUFFER_SIZE,
    now = () => Date.now(),
    onDeliveryFailure = () => {},
    onRejected = () => {},
    retryCooldownMs = DEFAULT_RETRY_COOLDOWN_MS,
    retryDelaysMs = DEFAULT_RETRY_DELAYS_MS,
    requestTimeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
    AbortControllerClass = typeof AbortController !== 'undefined' ? AbortController : null,
    setTimeoutFn = setTimeout,
    clearTimeoutFn = clearTimeout,
    windowObject = typeof window !== 'undefined' ? window : null
  } = {}) {
    this.batchSize = batchSize;
    this.clientContext = clientContext;
    this.endpointResolver = endpointResolver;
    this.fetchImpl = fetchImpl;
    this.flushDelayMs = flushDelayMs;
    this.getAuthToken = getAuthToken;
    this.maxBufferSize = Math.max(2, Math.floor(maxBufferSize));
    this.now = now;
    this.onDeliveryFailure = onDeliveryFailure;
    this.onRejected = onRejected;
    this.retryCooldownMs = retryCooldownMs;
    this.retryDelaysMs = [...retryDelaysMs];
    this.requestTimeoutMs = requestTimeoutMs;
    this.AbortControllerClass = AbortControllerClass;
    this.setTimeoutFn = setTimeoutFn;
    this.clearTimeoutFn = clearTimeoutFn;
    this.windowObject = windowObject;

    this.queue = [];
    this.sequenceByJob = new Map();
    this.flushTimer = null;
    this.activeFlush = null;
    this.cachedAuthToken = null;
    this.authTokenPromise = null;
    this.activeRequestAbortController = null;
    this.activeRequestIsKeepalive = false;
    this.deliveryFailureRecorded = false;
    this.deliveryBlockedUntil = 0;
    this.totalDroppedEventCount = 0;
    this.isStarted = false;
    this.isDisposed = false;

    this.handleOnline = () => {
      this.deliveryBlockedUntil = 0;
      this.flush({ force: true }).catch(() => {});
    };
    this.handlePageHide = () => {
      this.flush({ force: true, keepalive: true }).catch(() => {});
    };

  }

  start() {
    if (this.isStarted || this.isDisposed) {
      return;
    }
    this.isStarted = true;
    this.windowObject?.addEventListener?.('online', this.handleOnline);
    this.windowObject?.addEventListener?.('pagehide', this.handlePageHide);
  }

  nextSequence(recordingJobId) {
    const nextSequence = (this.sequenceByJob.get(recordingJobId) || 0) + 1;
    this.sequenceByJob.set(recordingJobId, nextSequence);
    return nextSequence;
  }

  createEvent(recordingJobId, eventName, payload) {
    return createRecordingTelemetryEvent({
      ...this.clientContext,
      eventName,
      now: this.now(),
      payload,
      recordingJobId,
      sequence: this.nextSequence(recordingJobId)
    });
  }

  enqueue(event) {
    if (this.queue.length >= this.maxBufferSize) {
      const reservedSlots = event.eventName === 'telemetry.buffer_overflow' ? 1 : 2;
      let droppedEventCount = 0;
      while (this.queue.length > this.maxBufferSize - reservedSlots) {
        const droppedEvent = this.queue.shift();
        droppedEventCount += droppedEvent?.eventName === 'telemetry.buffer_overflow'
          ? 0
          : 1;
      }
      this.totalDroppedEventCount = Math.min(
        2147483647,
        this.totalDroppedEventCount + droppedEventCount
      );

      this.queue.push(event);
      if (event.eventName !== 'telemetry.buffer_overflow') {
        try {
          this.queue.push(this.createEvent(event.recordingJobId, 'telemetry.buffer_overflow', {
            droppedEventCount: this.totalDroppedEventCount,
            provider: 'client_telemetry',
            queueDepth: this.queue.length
          }));
        } catch (error) {
          this.onRejected({ code: toSafeErrorCode(error, 'buffer_overflow_event_rejected') });
        }
      }
      return;
    }
    this.queue.push(event);
  }

  emit(recordingJobId, eventName, payload = {}) {
    if (this.isDisposed || !recordingJobId) {
      return null;
    }

    this.start();
    try {
      const event = this.createEvent(recordingJobId, eventName, payload);
      this.enqueue(event);
      this.primeAuthToken();
      if (isRecordingTerminalEvent(eventName)) {
        this.flush({ force: true, keepalive: true }).catch(() => {});
      } else {
        this.scheduleFlush();
      }
      return event;
    } catch (error) {
      this.onRejected({ code: toSafeErrorCode(error, 'event_rejected') });
      return null;
    }
  }

  primeAuthToken() {
    if (this.cachedAuthToken || this.authTokenPromise) {
      return this.authTokenPromise;
    }
    this.authTokenPromise = Promise.resolve()
      .then(() => this.getAuthToken())
      .then((token) => {
        this.cachedAuthToken = token;
        return token;
      })
      .catch(() => null)
      .finally(() => {
        this.authTokenPromise = null;
      });
    return this.authTokenPromise;
  }

  scheduleFlush() {
    if (
      this.isDisposed ||
      this.flushTimer ||
      this.activeFlush ||
      this.queue.length === 0
    ) {
      return;
    }
    const cooldownDelayMs = Math.max(0, this.deliveryBlockedUntil - this.now());
    const delayMs = Math.max(this.flushDelayMs, cooldownDelayMs);
    this.flushTimer = this.setTimeoutFn(() => {
      this.flushTimer = null;
      this.flush()
        .then((delivered) => {
          if (!delivered && this.queue.length > 0) {
            this.scheduleFlush();
          }
        })
        .catch(() => {});
    }, delayMs);
  }

  async sendBatch(events, { keepalive = false } = {}) {
    const endpoint = await this.endpointResolver();
    if (!endpoint) {
      throw new TelemetryDeliveryError('endpoint_unavailable');
    }

    const authToken = this.cachedAuthToken || await this.primeAuthToken();
    if (!authToken) {
      throw new TelemetryDeliveryError('authentication_unavailable');
    }

    let response;
    const abortController = this.AbortControllerClass
      ? new this.AbortControllerClass()
      : null;
    const requestTimeout = abortController && this.requestTimeoutMs > 0
      ? this.setTimeoutFn(() => abortController.abort(), this.requestTimeoutMs)
      : null;
    if (abortController) {
      this.activeRequestAbortController = abortController;
      this.activeRequestIsKeepalive = keepalive;
    }
    try {
      response = await this.fetchImpl(endpoint, {
        method: 'POST',
        headers: {
          Authorization: authToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(createBatchMutation(events)),
        credentials: 'omit',
        keepalive,
        ...(abortController ? { signal: abortController.signal } : {})
      });
    } catch (error) {
      throw new TelemetryDeliveryError(
        abortController?.signal?.aborted ? 'request_timeout' : 'network_error'
      );
    } finally {
      if (requestTimeout !== null) {
        this.clearTimeoutFn(requestTimeout);
      }
      if (this.activeRequestAbortController === abortController) {
        this.activeRequestAbortController = null;
        this.activeRequestIsKeepalive = false;
      }
    }

    if (!response?.ok) {
      if (response?.status === 401 || response?.status === 403) {
        this.cachedAuthToken = null;
      }
      throw new TelemetryDeliveryError(`http_${response?.status || 0}`);
    }

    let responseBody;
    try {
      responseBody = await response.json();
    } catch (error) {
      throw new TelemetryDeliveryError('invalid_response');
    }
    const responseErrors = Array.isArray(responseBody?.errors) ? responseBody.errors : [];
    if (responseErrors.some(error => AUTH_GRAPHQL_ERROR_PATTERN.test(getGraphQLErrorText(error)))) {
      this.cachedAuthToken = null;
    }
    const batchResult = classifyBatchResponse(responseBody, events);
    if (batchResult.retryIds.length > 0) {
      throw new TelemetryDeliveryError(
        responseErrors.length > 0 ? 'graphql_error' : 'invalid_response',
        batchResult
      );
    }
    return batchResult;
  }

  removeQueuedEvents(eventIds) {
    if (!eventIds?.length) {
      return;
    }
    const eventIdSet = new Set(eventIds);
    this.queue = this.queue.filter(event => !eventIdSet.has(event.id));
  }

  recordDiscardedEvents(eventIds, code = 'non_retryable_graphql_error') {
    if (!eventIds?.length) {
      return;
    }
    this.onRejected({ code, count: eventIds.length });
  }

  recordDeliveryFailure(batch, error) {
    const errorCode = toSafeErrorCode(error, error?.code || 'delivery_failed');
    this.onDeliveryFailure({
      attempts: this.retryDelaysMs.length + 1,
      errorCode,
      queueDepth: this.queue.length
    });

    if (!this.isDisposed && !this.deliveryFailureRecorded && batch[0]) {
      this.deliveryFailureRecorded = true;
      try {
        this.enqueue(this.createEvent(batch[0].recordingJobId, 'telemetry.delivery_failed', {
          deliveryAttempt: this.retryDelaysMs.length + 1,
          errorCode,
          provider: 'client_telemetry',
          queueDepth: this.queue.length
        }));
      } catch (eventError) {
        this.onRejected({ code: toSafeErrorCode(eventError, 'delivery_failure_event_rejected') });
      }
    }
  }

  async performFlush({ keepalive = false } = {}) {
    while (!this.isDisposed && this.queue.length > 0) {
      let batch = this.queue.slice(0, this.batchSize);
      let lastError = null;
      let delivered = false;

      for (let attempt = 0; attempt <= this.retryDelaysMs.length; attempt += 1) {
        if (this.isDisposed) {
          return false;
        }
        try {
          const batchResult = await this.sendBatch(batch, { keepalive });
          this.removeQueuedEvents([
            ...(batchResult.settledIds || []),
            ...(batchResult.discardedIds || [])
          ]);
          this.recordDiscardedEvents(batchResult.discardedIds);
          delivered = true;
          break;
        } catch (error) {
          lastError = error;
          this.removeQueuedEvents([
            ...(error.settledIds || []),
            ...(error.discardedIds || [])
          ]);
          this.recordDiscardedEvents(error.discardedIds);
          const settledOrDiscarded = new Set([
            ...(error.settledIds || []),
            ...(error.discardedIds || [])
          ]);
          batch = batch.filter(event => !settledOrDiscarded.has(event.id));
          if (batch.length === 0) {
            delivered = true;
            break;
          }
          if (this.isDisposed) {
            return false;
          }
          if (attempt < this.retryDelaysMs.length) {
            await wait(this.retryDelaysMs[attempt], this.setTimeoutFn);
          }
        }
      }

      if (this.isDisposed) {
        return this.queue.length === 0;
      }

      if (!delivered) {
        this.deliveryBlockedUntil = this.now() + this.retryCooldownMs;
        this.recordDeliveryFailure(batch, lastError);
        return false;
      }

      this.deliveryFailureRecorded = false;
      this.deliveryBlockedUntil = 0;
    }

    return true;
  }

  flush({ force = false, keepalive = false } = {}) {
    if (this.isDisposed) {
      return Promise.resolve(false);
    }
    if (this.queue.length === 0) {
      return Promise.resolve(true);
    }
    if (!force && this.now() < this.deliveryBlockedUntil) {
      return Promise.resolve(false);
    }
    if (this.activeFlush) {
      return this.activeFlush;
    }
    if (this.flushTimer) {
      this.clearTimeoutFn(this.flushTimer);
      this.flushTimer = null;
    }

    this.activeFlush = this.performFlush({ keepalive })
      .finally(() => {
        this.activeFlush = null;
        if (!this.isDisposed && this.queue.length > 0) {
          this.scheduleFlush();
        }
      });
    return this.activeFlush;
  }

  getPendingEvents() {
    return this.queue.map(event => ({ ...event }));
  }

  dispose() {
    if (this.isDisposed) {
      return;
    }
    const disposeBatch = this.activeFlush ? [] : this.queue.slice(0, this.batchSize);
    this.isDisposed = true;
    if (!this.activeRequestIsKeepalive) {
      this.activeRequestAbortController?.abort();
    }
    this.activeRequestAbortController = null;
    this.activeRequestIsKeepalive = false;
    if (this.flushTimer) {
      this.clearTimeoutFn(this.flushTimer);
      this.flushTimer = null;
    }
    if (this.isStarted) {
      this.windowObject?.removeEventListener?.('online', this.handleOnline);
      this.windowObject?.removeEventListener?.('pagehide', this.handlePageHide);
      this.isStarted = false;
    }
    if (disposeBatch.length > 0) {
      this.sendBatch(disposeBatch, { keepalive: true })
        .then((batchResult) => {
          this.removeQueuedEvents([
            ...(batchResult.settledIds || []),
            ...(batchResult.discardedIds || [])
          ]);
        })
        .catch(() => {});
    }
  }
}

export const createRecordingTelemetryClient = (options) => (
  new RecordingTelemetryClient(options)
);
