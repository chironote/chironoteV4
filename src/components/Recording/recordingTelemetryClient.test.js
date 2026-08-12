import { RecordingTelemetryClient } from './recordingTelemetryClient';

const RECORDING_JOB_ID = '8c458d93-1125-4e28-9cd1-357fc49f3342';
const CLIENT_CONTEXT = {
  appBuild: '1.3.0-test',
  browser: 'chrome',
  platform: 'web',
  source: 'client.web'
};

const successfulResponse = () => ({
  json: async () => ({ data: { event0: { id: 'event-id' } } }),
  ok: true,
  status: 200
});

const createClient = (overrides = {}) => new RecordingTelemetryClient({
  clientContext: CLIENT_CONTEXT,
  endpointResolver: () => 'https://telemetry.example.test/graphql',
  flushDelayMs: 60000,
  getAuthToken: async () => 'id-token',
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

    fetchImpl.mockResolvedValue(successfulResponse());
    await client.flush({ force: true });
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
});
