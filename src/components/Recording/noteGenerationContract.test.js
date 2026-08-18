import { TextDecoder } from 'util';
import {
  NOTE_GENERATION_URL,
  createNoteGenerationRequest,
  readNoteGenerationStream
} from './noteGenerationContract';

global.TextDecoder = TextDecoder;

test('uses transcriptToNoteV2 with the installed-client request body', () => {
  const signal = new AbortController().signal;
  const request = createNoteGenerationRequest({
    accessToken: 'synthetic-token',
    noteSettings: '{"examLayout":true}',
    signal,
    timeStamp: 'synthetic-time',
    userId: 'synthetic-user'
  });

  expect(NOTE_GENERATION_URL).toBe(
    'https://rmg4v7tjipa3lb5e5jkyjyc3ri0vdqmn.lambda-url.us-east-2.on.aws/'
  );
  expect(request).toEqual({
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({
      userId: 'synthetic-user',
      timeStamp: 'synthetic-time',
      accessToken: 'synthetic-token',
      noteSettings: '{"examLayout":true}'
    })
  });
});

test('forwards decoded response-stream chunks in order', async () => {
  const encode = (text) => Uint8Array.from(text, (character) => character.charCodeAt(0));
  const chunks = [
    { done: false, value: encode('Subjective: synthetic') },
    { done: false, value: encode('\n\nObjective: synthetic') },
    { done: true }
  ];
  const response = {
    body: {
      getReader: () => ({ read: jest.fn(async () => chunks.shift()) })
    }
  };
  const received = [];

  await readNoteGenerationStream(response, (text) => received.push(text));

  expect(received.join('')).toBe(
    'Subjective: synthetic\n\nObjective: synthetic'
  );
});
