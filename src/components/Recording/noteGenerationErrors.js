import { NOTE_GENERATION_STREAM_ERROR_SENTINEL } from './recordingConstants';

export const parseLambdaErrorPayload = (payload) => {
  if (typeof payload !== 'string') {
    return null;
  }

  const sentinelIndex = payload.indexOf(NOTE_GENERATION_STREAM_ERROR_SENTINEL);
  if (sentinelIndex >= 0) {
    const sentinelPayload = payload
      .slice(sentinelIndex + NOTE_GENERATION_STREAM_ERROR_SENTINEL.length)
      .trim();
    if (!sentinelPayload) {
      return { message: 'Unknown note generation error' };
    }
    try {
      const parsedSentinelPayload = JSON.parse(sentinelPayload);
      if (parsedSentinelPayload && typeof parsedSentinelPayload === 'object') {
        return parsedSentinelPayload;
      }
      return { message: sentinelPayload };
    } catch (error) {
      return { message: sentinelPayload };
    }
  }

  const trimmedPayload = payload.trim();
  if (!trimmedPayload.startsWith('{') || !trimmedPayload.endsWith('}')) {
    return null;
  }
  try {
    const parsedPayload = JSON.parse(trimmedPayload);
    if (
      parsedPayload &&
      typeof parsedPayload === 'object' &&
      (
        typeof parsedPayload.errorType === 'string' ||
        typeof parsedPayload.errorMessage === 'string' ||
        typeof parsedPayload.message === 'string'
      )
    ) {
      return parsedPayload;
    }
  } catch (error) {
    return null;
  }

  return null;
};
