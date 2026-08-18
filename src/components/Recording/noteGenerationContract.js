export const NOTE_GENERATION_URL = 'https://rmg4v7tjipa3lb5e5jkyjyc3ri0vdqmn.lambda-url.us-east-2.on.aws/';

export function createNoteGenerationRequest({ accessToken, noteSettings, signal, timeStamp, userId }) {
  return {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    signal,
    body: JSON.stringify({
      userId,
      timeStamp,
      accessToken,
      noteSettings
    })
  };
}

export async function readNoteGenerationStream(response, onChunk) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');

  while (true) {
    const chunk = await reader.read();
    if (chunk.done) {
      break;
    }

    const text = decoder.decode(chunk.value, { stream: true });
    if (text) {
      onChunk(text);
    }
  }

  const trailingText = decoder.decode();
  if (trailingText) {
    onChunk(trailingText);
  }
}
