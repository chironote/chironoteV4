export const RECORDING_TELEMETRY_SCHEMA_VERSION = '1.0';
export const RECORDING_TELEMETRY_RETENTION_DAYS = 30;

export const RECORDING_TELEMETRY_EVENT_NAMES = Object.freeze([
  'capture.requested',
  'capture.started',
  'capture.settings_applied',
  'capture.paused',
  'capture.resumed',
  'capture.stopped',
  'capture.failed',
  'signal.summary',
  'chunk.emitted',
  'chunk.rejected',
  'upload.started',
  'upload.succeeded',
  'upload.failed',
  'sqs.accepted',
  'sqs.failed',
  'transcription.wait_started',
  'transcription.completed',
  'transcription.no_speech',
  'transcription.failed',
  'note_generation.started',
  'note_generation.succeeded',
  'note_generation.failed',
  'retry.scheduled',
  'alert.triggered',
  'alert.failed',
  'notification.succeeded',
  'notification.failed',
  'quarantine.created',
  'quarantine.failed',
  'deletion.succeeded',
  'deletion.failed',
  'recording.discarded',
  'recording.completed',
  'recording.failed',
  'telemetry.delivery_failed',
  'telemetry.buffer_overflow'
]);

export const RECORDING_TERMINAL_EVENT_NAMES = Object.freeze([
  'recording.discarded',
  'recording.completed',
  'recording.failed'
]);

const EVENT_NAME_SET = new Set(RECORDING_TELEMETRY_EVENT_NAMES);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SAFE_CODE_PATTERN = /^[a-z0-9][a-z0-9._:-]{0,127}$/i;
const SAFE_ID_PATTERN = /^[a-z0-9][a-z0-9._:/=+-]{0,255}$/i;
const SAFE_BUILD_PATTERN = /^[a-z0-9][a-z0-9._+-]{0,63}$/i;
const SAFE_MIME_PATTERN = /^(audio|video)\/[a-z0-9.+-]+(?:;\s*codecs="?[a-z0-9., _-]+"?)?$/i;
const DEVICE_HASH_PATTERN = /^[a-f0-9]{16,64}$/i;

const INTEGER_FIELDS = new Set([
  'attempt',
  'chunkBytes',
  'chunkOrder',
  'deliveryAttempt',
  'droppedEventCount',
  'durationMs',
  'httpStatus',
  'observedDurationMs',
  'queueDepth',
  'retryDelayMs',
  'sampleCount',
  'signalDurationMs'
]);

const FLOAT_FIELDS = new Set([
  'peak',
  'rmsAverage'
]);

const BOOLEAN_FIELDS = new Set([
  'isFinalChunk',
  'noSpeech',
  'transcriptFallback'
]);

const CODE_FIELDS = new Set([
  'alertCode',
  'container',
  'errorCode',
  'notificationChannel',
  'outcome',
  'provider',
  'reasonCode',
  'transcriptMatchedBy'
]);

const ID_FIELDS = new Set([
  'awsRequestId',
  'providerRequestId',
  's3RequestId',
  'sqsMessageId'
]);

const ALLOWED_PAYLOAD_FIELDS = new Set([
  ...INTEGER_FIELDS,
  ...FLOAT_FIELDS,
  ...BOOLEAN_FIELDS,
  ...CODE_FIELDS,
  ...ID_FIELDS,
  'appliedTrackSettings',
  'deviceHash',
  'deviceType',
  'mimeType',
  'producerVersion',
  'requestedTrackSettings'
]);

const SAFE_TRACK_SETTING_FIELDS = Object.freeze([
  'autoGainControl',
  'channelCount',
  'echoCancellation',
  'latency',
  'noiseSuppression',
  'sampleRate',
  'sampleSize',
  'volume'
]);

const FORBIDDEN_KEY_FRAGMENTS = [
  'accesskey',
  'authorization',
  'credential',
  'email',
  'patient',
  'password',
  'privatekey',
  'refreshtoken',
  'secret',
  'sessiontoken',
  'transcript'
];

const FORBIDDEN_KEYS = new Set([
  'audio',
  'accesstoken',
  'audiodata',
  'audioblob',
  'blob',
  'clinicaltext',
  'cognitousername',
  'firstname',
  'fullname',
  'idtoken',
  'lastname',
  'name',
  'note',
  'noteinput',
  'notesettings',
  'notetext',
  'owner',
  'rawaudio',
  'token',
  'userid',
  'username'
]);

const SENSITIVE_STRING_PATTERNS = [
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  /\bBearer\s+\S+/i,
  /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i,
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/,
  /(?:access_token|id_token|refresh_token|x-amz-credential)=/i,
  /\bpatient(?:id|identifier)?[-_:=/][a-z0-9]/i,
  /\b(?:owner|user)(?:id|identifier)[-_:=/][a-z0-9]/i,
  /\b(?:private|protected|public)\/[a-z0-9][^\s]*/i
];

export class TelemetryPrivacyError extends Error {
  constructor(code) {
    super(`Recording telemetry rejected: ${code}`);
    this.name = 'TelemetryPrivacyError';
    this.code = code;
  }
}

export class TelemetryValidationError extends Error {
  constructor(code) {
    super(`Recording telemetry invalid: ${code}`);
    this.name = 'TelemetryValidationError';
    this.code = code;
  }
}

const normalizeKey = (key) => key.replace(/[^a-z0-9]/gi, '').toLowerCase();

const isRawBinary = (value) => {
  if (typeof Blob !== 'undefined' && value instanceof Blob) {
    return true;
  }
  if (typeof ArrayBuffer !== 'undefined') {
    if (value instanceof ArrayBuffer || ArrayBuffer.isView(value)) {
      return true;
    }
  }
  return typeof AudioBuffer !== 'undefined' && value instanceof AudioBuffer;
};

const isSensitiveKey = (key) => {
  const normalizedKey = normalizeKey(key);
  if (FORBIDDEN_KEYS.has(normalizedKey)) {
    return true;
  }
  if (normalizedKey === 'deviceid' || normalizedKey === 'groupid') {
    return true;
  }
  return FORBIDDEN_KEY_FRAGMENTS.some(fragment => normalizedKey.includes(fragment));
};

export const assertTelemetryPrivacySafe = (value, path = 'payload', seen = new WeakSet()) => {
  if (value === null || value === undefined) {
    return;
  }

  if (isRawBinary(value)) {
    throw new TelemetryPrivacyError(`raw_binary_at_${path}`);
  }

  if (typeof value === 'string') {
    if (SENSITIVE_STRING_PATTERNS.some(pattern => pattern.test(value))) {
      throw new TelemetryPrivacyError(`sensitive_string_at_${path}`);
    }
    return;
  }

  if (typeof value !== 'object') {
    return;
  }

  if (seen.has(value)) {
    throw new TelemetryPrivacyError(`cyclic_value_at_${path}`);
  }
  seen.add(value);

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      assertTelemetryPrivacySafe(item, `${path}_${index}`, seen);
    });
    return;
  }

  Object.entries(value).forEach(([key, nestedValue]) => {
    if (!ALLOWED_PAYLOAD_FIELDS.has(key) && isSensitiveKey(key)) {
      throw new TelemetryPrivacyError(`forbidden_field_${normalizeKey(key)}`);
    }
    assertTelemetryPrivacySafe(nestedValue, `${path}_${normalizeKey(key)}`, seen);
  });
};

const sanitizeInteger = (value, field) => {
  if (!Number.isInteger(value) || value < 0 || value > 2147483647) {
    throw new TelemetryValidationError(`invalid_${field}`);
  }
  return value;
};

const sanitizeFloat = (value, field) => {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new TelemetryValidationError(`invalid_${field}`);
  }
  return Number(value.toFixed(6));
};

const sanitizeString = (value, field, pattern, maxLength) => {
  if (typeof value !== 'string' || value.length === 0 || value.length > maxLength || !pattern.test(value)) {
    throw new TelemetryValidationError(`invalid_${field}`);
  }
  return value;
};

export const sanitizeTrackSettings = (settings = {}) => {
  const sanitized = {};

  SAFE_TRACK_SETTING_FIELDS.forEach((field) => {
    const value = settings?.[field];
    if (typeof value === 'boolean') {
      sanitized[field] = value;
    } else if (Number.isFinite(value) && value >= 0) {
      sanitized[field] = Number(value.toFixed(6));
    }
  });

  return sanitized;
};

export const sanitizeTelemetryPayload = (payload = {}) => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new TelemetryValidationError('payload_must_be_object');
  }

  assertTelemetryPrivacySafe(payload);
  const sanitized = {};

  Object.entries(payload).forEach(([field, value]) => {
    if (!ALLOWED_PAYLOAD_FIELDS.has(field) || value === null || value === undefined) {
      return;
    }

    if (INTEGER_FIELDS.has(field)) {
      sanitized[field] = sanitizeInteger(value, field);
    } else if (FLOAT_FIELDS.has(field)) {
      sanitized[field] = sanitizeFloat(value, field);
    } else if (BOOLEAN_FIELDS.has(field)) {
      if (typeof value !== 'boolean') {
        throw new TelemetryValidationError(`invalid_${field}`);
      }
      sanitized[field] = value;
    } else if (CODE_FIELDS.has(field)) {
      sanitized[field] = sanitizeString(value, field, SAFE_CODE_PATTERN, 128).toLowerCase();
    } else if (ID_FIELDS.has(field)) {
      sanitized[field] = sanitizeString(value, field, SAFE_ID_PATTERN, 256);
    } else if (field === 'mimeType') {
      sanitized[field] = sanitizeString(value, field, SAFE_MIME_PATTERN, 128).toLowerCase();
    } else if (field === 'deviceHash') {
      sanitized[field] = sanitizeString(value, field, DEVICE_HASH_PATTERN, 64).toLowerCase();
    } else if (field === 'producerVersion') {
      sanitized[field] = sanitizeString(value, field, SAFE_BUILD_PATTERN, 64);
    } else if (field === 'deviceType') {
      sanitized[field] = sanitizeString(value, field, SAFE_CODE_PATTERN, 64).toLowerCase();
    } else if (field === 'requestedTrackSettings' || field === 'appliedTrackSettings') {
      sanitized[field] = sanitizeTrackSettings(value);
    }
  });

  return sanitized;
};

const getCryptoObject = () => {
  if (typeof window !== 'undefined' && window.crypto) {
    return window.crypto;
  }
  return null;
};

const createUuid = () => {
  const cryptoObject = getCryptoObject();
  if (typeof cryptoObject?.randomUUID === 'function') {
    return cryptoObject.randomUUID();
  }

  const bytes = new Uint8Array(16);
  if (typeof cryptoObject?.getRandomValues === 'function') {
    cryptoObject.getRandomValues(bytes);
  } else {
    throw new TelemetryValidationError('secure_random_unavailable');
  }

  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

export const createRecordingJobId = () => createUuid();

export const addRecordingSupportReference = (message, recordingJobId) => (
  typeof message === 'string' && UUID_PATTERN.test(recordingJobId || '')
    ? `${message}\n\nRecording reference: ${recordingJobId}`
    : message
);

export const toSafeErrorCode = (error, fallback = 'unknown_error') => {
  const candidate = typeof error?.code === 'string'
    ? error.code
    : (
      typeof error?.name === 'string' && error.name !== 'Error'
        ? error.name
        : fallback
    );
  const normalized = candidate
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[^a-z0-9._:-]+/gi, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
  return SAFE_CODE_PATTERN.test(normalized) ? normalized : 'unknown_error';
};

export const createRecordingTelemetryEvent = ({
  appBuild,
  browser,
  eventName,
  now = Date.now(),
  payload = {},
  platform,
  recordingJobId,
  sequence,
  source
}) => {
  if (!UUID_PATTERN.test(recordingJobId || '')) {
    throw new TelemetryValidationError('invalid_recording_job_id');
  }
  if (!EVENT_NAME_SET.has(eventName)) {
    throw new TelemetryValidationError('unknown_event_name');
  }
  if (!Number.isInteger(sequence) || sequence < 1 || sequence > 2147483647) {
    throw new TelemetryValidationError('invalid_sequence');
  }

  const occurredAt = new Date(now).toISOString();
  const eventId = createUuid();
  const expiresAt = Math.floor(new Date(occurredAt).getTime() / 1000) + (
    RECORDING_TELEMETRY_RETENTION_DAYS * 24 * 60 * 60
  );

  return {
    id: eventId,
    recordingJobId,
    timelineKey: `${occurredAt}#${sequence.toString().padStart(10, '0')}#${eventId}`,
    occurredAt,
    expiresAt,
    sequence,
    schemaVersion: RECORDING_TELEMETRY_SCHEMA_VERSION,
    appBuild: sanitizeString(appBuild, 'appBuild', SAFE_BUILD_PATTERN, 64),
    source: sanitizeString(source, 'source', SAFE_CODE_PATTERN, 128).toLowerCase(),
    platform: sanitizeString(platform, 'platform', SAFE_CODE_PATTERN, 64).toLowerCase(),
    browser: sanitizeString(browser, 'browser', SAFE_CODE_PATTERN, 64).toLowerCase(),
    eventName,
    ...sanitizeTelemetryPayload(payload)
  };
};

export const isRecordingTerminalEvent = (eventName) => (
  RECORDING_TERMINAL_EVENT_NAMES.includes(eventName)
);
