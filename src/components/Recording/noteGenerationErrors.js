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

// A terminal control frame has no delimiter after its JSON body. Keep it until
// JSON is complete (or EOF proves it malformed); never publish its bytes.
export function createNoteGenerationStreamParser() {
  let control = null;
  let finished = false;
  return (chunk, done = false) => {
    if (finished) return { text: '', error: null };
    let text = chunk;
    if (control !== null) { control += chunk; text = ''; }
    else {
      const index = chunk.indexOf('\u0000');
      if (index >= 0) { text = chunk.slice(0, index); control = chunk.slice(index); }
    }
    if (control === null) return { text, error: null };
    let error = null;
    if (control.length <= 16384 && control.startsWith(NOTE_GENERATION_STREAM_ERROR_SENTINEL)) {
      // A second terminal frame can follow a confirmed save's accounting timeout.
      const payload = control.slice(NOTE_GENERATION_STREAM_ERROR_SENTINEL.length)
        .split(NOTE_GENERATION_STREAM_ERROR_SENTINEL)[0].trim();
      try {
        const parsed = JSON.parse(payload);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) error = parsed;
      } catch { /* The next read may finish the JSON. */ }
    }
    if (!error && (done || control.length > 16384)) {
      error = { code: 'STREAM_CONTROL_INVALID', message: 'The saved result could not be confirmed. Refresh the saved record before retrying.' };
    }
    if (error) finished = true;
    return { text, error };
  };
}
