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

class TelemetryDeliveryError extends Error {
  constructor(code) {
    super(`Recording telemetry delivery failed: ${code}`);
    this.name = 'TelemetryDeliveryError';
    this.code = code;
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
    this.setTimeoutFn = setTimeoutFn;
    this.clearTimeoutFn = clearTimeoutFn;
    this.windowObject = windowObject;

    this.queue = [];
    this.sequenceByJob = new Map();
    this.flushTimer = null;
    this.activeFlush = null;
    this.cachedAuthToken = null;
    this.authTokenPromise = null;
    this.deliveryFailureRecorded = false;
    this.deliveryBlockedUntil = 0;
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
        this.queue.shift();
        droppedEventCount += 1;
      }

      this.queue.push(event);
      if (event.eventName !== 'telemetry.buffer_overflow') {
        try {
          this.queue.push(this.createEvent(event.recordingJobId, 'telemetry.buffer_overflow', {
            droppedEventCount,
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
    try {
      response = await this.fetchImpl(endpoint, {
        method: 'POST',
        headers: {
          Authorization: authToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(createBatchMutation(events)),
        credentials: 'omit',
        keepalive
      });
    } catch (error) {
      throw new TelemetryDeliveryError('network_error');
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
    if (Array.isArray(responseBody?.errors) && responseBody.errors.length > 0) {
      this.cachedAuthToken = null;
      throw new TelemetryDeliveryError('graphql_error');
    }
  }

  recordDeliveryFailure(batch, error) {
    const errorCode = toSafeErrorCode(error, error?.code || 'delivery_failed');
    this.onDeliveryFailure({
      attempts: this.retryDelaysMs.length + 1,
      errorCode,
      queueDepth: this.queue.length
    });

    if (!this.deliveryFailureRecorded && batch[0]) {
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
    while (this.queue.length > 0) {
      const batch = this.queue.slice(0, this.batchSize);
      let lastError = null;
      let delivered = false;

      for (let attempt = 0; attempt <= this.retryDelaysMs.length; attempt += 1) {
        try {
          await this.sendBatch(batch, { keepalive });
          delivered = true;
          break;
        } catch (error) {
          lastError = error;
          if (attempt < this.retryDelaysMs.length) {
            await wait(this.retryDelaysMs[attempt], this.setTimeoutFn);
          }
        }
      }

      if (!delivered) {
        this.deliveryBlockedUntil = this.now() + this.retryCooldownMs;
        this.recordDeliveryFailure(batch, lastError);
        return false;
      }

      const deliveredIds = new Set(batch.map(event => event.id));
      this.queue = this.queue.filter(event => !deliveredIds.has(event.id));
      this.deliveryFailureRecorded = false;
      this.deliveryBlockedUntil = 0;
    }

    return true;
  }

  flush({ force = false, keepalive = false } = {}) {
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
        if (this.queue.length > 0) {
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
    this.isDisposed = true;
    if (this.flushTimer) {
      this.clearTimeoutFn(this.flushTimer);
      this.flushTimer = null;
    }
    if (this.isStarted) {
      this.windowObject?.removeEventListener?.('online', this.handleOnline);
      this.windowObject?.removeEventListener?.('pagehide', this.handlePageHide);
      this.isStarted = false;
    }
    this.flush({ force: true, keepalive: true }).catch(() => {});
  }
}

export const createRecordingTelemetryClient = (options) => (
  new RecordingTelemetryClient(options)
);
