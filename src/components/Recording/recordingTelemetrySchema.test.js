import {
  RECORDING_TELEMETRY_SCHEMA_VERSION,
  RECORDING_TELEMETRY_EVENT_NAMES,
  TelemetryPrivacyError,
  addRecordingSupportReference,
  createRecordingJobId,
  createRecordingTelemetryEvent,
  sanitizeTelemetryPayload
} from './recordingTelemetrySchema';

const RECORDING_JOB_ID = '8c458d93-1125-4e28-9cd1-357fc49f3342';

describe('recording telemetry schema', () => {
  test('creates an ordered versioned event and ignores safe forward fields', () => {
    const event = createRecordingTelemetryEvent({
      appBuild: '1.3.0+test',
      browser: 'chrome',
      eventName: 'chunk.emitted',
      now: Date.parse('2026-08-12T12:00:00.000Z'),
      payload: {
        chunkBytes: 4096,
        chunkOrder: 2,
        futureSafeField: 'ignored',
        isFinalChunk: false,
        mimeType: 'audio/webm'
      },
      platform: 'web',
      recordingJobId: RECORDING_JOB_ID,
      sequence: 3,
      source: 'client.web'
    });

    expect(event).toMatchObject({
      appBuild: '1.3.0+test',
      chunkBytes: 4096,
      chunkOrder: 2,
      eventName: 'chunk.emitted',
      occurredAt: '2026-08-12T12:00:00.000Z',
      recordingJobId: RECORDING_JOB_ID,
      schemaVersion: RECORDING_TELEMETRY_SCHEMA_VERSION,
      sequence: 3
    });
    expect(event.timelineKey).toContain('#0000000003#');
    expect(event.futureSafeField).toBeUndefined();
    expect(event.expiresAt).toBeGreaterThan(1786536000);
  });

  test('keeps the required cross-service event vocabulary explicit', () => {
    expect(RECORDING_TELEMETRY_EVENT_NAMES).toEqual(expect.arrayContaining([
      'capture.started',
      'signal.summary',
      'chunk.emitted',
      'upload.succeeded',
      'sqs.accepted',
      'transcription.no_speech',
      'note_generation.succeeded',
      'retry.scheduled',
      'alert.triggered',
      'notification.succeeded',
      'quarantine.created',
      'deletion.succeeded',
      'recording.completed',
      'telemetry.delivery_failed'
    ]));
  });

  test.each([
    ['raw audio', { audio: new Blob(['audio']) }],
    ['transcript text', { transcript: 'synthetic clinical text' }],
    ['note text', { note: 'synthetic note text' }],
    ['access token', { accessToken: 'secret-token' }],
    ['credentials', { credentials: { secretAccessKey: 'secret' } }],
    ['person name', { name: 'Synthetic Person' }],
    ['first name', { firstName: 'Synthetic' }],
    ['last name', { lastName: 'Person' }],
    ['email', { contact: 'synthetic@example.test' }],
    ['patient identifier field', { patientId: 'patient-123' }],
    ['patient identifier value', { providerRequestId: 'patient-123' }],
    ['user identifier value', { awsRequestId: 'userId=direct-identifier' }],
    ['recording object path', { providerRequestId: 'protected/direct-user/audio.webm' }]
  ])('rejects %s before serialization', (description, payload) => {
    expect(() => sanitizeTelemetryPayload(payload)).toThrow(TelemetryPrivacyError);
  });

  test('rejects direct device identifiers and keeps only safe applied settings', () => {
    expect(() => sanitizeTelemetryPayload({
      appliedTrackSettings: {
        channelCount: 1,
        deviceId: 'direct-device-id',
        echoCancellation: false
      }
    })).toThrow(TelemetryPrivacyError);

    expect(sanitizeTelemetryPayload({
      appliedTrackSettings: {
        channelCount: 1,
        echoCancellation: false,
        sampleRate: 48000
      }
    })).toEqual({
      appliedTrackSettings: {
        channelCount: 1,
        echoCancellation: false,
        sampleRate: 48000
      }
    });
  });

  test('generates opaque RFC 4122 version 4 job identifiers', () => {
    expect(createRecordingJobId()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });

  test('adds only a validated opaque job id to user-facing failure text', () => {
    expect(addRecordingSupportReference('Please retry.', RECORDING_JOB_ID)).toBe(
      `Please retry.\n\nRecording reference: ${RECORDING_JOB_ID}`
    );
    expect(addRecordingSupportReference('Please retry.', 'patient-123')).toBe('Please retry.');
  });
});
