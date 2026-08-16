import { RecordingTelemetryClient } from './recordingTelemetryClient';

const RECORDING_JOB_ID = '8c458d93-1125-4e28-9cd1-357fc49f3342';
const CLIENT_CONTEXT = {
  appBuild: '1.3.0-test',
  browser: 'chrome',
  platform: 'web',
  source: 'client.web'
};

const successfulResponse = (eventCount = 1) => ({
  json: async () => ({
    data: Object.fromEntries(
      Array.from({ length: eventCount }, (_, index) => [
        `event${index}`,
        { id: `event-id-${index}` }
      ])
    )
  }),
  ok: true,
  status: 200
});

const createClient = (overrides = {}) => new RecordingTelemetryClient({
  clientContext: CLIENT_CONTEXT,
  endpointResolver: () => 'https://telemetry.example.test/graphql',
  flushDelayMs: 60000,
  getAuthToken: async () => 'id-token',
  requestTimeoutMs: 0,
  retryDelaysMs: [],
  windowObject: null,
  ...overrides
});

describe('RecordingTelemetryClient', () => {
  test('delivers an authenticated keepalive batch without exposing its token', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(successfulResponse());
    const client = createClient({ fetchImpl });

    const emitted = client.emit(RECORDING_JOB_ID, 'capture.started', {
      provider: 'media_recorder',
      requestedTrackSettings: { channelCount: 1 }
    });
    expect(emitted).not.toBeNull();

    await client.flush({ force: true, keepalive: true });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [, request] = fetchImpl.mock.calls[0];
    expect(request).toMatchObject({
      credentials: 'omit',
      keepalive: true,
      method: 'POST'
    });
    expect(request.headers.Authorization).toBe('id-token');
    expect(request.body).not.toContain('id-token');
    const body = JSON.parse(request.body);
    expect(body.variables.input0).toMatchObject({
      eventName: 'capture.started',
      recordingJobId: RECORDING_JOB_ID,
      schemaVersion: '1.0'
    });
    expect(body.variables.input0.requestedTrackSettings).toBe('{"channelCount":1}');
    expect(client.getPendingEvents()).toEqual([]);
  });

  test('uses bounded retry and succeeds after a transient disconnect', async () => {
    const fetchImpl = jest.fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(successfulResponse());
    const client = createClient({
      fetchImpl,
      retryDelaysMs: [0]
    });

    client.emit(RECORDING_JOB_ID, 'capture.started', { provider: 'media_recorder' });
    await client.flush({ force: true });

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(client.getPendingEvents()).toEqual([]);
  });

  test('refreshes authentication before retrying a GraphQL rejection', async () => {
    const fetchImpl = jest.fn()
      .mockResolvedValueOnce({
        json: async () => ({ errors: [{ message: 'unauthorized' }] }),
        ok: true,
        status: 200
      })
      .mockResolvedValueOnce(successfulResponse());
    const getAuthToken = jest.fn()
      .mockResolvedValueOnce('expired-token')
      .mockResolvedValueOnce('refreshed-token');
    const client = createClient({
      fetchImpl,
      getAuthToken,
      retryDelaysMs: [0]
    });

    client.emit(RECORDING_JOB_ID, 'capture.started', { provider: 'media_recorder' });
    await client.flush({ force: true });

    expect(getAuthToken).toHaveBeenCalledTimes(2);
    expect(fetchImpl.mock.calls[0][1].headers.Authorization).toBe('expired-token');
    expect(fetchImpl.mock.calls[1][1].headers.Authorization).toBe('refreshed-token');
    expect(client.getPendingEvents()).toEqual([]);
  });

  test('removes successful aliases before retrying only a failed batch member', async () => {
    const fetchImpl = jest.fn()
      .mockResolvedValueOnce({
        json: async () => ({
          data: { event0: { id: 'created-event' }, event1: null },
          errors: [{ message: 'Internal server error', path: ['event1'] }]
        }),
        ok: true,
        status: 200
      })
      .mockResolvedValueOnce(successfulResponse());
    const client = createClient({ fetchImpl, retryDelaysMs: [0] });

    client.emit(RECORDING_JOB_ID, 'capture.requested', { provider: 'media_recorder' });
    client.emit(RECORDING_JOB_ID, 'capture.started', { provider: 'media_recorder' });
    await client.flush({ force: true });

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    const retryBody = JSON.parse(fetchImpl.mock.calls[1][1].body);
    expect(Object.keys(retryBody.variables)).toEqual(['input0']);
    expect(retryBody.variables.input0.eventName).toBe('capture.started');
    expect(client.getPendingEvents()).toEqual([]);
  });

  test('treats a duplicate id after an ambiguous response as already delivered', async () => {
    const fetchImpl = jest.fn()
      .mockResolvedValueOnce({
        json: async () => { throw new Error('response stream interrupted'); },
        ok: true,
        status: 200
      })
      .mockResolvedValueOnce({
        json: async () => ({
          data: { event0: null },
          errors: [{
            message: 'The conditional request failed (ConditionalCheckFailedException)',
            path: ['event0']
          }]
        }),
        ok: true,
        status: 200
      });
    const client = createClient({ fetchImpl, retryDelaysMs: [0] });

    client.emit(RECORDING_JOB_ID, 'capture.started', { provider: 'media_recorder' });
    await client.flush({ force: true });

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(client.getPendingEvents()).toEqual([]);
  });

  test('discards a non-retriable schema rejection without wedging later events', async () => {
    const onRejected = jest.fn();
    const fetchImpl = jest.fn().mockResolvedValue({
      json: async () => ({
        data: { event0: null },
        errors: [{
          errorType: 'TelemetryValidationError',
          message: 'Invalid telemetry source',
          path: ['event0']
        }]
      }),
      ok: true,
      status: 200
    });
    const client = createClient({ fetchImpl, onRejected });

    client.emit(RECORDING_JOB_ID, 'capture.started', { provider: 'media_recorder' });
    await client.flush({ force: true });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(onRejected).toHaveBeenCalledWith({
      code: 'non_retryable_graphql_error',
      count: 1
    });
    expect(client.getPendingEvents()).toEqual([]);
  });

  test('retains events and records a delivery-failure metric after retries exhaust', async () => {
    const fetchImpl = jest.fn().mockRejectedValue(new Error('offline'));
    const onDeliveryFailure = jest.fn();
    const client = createClient({ fetchImpl, onDeliveryFailure });

    client.emit(RECORDING_JOB_ID, 'capture.started', { provider: 'media_recorder' });
    const delivered = await client.flush({ force: true });

    expect(delivered).toBe(false);
    expect(onDeliveryFailure).toHaveBeenCalledWith(expect.objectContaining({
      attempts: 1,
      errorCode: 'network_error'
    }));
    expect(client.getPendingEvents().map(event => event.eventName)).toEqual([
      'capture.started',
      'telemetry.delivery_failed'
    ]);

    fetchImpl.mockResolvedValue(successfulResponse(2));
    await client.flush({ force: true });
    expect(client.getPendingEvents()).toEqual([]);
  });

  test('retries a successful HTTP response that omits an event result', async () => {
    const fetchImpl = jest.fn()
      .mockResolvedValueOnce({
        json: async () => ({ data: {} }),
        ok: true,
        status: 200
      })
      .mockResolvedValueOnce(successfulResponse());
    const client = createClient({ fetchImpl, retryDelaysMs: [0] });

    client.emit(RECORDING_JOB_ID, 'capture.started', { provider: 'media_recorder' });
    await client.flush({ force: true });

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(client.getPendingEvents()).toEqual([]);
  });

  test('rejects PHI-shaped payloads without enqueueing or throwing into recording', () => {
    const fetchImpl = jest.fn();
    const onRejected = jest.fn();
    const client = createClient({ fetchImpl, onRejected });

    expect(client.emit(RECORDING_JOB_ID, 'capture.failed', {
      patientId: 'synthetic-patient-id'
    })).toBeNull();
    expect(onRejected).toHaveBeenCalledTimes(1);
    expect(client.getPendingEvents()).toEqual([]);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  test('keeps the buffer bounded and reports every event dropped to make room', () => {
    const client = createClient({ maxBufferSize: 3 });

    client.emit(RECORDING_JOB_ID, 'capture.requested', { provider: 'media_recorder' });
    client.emit(RECORDING_JOB_ID, 'capture.started', { provider: 'media_recorder' });
    client.emit(RECORDING_JOB_ID, 'capture.paused', { provider: 'media_recorder' });
    client.emit(RECORDING_JOB_ID, 'capture.resumed', { provider: 'media_recorder' });

    const pendingEvents = client.getPendingEvents();
    expect(pendingEvents).toHaveLength(3);
    expect(pendingEvents.map(event => event.eventName)).toEqual([
      'capture.paused',
      'capture.resumed',
      'telemetry.buffer_overflow'
    ]);
    expect(pendingEvents[2].droppedEventCount).toBe(2);
  });

  test('carries the cumulative dropped count when an older overflow marker is evicted', () => {
    const client = createClient({ maxBufferSize: 3 });

    ['capture.requested', 'capture.started', 'capture.paused', 'capture.resumed', 'capture.stopped']
      .forEach((eventName) => client.emit(RECORDING_JOB_ID, eventName, {
        provider: 'media_recorder'
      }));

    const overflowEvents = client.getPendingEvents()
      .filter(event => event.eventName === 'telemetry.buffer_overflow');
    expect(overflowEvents[overflowEvents.length - 1].droppedEventCount).toBe(4);
  });

  test('registers browser lifecycle handlers only after start and removes them on dispose', () => {
    const windowObject = {
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    };
    const client = createClient({ windowObject });

    expect(windowObject.addEventListener).not.toHaveBeenCalled();
    client.start();
    client.start();
    expect(windowObject.addEventListener.mock.calls.map(([eventName]) => eventName)).toEqual([
      'online',
      'pagehide'
    ]);

    client.dispose();
    expect(windowObject.removeEventListener.mock.calls.map(([eventName]) => eventName)).toEqual([
      'online',
      'pagehide'
    ]);
  });

  test('schedules an autonomous cooldown retry after bounded delivery attempts fail', async () => {
    const scheduledDelays = [];
    const client = createClient({
      fetchImpl: jest.fn().mockRejectedValue(new Error('offline')),
      flushDelayMs: 750,
      now: () => 1000,
      retryCooldownMs: 30000,
      setTimeoutFn: (callback, delayMs) => {
        scheduledDelays.push(delayMs);
        return scheduledDelays.length;
      }
    });

    client.emit(RECORDING_JOB_ID, 'capture.started', { provider: 'media_recorder' });
    scheduledDelays.length = 0;
    await client.flush({ force: true });

    expect(scheduledDelays).toEqual([30000]);
    client.dispose();
  });

  test('aborts a hung delivery attempt and records the timeout', async () => {
    const onDeliveryFailure = jest.fn();
    const fetchImpl = jest.fn((endpoint, request) => new Promise((resolve, reject) => {
      request.signal.addEventListener('abort', () => reject(new Error('aborted')));
    }));
    const client = createClient({
      fetchImpl,
      onDeliveryFailure,
      requestTimeoutMs: 1
    });

    client.emit(RECORDING_JOB_ID, 'capture.started', { provider: 'media_recorder' });
    await client.flush({ force: true });

    expect(onDeliveryFailure).toHaveBeenCalledWith(expect.objectContaining({
      errorCode: 'request_timeout'
    }));
  });

  test('dispose performs at most one best-effort send and never re-arms a timer', async () => {
    const scheduledDelays = [];
    const fetchImpl = jest.fn().mockRejectedValue(new Error('offline'));
    const client = createClient({
      fetchImpl,
      setTimeoutFn: (callback, delayMs) => {
        scheduledDelays.push(delayMs);
        return scheduledDelays.length;
      }
    });

    client.emit(RECORDING_JOB_ID, 'capture.started', { provider: 'media_recorder' });
    await client.authTokenPromise;
    expect(scheduledDelays).toEqual([60000]);
    client.dispose();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(scheduledDelays).toEqual([60000]);
    await expect(client.flush({ force: true })).resolves.toBe(false);
  });

  test('dispose stops an active retry loop after its current attempt', async () => {
    const scheduledCallbacks = [];
    const fetchImpl = jest.fn().mockRejectedValue(new Error('offline'));
    const client = createClient({
      fetchImpl,
      retryDelaysMs: [1000],
      setTimeoutFn: (callback, delayMs) => {
        scheduledCallbacks.push({ callback, delayMs });
        return scheduledCallbacks.length;
      }
    });

    client.emit(RECORDING_JOB_ID, 'capture.started', { provider: 'media_recorder' });
    const flushPromise = client.flush({ force: true });
    await new Promise(resolve => setTimeout(resolve, 0));
    const retryTimer = scheduledCallbacks.find(({ delayMs }) => delayMs === 1000);
    expect(retryTimer).toBeDefined();

    client.dispose();
    retryTimer.callback();
    await expect(flushPromise).resolves.toBe(false);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  test('dispose aborts an active request without starting another send', async () => {
    const fetchImpl = jest.fn((endpoint, request) => new Promise((resolve, reject) => {
      request.signal.addEventListener('abort', () => reject(new Error('aborted')));
    }));
    const client = createClient({ fetchImpl, requestTimeoutMs: 60000 });

    client.emit(RECORDING_JOB_ID, 'capture.started', { provider: 'media_recorder' });
    const flushPromise = client.flush({ force: true });
    await new Promise(resolve => setTimeout(resolve, 0));
    const requestSignal = fetchImpl.mock.calls[0][1].signal;

    client.dispose();

    expect(requestSignal.aborted).toBe(true);
    await expect(flushPromise).resolves.toBe(false);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  test('dispose preserves an already-active keepalive request', async () => {
    let resolveFetch;
    const fetchImpl = jest.fn().mockImplementation(() => new Promise((resolve) => {
      resolveFetch = resolve;
    }));
    const client = createClient({ fetchImpl });

    client.emit(RECORDING_JOB_ID, 'capture.started', { provider: 'media_recorder' });
    const flushPromise = client.flush({ force: true, keepalive: true });
    await new Promise(resolve => setTimeout(resolve, 0));
    const requestSignal = fetchImpl.mock.calls[0][1].signal;

    client.dispose();
    expect(requestSignal.aborted).toBe(false);
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    resolveFetch(successfulResponse());
    await expect(flushPromise).resolves.toBe(true);
  });
});
