import { RECORDING_TELEMETRY_SCHEMA_VERSION } from './recordingTelemetrySchema';

export const ON_UPDATE_NOTES_BY_OWNER_WITH_RECORDING_STATUS = /* GraphQL */ `
  subscription OnUpdateNotesByOwnerWithRecordingStatus($owner: String!) {
    onUpdateNotesByOwner(owner: $owner) {
      owner
      timestamp
      recordingJobId
      recordingStatus
      recordingErrorCode
      transcriptionProvider
      transcriptionRequestId
      transcriptionAttempt
      transcript
      isCompleted
      __typename
    }
  }
`;

export const createTranscriptionMessage = ({
  accessToken,
  chunkBytes,
  chunkOrder,
  contentType,
  isFinalAudio,
  language,
  noteSettings,
  path,
  recordingJobId,
  telemetryContext = {},
  timestamp,
  userId
}) => ({
  userId,
  recordingJobId,
  telemetrySchemaVersion: RECORDING_TELEMETRY_SCHEMA_VERSION,
  appBuild: telemetryContext.appBuild,
  recordingBrowser: telemetryContext.browser,
  recordingPlatform: telemetryContext.platform,
  timestamp,
  path,
  chunkBytes,
  chunkOrder,
  contentType,
  language,
  isFinalAudio,
  accessToken,
  noteSettings
});

export const createNoteGenerationRequest = ({
  accessToken,
  noteSettings,
  recordingJobId,
  telemetryContext = {},
  timeStamp,
  userId
}) => ({
  userId,
  timeStamp,
  recordingJobId,
  telemetrySchemaVersion: RECORDING_TELEMETRY_SCHEMA_VERSION,
  appBuild: telemetryContext.appBuild,
  recordingBrowser: telemetryContext.browser,
  recordingPlatform: telemetryContext.platform,
  accessToken,
  noteSettings
});

export const getRecordingUpdateMatch = (
  updatedNote,
  { recordingJobId, timestamp }
) => {
  const hasBackendJobId = typeof updatedNote?.recordingJobId === 'string' &&
    updatedNote.recordingJobId.length > 0;

  if (hasBackendJobId) {
    return updatedNote.recordingJobId === recordingJobId
      ? 'recording_job_id'
      : null;
  }

  return updatedNote?.timestamp?.toString() === timestamp?.toString()
    ? 'legacy_timestamp'
    : null;
};

const RECORDING_STATUS_FIELD_PATTERN = /(?:recordingJobId|recordingStatus|recordingErrorCode|transcriptionProvider|transcriptionRequestId|transcriptionAttempt)/i;
const GRAPHQL_FIELD_ERROR_PATTERN = /(?:cannot query field|fieldundefined|validation error)/i;

export const isRecordingStatusSchemaCompatibilityError = (error) => {
  const candidates = Array.isArray(error)
    ? error
    : [error, ...(Array.isArray(error?.errors) ? error.errors : [])];

  return candidates.some((candidate) => {
    const message = typeof candidate === 'string' ? candidate : candidate?.message;
    return typeof message === 'string' &&
      GRAPHQL_FIELD_ERROR_PATTERN.test(message) &&
      RECORDING_STATUS_FIELD_PATTERN.test(message);
  });
};
