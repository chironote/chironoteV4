import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { TextDecoder } from 'util';
import { uploadData } from 'aws-amplify/storage';
import { SQSClient } from '@aws-sdk/client-sqs';
import NoSleep from 'nosleep.js';
import RecordingManager from './RecordingManager';
import { patientRequest } from '../../services/patientNotes';
import { getUserId, getRecordingAuth } from './recordingAuth';

const mockSend = jest.fn();
const mockObservers = [];
const mockEnable = jest.fn();
const mockDisable = jest.fn();
jest.mock('nosleep.js', () => jest.fn(() => ({ enable: mockEnable, disable: mockDisable })));
jest.mock('aws-amplify/storage', () => ({ uploadData: jest.fn() }));
jest.mock('@aws-sdk/client-sqs', () => ({ SQSClient: jest.fn(() => ({ send: mockSend, destroy: jest.fn() })), SendMessageCommand: class { constructor(input) { this.input = input; } } }));
jest.mock('aws-amplify/api', () => ({ generateClient: () => ({ graphql: () => ({ subscribe: observer => { mockObservers.push(observer); return { unsubscribe: jest.fn() }; } }) }) }));
jest.mock('./recordingAuth', () => ({
  getUserId: jest.fn(() => Promise.resolve('fictional-owner')),
  getRecordingAuth: jest.fn(() => Promise.resolve({ credentials: {}, accessToken: 'fictional-token' }))
}));
jest.mock('../../services/nativePlatform', () => ({ addNativeAppStateListener: () => Promise.resolve(null) }));
jest.mock('../../services/patientNotes', () => ({
  patientNotesEnabled: true,
  captureSnapshot: metadata => Object.freeze({ ...metadata }),
  recordingSettingsSnapshot: () => Object.freeze(JSON.parse(global.localStorage.getItem('noteSettings') || '{}')),
  patientRequest: jest.fn()
}));

let root, manager, props, recorders, originalAgent, originalFetch, originalDecoder;
const flush = async () => { for (let index = 0; index < 30; index++) await Promise.resolve(); };
const tick = async ms => act(async () => { jest.advanceTimersByTime(ms); await flush(); });
const start = async patientId => act(async () => { await manager.startRecording({ patientId, visitType: 'followUp' }); });

beforeEach(async () => {
  jest.useFakeTimers(); jest.setSystemTime(1000); jest.clearAllMocks();
  NoSleep.mockImplementation(() => ({ enable: mockEnable, disable: mockDisable }));
  SQSClient.mockImplementation(() => ({ send: mockSend, destroy: jest.fn() }));
  getUserId.mockResolvedValue('fictional-owner');
  getRecordingAuth.mockResolvedValue({ credentials: {}, accessToken: 'fictional-token' });
  global.IS_REACT_ACT_ENVIRONMENT = true;
  originalAgent = Object.getOwnPropertyDescriptor(navigator, 'userAgent');
  Object.defineProperty(navigator, 'userAgent', { configurable: true, value: 'Android synthetic test' });
  originalFetch = global.fetch; originalDecoder = global.TextDecoder; global.TextDecoder = TextDecoder;
  global.fetch = jest.fn(async () => ({ ok: true, headers: { get: () => 'text/plain' }, body: {
    getReader: () => ({ read: jest.fn().mockResolvedValue({ done: true }), cancel: jest.fn() })
  } }));
  navigator.mediaDevices = { getUserMedia: jest.fn(async () => ({ active: true, getTracks: () => [{ stop: jest.fn() }] })) };
  recorders = []; mockObservers.length = 0;
  global.MediaRecorder = class {
    static isTypeSupported() { return true; }
    constructor() { this.state = 'inactive'; recorders.push(this); }
    start() { this.state = 'recording'; }
    stop() {
      this.state = 'inactive';
      const finish = () => {
        this.ondataavailable?.({ data: new Blob([new Uint8Array(1500)], { type: 'audio/webm' }), target: this });
        this.onstop?.();
      };
      if (this.delayStop) this.finishStop = finish;
      else finish();
    }
  };
  uploadData.mockImplementation(() => ({ result: Promise.resolve({}), cancel: jest.fn() }));
  mockSend.mockResolvedValue({ MessageId: 'fictional' });
  patientRequest.mockImplementation(async (_operation, { timestamp }) => ({ note: { timestamp, note: `Saved fictional ${timestamp}`, ready: true } }));
  props = Object.fromEntries(['onTextStreamUpdate', 'onTransitionToMainApp', 'onSavedNoteReady', 'onGenerationStateChange', 'onGenerationError'].map(name => [name, jest.fn()]));
  root = createRoot(document.createElement('div'));
  const Harness = () => { manager = RecordingManager(props); return null; };
  // Exercise effect replay so the retained queue cannot be disposed by Strict Mode.
  await act(async () => root.render(<React.StrictMode><Harness /></React.StrictMode>));
  mockDisable.mockClear();
});
afterEach(async () => {
  await act(async () => { root.unmount(); await flush(); });
  if (originalAgent) Object.defineProperty(navigator, 'userAgent', originalAgent);
  else delete navigator.userAgent;
  global.fetch = originalFetch; global.TextDecoder = originalDecoder;
  localStorage.clear(); jest.useRealTimers();
});

test.each([false, true])('B captures while A retries and A completes with A identity after discard B = %s', async discardB => {
  jest.spyOn(Math, 'random').mockReturnValue(0.5);
  uploadData.mockImplementationOnce(() => ({ result: Promise.reject(new TypeError('offline')), cancel: jest.fn() }));
  localStorage.setItem('noteSettings', JSON.stringify({ examLayout: true }));
  await start('fictional-A');
  await act(async () => { manager.stopRecording(); await flush(); });
  await tick(0);
  expect(manager.uploadStatus).toContain('pending');
  act(() => manager.continueInBackground());
  localStorage.setItem('noteSettings', JSON.stringify({ examLayout: false }));
  jest.setSystemTime(1001); await start('fictional-B');
  expect(manager.isRecording).toBe(true); expect(recorders[1].state).toBe('recording');
  if (discardB) act(() => manager.discardRecording());
  Object.values(props).forEach(callback => callback.mockClear()); mockDisable.mockClear();
  await tick(500);
  expect(uploadData).toHaveBeenCalledTimes(2);
  const sent = JSON.parse(mockSend.mock.calls[0][0].input.MessageBody);
  expect(sent).toMatchObject({ timestamp: 1000, visitMetadata: { patientId: 'fictional-A' }, noteSettings: { examLayout: true } });
  expect(mockObservers).toHaveLength(1);
  await act(async () => {
    mockObservers[0].next({ data: { onUpdateNotesByOwner: { timestamp: 1000, isCompleted: true } } });
    await flush();
  });
  expect(JSON.parse(global.fetch.mock.calls[0][1].body)).toMatchObject({ timeStamp: 1000, visitMetadata: { patientId: 'fictional-A' }, noteSettings: { examLayout: true } });
  expect(patientRequest).toHaveBeenCalledWith('getSavedNote', { timestamp: '1000' });
  expect(manager.completionStatus).toContain('ready in Recent Notes');
  expect(props.onTextStreamUpdate).not.toHaveBeenCalled();
  expect(props.onSavedNoteReady).not.toHaveBeenCalled();
  expect(props.onTransitionToMainApp).not.toHaveBeenCalled();
  expect(props.onGenerationStateChange).not.toHaveBeenCalled();
  expect(mockDisable).not.toHaveBeenCalled();
  if (!discardB) expect(manager.isRecording).toBe(true);
  jest.restoreAllMocks();
});

test('a queued A final event survives immediate B start with its own timestamp and chunk sequence', async () => {
  await start('fictional-A');
  await act(async () => {
    manager.stopRecording(); // data handling is still queued in a microtask
    jest.setSystemTime(1001);
    await manager.startRecording({ patientId: 'fictional-B' });
    await flush();
  });
  await tick(0);
  const sent = JSON.parse(mockSend.mock.calls[0][0].input.MessageBody);
  expect(sent).toMatchObject({ timestamp: 1000, chunkOrder: 0, visitMetadata: { patientId: 'fictional-A' }, isFinalAudio: true });
  expect(sent.path).toContain('1000_recording_final_'); expect(manager.isRecording).toBe(true);
});

test('ordinary foreground completion still streams/opens the acknowledged saved note exactly once', async () => {
  await start('fictional-A');
  await act(async () => { manager.stopRecording(); await flush(); }); await tick(0);
  await act(async () => {
    const event = { data: { onUpdateNotesByOwner: { timestamp: 1000, isCompleted: true } } };
    mockObservers[0].next(event); mockObservers[0].next(event); await flush();
  });
  expect(global.fetch).toHaveBeenCalledTimes(1);
  expect(props.onSavedNoteReady).toHaveBeenCalledTimes(1);
  expect(props.onTextStreamUpdate).toHaveBeenLastCalledWith('Saved fictional 1000');
});

test('discarded final has no late dispatch, subscription, or wrong-session clipboard callback', async () => {
  let finish;
  const cancel = jest.fn(); uploadData.mockReturnValueOnce({ result: new Promise(resolve => { finish = resolve; }), cancel });
  await start('fictional-A');
  await act(async () => { manager.stopRecording(); await flush(); }); await tick(0);
  act(() => manager.discardRecording());
  jest.setSystemTime(1001); await start('fictional-B');
  await act(async () => { finish({}); await flush(); });
  expect(cancel).toHaveBeenCalledTimes(1);
  expect(mockSend).not.toHaveBeenCalled(); expect(mockObservers).toHaveLength(0);
  expect(props.onTextStreamUpdate).not.toHaveBeenCalled(); expect(manager.isRecording).toBe(true);
});

test('overlapping completion subscriptions keep A separate while B follows its foreground completion path', async () => {
  const random = jest.spyOn(Math, 'random').mockReturnValue(0.5);
  uploadData.mockImplementationOnce(() => ({ result: Promise.reject(new TypeError('offline A')), cancel: jest.fn() }));
  await start('fictional-A');
  await act(async () => { manager.stopRecording(); await flush(); }); await tick(0);
  act(() => manager.continueInBackground());
  jest.setSystemTime(1001); await start('fictional-B');
  await act(async () => { manager.stopRecording(); await flush(); }); await tick(0);
  expect(mockObservers).toHaveLength(1); // B's upload can finish during A's backoff
  await tick(500); expect(mockObservers).toHaveLength(2);
  await act(async () => {
    mockObservers[1].next({ data: { onUpdateNotesByOwner: { timestamp: 1000, isCompleted: true } } });
    await flush();
  });
  expect(manager.isPreparingTranscript).toBe(true);
  expect(props.onSavedNoteReady).not.toHaveBeenCalled();
  await act(async () => {
    mockObservers[0].next({ data: { onUpdateNotesByOwner: { timestamp: 1001, isCompleted: true } } });
    await flush();
  });
  expect(global.fetch.mock.calls.map(([, request]) => JSON.parse(request.body).timeStamp)).toEqual([1000, 1001]);
  expect(props.onSavedNoteReady).toHaveBeenCalledWith(expect.objectContaining({ timestamp: '1001' }));
  expect(props.onTextStreamUpdate).toHaveBeenLastCalledWith('Saved fictional 1001');
  random.mockRestore();
});

test('discard fences a stale transcript subscription and its original fallback timer', async () => {
  await start('fictional-A');
  await act(async () => { manager.stopRecording(); await flush(); }); await tick(0);
  const stale = mockObservers[0];
  act(() => manager.discardRecording());
  jest.setSystemTime(1001); await start('fictional-B');
  Object.values(props).forEach(callback => callback.mockClear());
  await act(async () => {
    stale.next({ data: { onUpdateNotesByOwner: { timestamp: 1000, isCompleted: true } } });
    jest.advanceTimersByTime(45000); await flush();
  });
  expect(global.fetch).not.toHaveBeenCalled(); expect(props.onTextStreamUpdate).not.toHaveBeenCalled();
  expect(manager.isRecording).toBe(true);
});

test('same-clock starts allocate distinct Notes/session keys and discarding B keeps A final', async () => {
  await start('fictional-A');
  await act(async () => { manager.stopRecording(); await flush(); });
  // Start B before the A final's upload worker runs, without advancing Date.now.
  await start('fictional-B');
  expect(manager.isRecording).toBe(true);
  act(() => manager.discardRecording());
  await tick(0);
  expect(mockSend).toHaveBeenCalledTimes(1);
  expect(JSON.parse(mockSend.mock.calls[0][0].input.MessageBody)).toMatchObject({ timestamp: 1000, visitMetadata: { patientId: 'fictional-A' } });
  expect(mockObservers).toHaveLength(1);
  await act(async () => {
    mockObservers[0].next({ data: { onUpdateNotesByOwner: { timestamp: 1000, isCompleted: true } } });
    await flush();
  });
  expect(manager.completionStatus).toContain('ready in Recent Notes');
});

test('B starts before A delayed final data/onstop without dropping A or stopping B', async () => {
  const random = jest.spyOn(Math, 'random').mockReturnValue(0.5);
  await start('fictional-A'); const earlier = recorders[0]; earlier.delayStop = true;
  act(() => manager.stopRecording());
  act(() => manager.continueInBackground());
  await start('fictional-B');
  expect(recorders).toHaveLength(2); expect(recorders[1].state).toBe('recording');
  expect(manager.isRecording).toBe(true);
  await act(async () => { earlier.finishStop(); await flush(); }); await tick(0);
  expect(JSON.parse(mockSend.mock.calls[0][0].input.MessageBody)).toMatchObject({ timestamp: 1000, chunkOrder: 0, visitMetadata: { patientId: 'fictional-A' }, isFinalAudio: true });
  expect(manager.isRecording).toBe(true); expect(recorders[1].state).toBe('recording');
  await act(async () => { manager.stopRecording(); await flush(); }); await tick(0);
  expect(JSON.parse(mockSend.mock.calls[1][0].input.MessageBody)).toMatchObject({ timestamp: 1001, chunkOrder: 0, visitMetadata: { patientId: 'fictional-B' }, isFinalAudio: true });
  expect(JSON.parse(mockSend.mock.calls[1][0].input.MessageBody).recordingJobId).toMatch(/^1001_/);
  random.mockRestore();
});

test('discarding B cannot cancel A active reader or publish its delayed partial over B', async () => {
  let finishRead;
  const reader = { read: jest.fn().mockReturnValueOnce(new Promise(resolve => { finishRead = resolve; })).mockResolvedValue({ done: true }), cancel: jest.fn() };
  global.fetch.mockResolvedValueOnce({ ok: true, headers: { get: () => 'text/plain' }, body: { getReader: () => reader } });
  await start('fictional-A');
  await act(async () => { manager.stopRecording(); await flush(); }); await tick(0);
  act(() => manager.continueInBackground()); await start('fictional-B');
  await act(async () => {
    mockObservers[0].next({ data: { onUpdateNotesByOwner: { timestamp: 1000, isCompleted: true } } });
    await flush();
  });
  expect(reader.read).toHaveBeenCalledTimes(1);
  const signalA = global.fetch.mock.calls[0][1].signal;
  act(() => manager.discardRecording());
  expect(signalA.aborted).toBe(false);
  Object.values(props).forEach(callback => callback.mockClear());
  await act(async () => { finishRead({ done: false, value: new Uint8Array([65]) }); await flush(); });
  expect(patientRequest).toHaveBeenCalledWith('getSavedNote', { timestamp: '1000' });
  expect(manager.completionStatus).toContain('ready in Recent Notes');
  expect(props.onTextStreamUpdate).not.toHaveBeenCalled(); expect(props.onSavedNoteReady).not.toHaveBeenCalled();
});

test('A and B retain independent original transcript fallback deadlines', async () => {
  await start('fictional-A');
  await act(async () => { manager.stopRecording(); await flush(); }); await tick(0);
  act(() => manager.continueInBackground());
  await tick(1000); await start('fictional-B');
  await act(async () => { manager.stopRecording(); await flush(); }); await tick(0);
  await tick(39000);
  expect(global.fetch).toHaveBeenCalledTimes(1);
  expect(JSON.parse(global.fetch.mock.calls[0][1].body).timeStamp).toBe(1000);
  expect(manager.isPreparingTranscript).toBe(true);
  await tick(1000);
  expect(global.fetch).toHaveBeenCalledTimes(2);
  expect(JSON.parse(global.fetch.mock.calls[1][1].body).timeStamp).toBe(2000);
  expect(props.onSavedNoteReady).toHaveBeenCalledWith(expect.objectContaining({ timestamp: '2000' }));
});

test('late A eligibility cancellation clears only A while B continues capturing', async () => {
  let attemptA;
  await act(async () => { attemptA = manager.startRecording({ patientId: 'fictional-A' }); await attemptA; });
  await act(async () => { manager.stopRecording(); await flush(); });
  act(() => manager.continueInBackground());
  await start('fictional-B');
  expect(attemptA.isCurrent()).toBe(false);
  act(() => attemptA.discard());
  await tick(0);
  expect(manager.isRecording).toBe(true); expect(recorders[1].state).toBe('recording');
  expect(mockSend).not.toHaveBeenCalled(); // A's queued final was cancelled, B is still capturing.
  await act(async () => { manager.stopRecording(); await flush(); }); await tick(0);
  expect(JSON.parse(mockSend.mock.calls[0][0].input.MessageBody)).toMatchObject({ timestamp: 1001, visitMetadata: { patientId: 'fictional-B' } });
});
