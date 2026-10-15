import { uploadData } from 'aws-amplify/storage';
import { SQSClient } from '@aws-sdk/client-sqs';
import { getRecordingAuth } from './recordingAuth';
import { createAudioUploadQueue, getNextUploadItem } from './useAudioUploadQueue';

const mockSend = jest.fn();
jest.mock('aws-amplify/storage', () => ({ uploadData: jest.fn() }));
jest.mock('./recordingAuth', () => ({ getRecordingAuth: jest.fn() }));
jest.mock('@aws-sdk/client-sqs', () => ({
  SQSClient: jest.fn(() => ({ send: mockSend, destroy: jest.fn() })),
  SendMessageCommand: class { constructor(input) { this.input = input; } }
}));

const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const flush = async () => { for (let index = 0; index < 100; index++) await Promise.resolve(); };
const tick = async ms => { jest.advanceTimersByTime(ms); await flush(); };
const capture = timestamp => Object.freeze({ userId: 'fictional-owner', timestamp,
  noteSettings: Object.freeze({ examLayout: timestamp === 1, PILayout: false }),
  visitMetadata: Object.freeze({ patientId: `fictional-${timestamp}`, visitType: 'followUp' }) });
const path = (timestamp, order = 0, final = false) => `protected/fictional-owner/${timestamp}_recording_${final ? 'final' : 'chunk'}_${timestamp}_example_rc2_${order}.webm`;
let queues;
const makeQueue = () => {
  const onFinalAudioQueued = jest.fn(); const onStatus = jest.fn();
  const queue = createAudioUploadQueue({ onFinalAudioQueued, onStatus });
  queues.push(queue); return { queue, onFinalAudioQueued, onStatus };
};

beforeEach(() => {
  jest.useFakeTimers(); jest.clearAllMocks(); queues = [];
  SQSClient.mockImplementation(() => ({ send: mockSend, destroy: jest.fn() }));
  jest.spyOn(Math, 'random').mockReturnValue(0.5);
  getRecordingAuth.mockResolvedValue({ credentials: { accessKeyId: 'fictional' }, accessToken: 'fictional-token' });
  uploadData.mockImplementation(() => ({ result: Promise.resolve({ path: 'confirmed' }), cancel: jest.fn() }));
  mockSend.mockResolvedValue({ MessageId: 'fictional-message' });
});
afterEach(async () => { queues.forEach(queue => queue.clear()); await flush(); jest.useRealTimers(); jest.restoreAllMocks(); });

test('ordinary success retains original bytes, path, settings and payload identities through final acknowledgement', async () => {
  const { queue, onFinalAudioQueued } = makeQueue();
  const blob = new Blob(['fictional finalized container']); const frozen = capture(1);
  queue.enqueue(blob, path(1, 0, true), frozen);
  expect(queue.snapshot()[0].audioBlob).toBe(blob);
  await tick(0);
  expect(uploadData).toHaveBeenCalledWith(expect.objectContaining({ data: blob, path: path(1, 0, true) }));
  const message = mockSend.mock.calls[0][0].input;
  expect(JSON.parse(message.MessageBody)).toEqual(expect.objectContaining({
    userId: frozen.userId, timestamp: 1, path: path(1, 0, true), noteSettings: frozen.noteSettings,
    visitMetadata: frozen.visitMetadata, language: 'auto', isFinalAudio: true,
    recordingJobId: '1_example_rc2', chunkId: '1_example_rc2-0', chunkOrder: 0
  }));
  expect(message.MessageGroupId).toBe(frozen.userId);
  expect(onFinalAudioQueued).toHaveBeenCalledTimes(1);
  expect(onFinalAudioQueued).toHaveBeenCalledWith(frozen.userId, 1, frozen);
  expect(queue.snapshot()).toEqual([]);
});

test('advancing progress can last over 120 seconds, then dispatch obtains current auth', async () => {
  const pending = deferred(); const cancel = jest.fn();
  uploadData.mockReturnValue({ result: pending.promise, cancel });
  const { queue } = makeQueue(); queue.enqueue(new Blob(['audio']), path(1), capture(1));
  await tick(0);
  for (let bytes = 1; bytes <= 4; bytes++) {
    await tick(90000);
    uploadData.mock.calls[0][0].options.onProgress({ transferredBytes: bytes });
  }
  expect(cancel).not.toHaveBeenCalled(); expect(mockSend).not.toHaveBeenCalled();
  expect(getRecordingAuth).toHaveBeenCalledTimes(1);
  getRecordingAuth.mockResolvedValue({ credentials: {}, accessToken: 'new-fictional-token' });
  pending.resolve({}); await flush();
  expect(getRecordingAuth).toHaveBeenCalledTimes(2);
  expect(JSON.parse(mockSend.mock.calls[0][0].input.MessageBody).accessToken).toBe('new-fictional-token');
});

test('a genuine stall cancels and waits for settlement before any retry or new worker', async () => {
  const pending = deferred(); const cancel = jest.fn();
  uploadData.mockReturnValueOnce({ result: pending.promise, cancel });
  const { queue } = makeQueue(); queue.enqueue(new Blob(['audio']), path(1), capture(1));
  await tick(0); await tick(120000);
  expect(cancel).toHaveBeenCalledTimes(1);
  for (let index = 0; index < 5; index++) { queue.wake(); queue.retry(); }
  await tick(600000);
  expect(uploadData).toHaveBeenCalledTimes(1); expect(mockSend).not.toHaveBeenCalled();
  pending.reject(Object.assign(new Error('cancelled'), { name: 'CanceledError' })); await flush();
  expect(queue.snapshot()[0].audioBlob.size).toBe(5);
  await tick(499); expect(uploadData).toHaveBeenCalledTimes(1);
  await tick(1); expect(uploadData).toHaveBeenCalledTimes(2);
  expect(mockSend).toHaveBeenCalledTimes(1);
  // Multipart SDK callbacks may arrive after its cancelled result settles.
  uploadData.mock.calls[0][0].options.onProgress({ transferredBytes: 100 });
  await tick(120000);
  expect(cancel).toHaveBeenCalledTimes(1);
});

test.each(['RecordingAuthUnavailable', 'NetworkError'])('%s retains audio and paced retries work without online events', async name => {
  getRecordingAuth.mockRejectedValueOnce(Object.assign(new Error('temporary'), { name }));
  const { queue } = makeQueue(); const blob = new Blob(['audio']);
  queue.enqueue(blob, path(1), capture(1)); await tick(0);
  expect(queue.snapshot()[0].audioBlob).toBe(blob); expect(uploadData).not.toHaveBeenCalled();
  await tick(499); expect(uploadData).not.toHaveBeenCalled();
  await tick(1); expect(uploadData).toHaveBeenCalledTimes(1);
  expect(getRecordingAuth).toHaveBeenCalledWith('fictional-owner', true);
  expect(queue.snapshot()).toEqual([]);
});

test('S3 success plus ambiguous SQS response retries only SQS with identical IDs after five minutes', async () => {
  mockSend.mockRejectedValueOnce(new TypeError('connection lost after acceptance'));
  const { queue, onFinalAudioQueued } = makeQueue();
  const blob = new Blob(['audio']); queue.enqueue(blob, path(1, 2, true), capture(1));
  await tick(0);
  expect(queue.snapshot()[0]).toMatchObject({ stage: 'dispatch-pending', audioBlob: blob });
  expect(onFinalAudioQueued).not.toHaveBeenCalled();
  // Simulate a suspended timer / no online event, beyond FIFO dedup's window.
  jest.setSystemTime(Date.now() + 360000);
  await tick(500);
  expect(uploadData).toHaveBeenCalledTimes(1); expect(mockSend).toHaveBeenCalledTimes(2);
  expect(mockSend.mock.calls[1][0].input).toEqual(mockSend.mock.calls[0][0].input);
  expect(onFinalAudioQueued).toHaveBeenCalledTimes(1);
});

test('dispatch abort waits for settlement and preserves the acknowledged S3 stage', async () => {
  const pending = deferred(); mockSend.mockReturnValueOnce(pending.promise);
  const { queue } = makeQueue(); queue.enqueue(new Blob(['audio']), path(1), capture(1));
  await tick(0); const signal = mockSend.mock.calls[0][1].abortSignal;
  await tick(60000); expect(signal.aborted).toBe(true);
  queue.retry(); queue.wake(); await tick(60000);
  expect(mockSend).toHaveBeenCalledTimes(1);
  pending.reject(Object.assign(new Error('abort'), { name: 'AbortError' })); await flush(); await tick(500);
  expect(uploadData).toHaveBeenCalledTimes(1); expect(mockSend).toHaveBeenCalledTimes(2);
  expect(SQSClient).toHaveBeenCalledWith(expect.objectContaining({ maxAttempts: 1 }));
});

test('repeated wake/retry hints never duplicate an in-flight attempt', async () => {
  const pending = deferred(); uploadData.mockReturnValueOnce({ result: pending.promise, cancel: jest.fn() });
  const { queue } = makeQueue(); queue.enqueue(new Blob(['audio']), path(1), capture(1)); await tick(0);
  for (let index = 0; index < 20; index++) { queue.wake(); queue.retry(); await tick(0); }
  expect(uploadData).toHaveBeenCalledTimes(1);
  pending.resolve({}); await flush(); expect(mockSend).toHaveBeenCalledTimes(1);
});

test('persistent access/validation errors are visible and retained until an explicit retry', async () => {
  uploadData.mockImplementationOnce(() => { throw Object.assign(new Error('denied'), { name: 'AccessDenied' }); });
  const { queue, onStatus } = makeQueue(); queue.enqueue(new Blob(['audio']), path(1), capture(1)); await tick(0);
  expect(queue.snapshot()[0].blocked).toBe(true);
  expect(onStatus).toHaveBeenLastCalledWith(expect.stringContaining('then retry'));
  await tick(600000); expect(uploadData).toHaveBeenCalledTimes(1);
  queue.retry(); await tick(0); expect(queue.snapshot()).toEqual([]);
});

test('regular-before-final ordering belongs to each recording and a newer regular cannot starve A final', async () => {
  const { queue, onFinalAudioQueued } = makeQueue();
  queue.enqueue(new Blob(['A0']), path(1, 0), capture(1));
  queue.enqueue(new Blob(['Af']), path(1, 2, true), capture(1));
  queue.enqueue(new Blob(['A1 delayed']), path(1, 1), capture(1));
  queue.enqueue(new Blob(['B0']), path(2, 0), capture(2));
  await tick(0);
  expect(mockSend.mock.calls.map(([command]) => JSON.parse(command.input.MessageBody).path)).toEqual([
    path(1, 0), path(1, 1), path(1, 2, true), path(2, 0)
  ]);
  expect(onFinalAudioQueued).toHaveBeenCalledTimes(1);
  expect(getNextUploadItem([{ filePath: path(1, 1, true), capture: capture(1) }, { filePath: path(2), capture: capture(2) }]).filePath).toBe(path(1, 1, true));
});

test('discard B preserves pending A, and stale B upload settlement cannot dispatch or complete', async () => {
  const pending = deferred(); const cancel = jest.fn();
  getRecordingAuth.mockRejectedValueOnce(new TypeError('offline A'));
  const { queue, onFinalAudioQueued } = makeQueue();
  queue.enqueue(new Blob(['A']), path(1, 0, true), capture(1)); await tick(0);
  uploadData.mockReturnValueOnce({ result: pending.promise, cancel });
  queue.enqueue(new Blob(['B']), path(2, 0, true), capture(2)); await tick(0);
  queue.clear(2); expect(cancel).toHaveBeenCalledTimes(1);
  expect(queue.snapshot().map(item => item.capture.timestamp)).toEqual([1]);
  queue.retry(); await tick(1000); expect(uploadData).toHaveBeenCalledTimes(1);
  pending.resolve({}); await flush();
  expect(mockSend).toHaveBeenCalledTimes(1);
  expect(JSON.parse(mockSend.mock.calls[0][0].input.MessageBody).timestamp).toBe(1);
  expect(onFinalAudioQueued).toHaveBeenCalledTimes(1);
  expect(onFinalAudioQueued.mock.calls[0][1]).toBe(1);
});

test('owner mismatch discovered after S3 blocks dispatch, then retries submission without re-upload', async () => {
  getRecordingAuth.mockResolvedValueOnce({ credentials: {}, accessToken: 'original-fictional' })
    .mockRejectedValueOnce(Object.assign(new Error('different account'), { name: 'RecordingOwnerMismatch' }));
  const { queue } = makeQueue(); queue.enqueue(new Blob(['audio']), path(1), capture(1)); await tick(0);
  expect(queue.snapshot()[0]).toMatchObject({ stage: 'dispatch-pending', blocked: true });
  expect(mockSend).not.toHaveBeenCalled();
  queue.retry(); await tick(0);
  expect(uploadData).toHaveBeenCalledTimes(1); expect(mockSend).toHaveBeenCalledTimes(1);
});

test('persistent token rejection becomes blocked after fresh-auth retries and retains its Blob', async () => {
  getRecordingAuth.mockRejectedValue(Object.assign(new Error('token rejected'), { name: 'NotAuthorizedException' }));
  const { queue } = makeQueue(); const blob = new Blob(['audio']); queue.enqueue(blob, path(1), capture(1));
  await tick(0); await tick(500); await tick(1000);
  expect(getRecordingAuth).toHaveBeenCalledTimes(3);
  expect(queue.snapshot()[0].blocked).toBe(true); expect(queue.snapshot()[0].audioBlob).toBe(blob);
  await tick(600000); expect(getRecordingAuth).toHaveBeenCalledTimes(3);
});

test('earlier network failures do not turn the first temporary expired token into a persistent block', async () => {
  getRecordingAuth.mockRejectedValueOnce(new TypeError('offline'))
    .mockRejectedValueOnce(new TypeError('offline'))
    .mockRejectedValueOnce(Object.assign(new Error('expired token'), { name: 'ExpiredTokenException' }));
  const { queue } = makeQueue(); queue.enqueue(new Blob(['audio']), path(1), capture(1));
  await tick(0); await tick(500); await tick(1000);
  expect(queue.snapshot()[0].blocked).toBe(false);
  await tick(2000);
  expect(mockSend).toHaveBeenCalledTimes(1); expect(queue.snapshot()).toEqual([]);
});

test('A regular retry holds its final while B can submit during the backoff', async () => {
  uploadData.mockImplementationOnce(() => ({ result: Promise.reject(new TypeError('offline')), cancel: jest.fn() }));
  const { queue, onFinalAudioQueued } = makeQueue();
  queue.enqueue(new Blob(['A0']), path(1, 0), capture(1));
  queue.enqueue(new Blob(['Af']), path(1, 1, true), capture(1));
  queue.enqueue(new Blob(['B0']), path(2, 0), capture(2)); await tick(0);
  expect(mockSend.mock.calls.map(([command]) => JSON.parse(command.input.MessageBody).path)).toEqual([path(2, 0)]);
  expect(onFinalAudioQueued).not.toHaveBeenCalled();
  await tick(500);
  expect(mockSend.mock.calls.map(([command]) => JSON.parse(command.input.MessageBody).path)).toEqual([path(2, 0), path(1, 0), path(1, 1, true)]);
  expect(onFinalAudioQueued).toHaveBeenCalledTimes(1);
});

test('late discarded dispatch acknowledgement cannot invoke its final callback or release another worker early', async () => {
  const pending = deferred(); mockSend.mockReturnValueOnce(pending.promise);
  const { queue, onFinalAudioQueued } = makeQueue();
  queue.enqueue(new Blob(['A']), path(1, 0, true), capture(1)); await tick(0);
  const signal = mockSend.mock.calls[0][1].abortSignal;
  queue.clear(1); expect(signal.aborted).toBe(true);
  queue.enqueue(new Blob(['B']), path(2, 0, true), capture(2)); await tick(0);
  expect(uploadData).toHaveBeenCalledTimes(1);
  pending.resolve({ MessageId: 'ambiguous-old-acceptance' }); await flush();
  expect(uploadData).toHaveBeenCalledTimes(2);
  expect(onFinalAudioQueued).toHaveBeenCalledTimes(1); expect(onFinalAudioQueued.mock.calls[0][1]).toBe(2);
});
