import { TextDecoder } from 'util';
import { retrySavedGeneration } from './patientNotes';
const mockGraphql = jest.fn();
jest.mock('aws-amplify/api', () => ({ generateClient: () => ({ graphql: (...args) => mockGraphql(...args) }) }));
jest.mock('aws-amplify/auth', () => ({ fetchAuthSession: async () => ({ tokens: { accessToken: { toString: () => 'synthetic-token', payload: { sub: 'synthetic-owner' } } } }) }));
const input = { owner: 'synthetic-owner', timestamp: '123', version: 'saved-revision' };
const saved = { ...input, note: 'Synthetic authoritative body', ready: true };
let reader;
function stream(parts) {
  reader = { read: jest.fn(), cancel: jest.fn().mockResolvedValue() };
  parts.forEach(part => reader.read.mockResolvedValueOnce({ value: new Uint8Array(Buffer.from(part)), done: false }));
  reader.read.mockResolvedValue({ done: true });
  global.fetch = jest.fn().mockResolvedValue({ ok: true, body: { getReader: () => reader } });
}
beforeEach(() => {
  global.TextDecoder = TextDecoder; mockGraphql.mockReset();
  mockGraphql.mockResolvedValue({ data: { getSavedNote: JSON.stringify({ ok: true, note: saved }) } });
});
test('recovered split control fetches the exact saved body/version, including an already known version', async () => {
  stream(['Synthetic preview', '\u0000ERR', 'OR:{"code":"NOTE_', 'RECOVERED","message":"Saved"}']);
  expect(await retrySavedGeneration(input)).toEqual(saved);
  expect(JSON.parse(mockGraphql.mock.calls[0][0].variables.input)).toEqual({ timestamp: '123' });
});
test.each(['\u0000ERROR:{"code":"CONFLICT","message":"Changed"}', '\u0000ERROR:{"code":"NOTE_REC'])('genuine or incomplete errors cannot claim success: %j', frame => {
  stream(['Synthetic preview', frame]);
  return expect(retrySavedGeneration(input)).rejects.toThrow('could not be confirmed');
});
test.each([{ ...saved, ready: false }, { ...saved, timestamp: 'different' }, { ...saved, version: null }])('recovery requires a complete matching saved record', async note => {
  stream(['\u0000ERROR:{"code":"NOTE_RECOVERED","message":"Saved"}']);
  mockGraphql.mockResolvedValue({ data: { getSavedNote: JSON.stringify({ ok: true, note }) } });
  await expect(retrySavedGeneration(input)).rejects.toThrow();
});
test('ordinary successful retry requires its new saved revision', async () => {
  stream(['Synthetic completed body']);
  mockGraphql.mockResolvedValue({ data: { getSavedNote: JSON.stringify({ ok: true, note: { ...saved, version: 'new-revision' } }) } });
  expect((await retrySavedGeneration(input)).version).toBe('new-revision');
});
test('an interrupted stream preserves the failure and does not read a saved record', async () => {
  stream([]); reader.read.mockRejectedValue(new TypeError('Synthetic interrupted connection'));
  await expect(retrySavedGeneration(input)).rejects.toThrow('interrupted');
  expect(mockGraphql).not.toHaveBeenCalled();
});

test.each(['rejected', 'pending'])('transport cancellation %s cannot hide verified recovery', async mode => {
  stream(['\u0000ERROR:{"code":"NOTE_RECOVERED","message":"Saved"}']);
  reader.cancel.mockImplementation(() => mode === 'rejected' ? Promise.reject(new Error('Synthetic closed transport')) : new Promise(() => {}));
  expect(await retrySavedGeneration(input)).toEqual(saved);
});
