import {
  createNoteGenerationRequest,
  createTranscriptionMessage,
  getRecordingUpdateMatch,
  isRecordingStatusSchemaCompatibilityError
} from './recordingBackendContract';

const RECORDING_JOB_ID = '8c458d93-1125-4e28-9cd1-357fc49f3342';

describe('recording backend correlation contract', () => {
  test('propagates one job id and schema version into transcription and note requests', () => {
    expect(createTranscriptionMessage({
      accessToken: 'processing-token',
      chunkBytes: 4096,
      chunkOrder: 3,
      contentType: 'audio/webm',
      isFinalAudio: true,
      language: 'auto',
      noteSettings: '{}',
      path: 'protected/user/audio.webm',
      recordingJobId: RECORDING_JOB_ID,
      telemetryContext: {
        appBuild: '1.3.0+test',
        browser: 'chrome',
        platform: 'web'
      },
      timestamp: 1234,
      userId: 'processing-user'
    })).toMatchObject({
      appBuild: '1.3.0+test',
      recordingBrowser: 'chrome',
      recordingJobId: RECORDING_JOB_ID,
      recordingPlatform: 'web',
      telemetrySchemaVersion: '1.0'
    });

    expect(createNoteGenerationRequest({
      accessToken: 'processing-token',
      noteSettings: '{}',
      recordingJobId: RECORDING_JOB_ID,
      telemetryContext: {
        appBuild: '1.3.0+test',
        browser: 'chrome',
        platform: 'web'
      },
      timeStamp: 1234,
      userId: 'processing-user'
    })).toMatchObject({
      appBuild: '1.3.0+test',
      recordingBrowser: 'chrome',
      recordingJobId: RECORDING_JOB_ID,
      recordingPlatform: 'web',
      telemetrySchemaVersion: '1.0'
    });
  });

  test('prefers recordingJobId and never accepts a mismatched job with the same timestamp', () => {
    expect(getRecordingUpdateMatch({
      recordingJobId: RECORDING_JOB_ID,
      timestamp: '1234'
    }, {
      recordingJobId: RECORDING_JOB_ID,
      timestamp: 1234
    })).toBe('recording_job_id');

    expect(getRecordingUpdateMatch({
      recordingJobId: '3b732ac1-1376-4bd6-a1bc-cab3ec611991',
      timestamp: '1234'
    }, {
      recordingJobId: RECORDING_JOB_ID,
      timestamp: 1234
    })).toBeNull();
  });

  test('keeps timestamp matching only as an explicit pre-deployment compatibility path', () => {
    expect(getRecordingUpdateMatch({ timestamp: '1234' }, {
      recordingJobId: RECORDING_JOB_ID,
      timestamp: 1234
    })).toBe('legacy_timestamp');
  });

  test('uses legacy subscription only for missing recording-status schema fields', () => {
    expect(isRecordingStatusSchemaCompatibilityError({
      errors: [{ message: 'Validation error of type FieldUndefined: Field recordingJobId is undefined' }]
    })).toBe(true);
    expect(isRecordingStatusSchemaCompatibilityError(
      new Error('Network connection closed')
    )).toBe(false);
  });
});
