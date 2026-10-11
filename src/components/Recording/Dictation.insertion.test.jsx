import { act, renderHook } from '@testing-library/react';
import Dictation from './Dictation';
import { StreamingTranscriber } from 'assemblyai';
import { applyDictationText, createDictationInsertion } from '../../utils/dictationInsertion';

jest.mock('aws-amplify/auth', () => ({ getCurrentUser: async () => ({ username: 'synthetic' }) }));
jest.mock('aws-amplify/api', () => ({ generateClient: () => ({ graphql: async () => ({ data: { getUserSubscription: { owner: 'synthetic', hoursleft: 2 } } }) }) }));
jest.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => false }, CapacitorHttp: {} }));
jest.mock('./CreditLimit', () => () => null);
jest.mock('nosleep.js', () => class MockNoSleep { enable() {} disable() {} });
jest.mock('assemblyai', () => ({ StreamingTranscriber: jest.fn() }));

beforeEach(() => {
  jest.useFakeTimers();
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ token: 'synthetic-token' }) }));
  URL.createObjectURL = jest.fn(() => 'blob:synthetic'); URL.revokeObjectURL = jest.fn();
  localStorage.setItem('chironote_mic_permission_rationale_shown', 'true');
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: jest.fn(async () => ({ getTracks: () => [{ stop: jest.fn() }] })) } });
  window.AudioContext = jest.fn(() => ({ state: 'running', audioWorklet: { addModule: async () => {} }, createMediaStreamSource: () => ({ connect: jest.fn() }), close: async () => {} }));
  global.AudioWorkletNode = jest.fn(() => ({ connect: jest.fn(), disconnect: jest.fn(), port: { close: jest.fn() } }));
  global.ReadableStream = class { constructor({ start }) { start({ close() {} }); } pipeTo() { return new Promise(() => {}); } };
});
afterEach(() => { jest.clearAllTimers(); jest.useRealTimers(); });

test('native dictation callback path preserves surrounding text through partial revisions and stop', async () => {
  const events = {};
  StreamingTranscriber.mockImplementation(() => ({ on: (name, callback) => { events[name] = callback; }, connect: () => events.open(), close: jest.fn(), stream: jest.fn() }));
  let insertion, current = 'Before selected after';
  const replace = jest.fn(), wholeStream = jest.fn(), stopped = jest.fn();
  const { result, unmount } = renderHook(() => Dictation({ username: 'synthetic', setClipboardContent: replace, onTextStreamUpdate: wholeStream,
    onDictationStart: () => { insertion = createDictationInsertion(current, 7, 15); },
    onDictationTextUpdate: text => { current = applyDictationText(insertion, text).text; }, onDictationStop: stopped }));
  await act(async () => {});
  await act(async () => result.current.startDictation());
  expect(result.current.isTranscribing).toBe(true);
  expect(current).toBe('Before selected after');
  expect(replace).not.toHaveBeenCalled();
  await act(async () => events.turn({ transcript: 'partial', turn_order: 0 }));
  expect(current).toBe('Before partial after');
  await act(async () => events.turn({ transcript: 'revised words', turn_order: 0 }));
  expect(current).toBe('Before revised words after');
  await act(async () => result.current.stopDictation());
  expect(current).toBe('Before revised words after');
  expect(wholeStream).not.toHaveBeenCalled(); expect(stopped).toHaveBeenCalledTimes(1);
  unmount();
});
