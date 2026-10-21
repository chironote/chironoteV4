import React, { act } from 'react';
import { render } from '@testing-library/react';
import useNoteGeneration from './useNoteGeneration';
import { getUserId, generateToken } from './recordingAuth';
import { patientRequest } from '../../services/patientNotes';

const mockGraphql = jest.fn();
jest.mock('aws-amplify/api', () => ({ generateClient: () => ({ graphql: (...args) => mockGraphql(...args) }) }));
jest.mock('./recordingAuth', () => ({ getUserId: jest.fn(), generateToken: jest.fn() }));
jest.mock('../../services/patientNotes', () => ({ patientNotesEnabled: true, patientRequest: jest.fn() }));

function Harness({ api, options }) { api.current = useNoteGeneration(options); return null; }
const capture = (generation, timestamp) => Object.freeze({
  generation, timestamp, userId: 'fictional-owner',
  noteSettings: { examLayout: generation === 1, PILayout: generation !== 1 },
  visitMetadata: { patientId: `fictional-${generation}`, visitType: 'followUp' },
});
const settle = async () => act(async () => { for (let i = 0; i < 30; i++) await Promise.resolve(); });

describe('recording-owned note completion', () => {
  let subscriptions, options, api, current, wakeOwner, view;
  beforeEach(() => {
    jest.useFakeTimers();
    subscriptions = [];
    mockGraphql.mockImplementation(() => ({ subscribe: observer => {
      const unsubscribe = jest.fn(); subscriptions.push({ observer, unsubscribe }); return { unsubscribe };
    } }));
    getUserId.mockResolvedValue('fictional-owner');
    generateToken.mockResolvedValue('fictional-token');
    patientRequest.mockImplementation(async (action, { timestamp }) => ({ note: { ready: true, timestamp, version: `revision-${timestamp}`, note: `saved ${timestamp}` } }));
    global.fetch = jest.fn(async () => ({ ok: true, headers: { get: () => 'text/plain' }, body: {
      getReader: () => ({ read: async () => ({ done: true }), cancel: jest.fn() }),
    } }));
    current = 1;
    wakeOwner = 1;
    options = {
      isCurrentCapture: item => item.generation === current,
      noSleepRef: { current: { disable: jest.fn() } },
      setTextStream: jest.fn(), setIsPreparingTranscript: jest.fn(),
      setIsGeneratingSummary: jest.fn(), setIsTranscriptCompleted: jest.fn(),
      onTextStreamUpdate: jest.fn(), onTransitionToMainApp: jest.fn(),
      onGenerationStateChange: jest.fn(), onGenerationError: jest.fn(), onSavedNoteReady: jest.fn(),
      onBackgroundGenerationError: jest.fn(),
      releaseNoSleep: item => {
        if (wakeOwner === item.generation) {
          wakeOwner = null;
          options.noSleepRef.current.disable();
        }
      },
    };
    api = { current: null };
    view = render(<Harness api={api} options={options} />);
  });
  afterEach(() => { api.current.cleanupNoteGeneration(); view.unmount(); jest.clearAllTimers(); jest.useRealTimers(); });
  const completed = (index, timestamp) => subscriptions[index].observer.next({ data: {
    onUpdateNotesByOwner: { timestamp, isCompleted: true },
  } });

  it('finishes A using A timestamp/settings/visit while B owns the UI, then completes B normally', async () => {
    const a = capture(1, 111), b = capture(2, 222);
    api.current.subscribeToNoteCompletion(a.userId, a.timestamp, a);
    current = 2;
    wakeOwner = 2;
    api.current.subscribeToNoteCompletion(b.userId, b.timestamp, b);
    act(() => completed(0, 111)); await settle();
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({
      userId: a.userId, timeStamp: 111, accessToken: 'fictional-token', noteSettings: a.noteSettings, visitMetadata: a.visitMetadata,
    });
    expect(patientRequest).toHaveBeenCalledWith('getSavedNote', { timestamp: '111' });
    expect(options.onSavedNoteReady).toHaveBeenCalledWith(expect.objectContaining({ timestamp: '111' }), { isCurrent: false });
    expect(options.onTextStreamUpdate).not.toHaveBeenCalled();
    expect(options.onTransitionToMainApp).not.toHaveBeenCalled();
    expect(options.onGenerationStateChange).not.toHaveBeenCalled();
    expect(options.noSleepRef.current.disable).not.toHaveBeenCalled();
    act(() => { completed(0, 111); completed(1, 222); }); await settle();
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(JSON.parse(fetch.mock.calls[1][1].body).timeStamp).toBe(222);
    expect(options.onTextStreamUpdate).toHaveBeenLastCalledWith('saved 222');
    expect(options.onSavedNoteReady).toHaveBeenLastCalledWith(expect.objectContaining({ timestamp: '222' }), { isCurrent: true });
  });

  it('discarding B keeps A subscription, but late B callbacks cannot fetch or publish', async () => {
    const a = capture(1, 111), b = capture(2, 222);
    api.current.subscribeToNoteCompletion(a.userId, a.timestamp, a);
    current = 2;
    api.current.subscribeToNoteCompletion(b.userId, b.timestamp, b);
    api.current.cleanupNoteGeneration(2);
    expect(subscriptions[0].unsubscribe).not.toHaveBeenCalled();
    expect(subscriptions[1].unsubscribe).toHaveBeenCalledTimes(1);
    act(() => { completed(1, 222); completed(0, 111); }); await settle();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetch.mock.calls[0][1].body).timeStamp).toBe(111);
    expect(options.onSavedNoteReady).toHaveBeenCalledWith(expect.objectContaining({ timestamp: '111' }), { isCurrent: false });
    expect(options.onTextStreamUpdate).not.toHaveBeenCalled();
  });

  it('keeps the established 40 second transcript fallback separately for each recording', async () => {
    const a = capture(1, 111), b = capture(2, 222);
    api.current.subscribeToNoteCompletion(a.userId, a.timestamp, a);
    act(() => jest.advanceTimersByTime(20000));
    current = 2;
    api.current.subscribeToNoteCompletion(b.userId, b.timestamp, b);
    act(() => jest.advanceTimersByTime(20000)); await settle();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetch.mock.calls[0][1].body).timeStamp).toBe(111);
    expect(subscriptions[1].unsubscribe).not.toHaveBeenCalled();
    act(() => jest.advanceTimersByTime(20000)); await settle();
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(JSON.parse(fetch.mock.calls[1][1].body).timeStamp).toBe(222);
  });

  it('does not generate A under a different authenticated owner', async () => {
    const a = capture(1, 111);
    api.current.subscribeToNoteCompletion(a.userId, a.timestamp, a);
    getUserId.mockResolvedValue('different-owner');
    act(() => completed(0, 111)); await settle();
    expect(fetch).not.toHaveBeenCalled();
    expect(options.onGenerationError).toHaveBeenCalled();
    expect(options.onSavedNoteReady).not.toHaveBeenCalled();
  });

  it('uses the existing fallback once when subscription setup throws synchronously', async () => {
    const a = capture(1, 111);
    mockGraphql.mockImplementationOnce(() => { throw new TypeError('network changed'); });
    expect(() => api.current.subscribeToNoteCompletion(a.userId, a.timestamp, a)).not.toThrow();
    await settle();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetch.mock.calls[0][1].body).timeStamp).toBe(111);
    act(() => jest.advanceTimersByTime(40000)); await settle();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(options.onSavedNoteReady).toHaveBeenCalledTimes(1);
  });

  it('reports an earlier generation failure without changing B preview or controls', async () => {
    const a = capture(1, 111);
    api.current.subscribeToNoteCompletion(a.userId, a.timestamp, a);
    current = 2;
    fetch.mockRejectedValueOnce(new TypeError('connection unavailable'));
    act(() => completed(0, 111)); await settle();
    expect(options.onBackgroundGenerationError).toHaveBeenCalledTimes(1);
    expect(options.onGenerationError).not.toHaveBeenCalled();
    expect(options.onTextStreamUpdate).not.toHaveBeenCalled();
    expect(options.onTransitionToMainApp).not.toHaveBeenCalled();
  });

  it.each([null, 2])('releases A wake lease after detaching or failing to start B (visible %s)', async visible => {
    const a = capture(1, 111);
    api.current.subscribeToNoteCompletion(a.userId, a.timestamp, a);
    current = visible;
    // B has not enabled NoSleep, so its attempted presentation cannot take
    // A's wake lease. This is independent from clipboard visibility.
    act(() => completed(0, 111)); await settle();
    expect(options.noSleepRef.current.disable).toHaveBeenCalledTimes(1);
    expect(options.onTextStreamUpdate).not.toHaveBeenCalled();
    expect(options.onTransitionToMainApp).not.toHaveBeenCalled();
  });
  it.each(['foreground','background','conflict','interrupted'])('split recovery preserves capture ownership: %s', async mode => {
    const read=jest.fn(); const parts=['Synthetic preview','\u0000ERR','OR:{"code":"'+(mode==='conflict'?'CONFLICT':'NOTE_RECOVERED')+'","message":"Synthetic"}'];
    (mode==='interrupted'?parts.slice(0,1):parts).forEach(part=>read.mockResolvedValueOnce({done:false,value:new TextEncoder().encode(part)}));
    if(mode==='interrupted')read.mockRejectedValue(new TypeError('Synthetic disconnect'));else read.mockResolvedValue({done:true});
    fetch.mockResolvedValue({ok:true,headers:{get:()=> 'text/plain'},body:{getReader:()=>({read,cancel:jest.fn()})}});
    const a=capture(1,111);api.current.subscribeToNoteCompletion(a.userId,a.timestamp,a);
    if(mode==='background')current=2;
    act(()=>completed(0,111));await settle();
    if(['foreground','background'].includes(mode))expect(options.onSavedNoteReady).toHaveBeenCalledWith(expect.objectContaining({timestamp:'111',version:'revision-111'}),{isCurrent:mode==='foreground'});
    else {expect(options.onSavedNoteReady).not.toHaveBeenCalled();expect(options.onTextStreamUpdate).toHaveBeenLastCalledWith('Synthetic preview');}
    if(mode==='background')expect(options.onTextStreamUpdate).not.toHaveBeenCalled();
    if(mode==='foreground')expect(options.onTextStreamUpdate).toHaveBeenLastCalledWith('saved 111');
  });

});
