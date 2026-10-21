import React, { act } from 'react';
import { render } from '@testing-library/react';
import RecordingManager from './RecordingManager';
import { Capacitor } from '@capacitor/core';
import { getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';
import { uploadData } from 'aws-amplify/storage';
import { SendMessageCommand } from '@aws-sdk/client-sqs';
const mockSend = jest.fn();

// PDF delivery is unrelated to microphone/WebKit lifecycle; its own suite tests native plugins.
jest.mock('../../services/patientPdfDelivery', () => ({ deliverPatientPdf: jest.fn() }));
// Exercise queue ownership with fictional capture metadata independently of
// build-time patient feature flags; normalization has its own capture tests.
jest.mock('../../services/patientNotes', () => ({
  ...jest.requireActual('../../services/patientNotes'),
  captureSnapshot: value => value ? Object.freeze({ ...value }) : undefined,
}));

jest.mock('aws-amplify/auth', () => ({
  getCurrentUser: jest.fn(),
  fetchAuthSession: jest.fn(),
}));

jest.mock('aws-amplify/storage', () => ({
  uploadData: jest.fn(),
}));

jest.mock('@aws-sdk/client-sqs', () => {
  class MockSQSClient {
    constructor() {
      this.send = (...args) => mockSend(...args);
      this.destroy = jest.fn();
    }
  }

  return {
    SQSClient: MockSQSClient,
    SendMessageCommand: jest.fn(),
  };
});

jest.mock('aws-amplify/api', () => {
  const client = {
    graphql: jest.fn(() => ({ subscribe: jest.fn() })),
  };
  global.__recordingTestClient = client;
  return { generateClient: jest.fn(() => client) };
});

jest.mock('../../graphql/subscriptions', () => ({
  onUpdateNotesByOwner: 'onUpdateNotesByOwner',
}));

jest.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: jest.fn(() => false),
    getPlatform: jest.fn(() => 'web'),
  },
}));

jest.mock('@capacitor/app', () => ({
  App: { addListener: jest.fn(() => ({ remove: jest.fn() })) },
}));

jest.mock('nosleep.js', () => {
  function MockNoSleep() {
    this.enable = jest.fn();
    this.disable = jest.fn();
  }
  return MockNoSleep;
});

const createStream = () => {
  const track = { stop: jest.fn() };
  return {
    getTracks: () => [track],
    track,
  };
};

class FakeMediaRecorder {
  static instances = [];

  // Keep the default iPhone behavior on the legacy MP4 fallback; individual
  // tests opt into WebM when exercising newer WebKit support.
  static isTypeSupported = jest.fn(type => type === 'video/mp4');

  constructor(stream, options) {
    this.stream = stream;
    this.options = options;
    this.mimeType = options?.mimeType || 'video/mp4';
    this.state = 'inactive';
    this.startCalls = [];
    this.stopCalls = 0;
    this.blobs = [
      new Blob(['rotated-media'], { type: this.mimeType }),
      new Blob(['final-media'], { type: this.mimeType }),
    ];
    FakeMediaRecorder.instances.push(this);
  }

  start(timeslice) {
    if (this.state !== 'inactive') {
      throw new Error('recorder must be inactive before start');
    }
    this.startCalls.push(timeslice);
    this.state = 'recording';
  }

  pause() {
    this.state = 'paused';
  }

  resume() {
    this.state = 'recording';
    if (this.onresume) {
      this.onresume();
    }
  }

  stop() {
    if (this.state === 'inactive') {
      throw new Error('recorder is already inactive');
    }
    this.stopCalls += 1;
    this.state = 'inactive';
    const blob = this.blobs.shift() || new Blob(['final-media'], { type: this.mimeType });
    // Model WKWebView: neither final event is synchronous with stop().
    setTimeout(() => {
      this.ondataavailable({ data: blob });
    }, 0);
    setTimeout(() => {
      if (this.onstop) {
        this.onstop();
      }
    }, this.stopDelay ?? 1);
  }
}

const readBlobAsText = blob => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(reader.error);
  reader.readAsText(blob);
});

function RecordingHarness({ managerRef, callbacks = {} }) {
  managerRef.current = RecordingManager({
    onTextStreamUpdate: jest.fn(),
    onTransitionToMainApp: jest.fn(),
    ...callbacks,
  });
  return null;
}

describe('RecordingManager iPhone lifecycle', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    Capacitor.getPlatform.mockReturnValue('web');
    Capacitor.isNativePlatform.mockReturnValue(false);
    FakeMediaRecorder.isTypeSupported.mockImplementation(type => type === 'video/mp4');
    mockSend.mockReset().mockResolvedValue({});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    FakeMediaRecorder.instances = [];
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
    });
    Object.defineProperty(window.navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: jest.fn().mockImplementation(async () => createStream()) },
    });
    window.confirm = jest.fn(() => true);
    window.localStorage.clear();
    window.MediaRecorder = FakeMediaRecorder;
    global.MediaRecorder = FakeMediaRecorder;
    getCurrentUser.mockResolvedValue({ userId: 'user-123' });
    fetchAuthSession.mockResolvedValue({
      credentials: {},
      tokens: { accessToken: { toString: () => 'token' } },
    });
    uploadData.mockReturnValue({ result: Promise.resolve({}), cancel: jest.fn() });
    global.__recordingTestClient.graphql.mockImplementation(() => ({ subscribe: jest.fn(() => ({ unsubscribe: jest.fn() })) }));
  });

  afterEach(() => {
    jest.clearAllTimers();
    console.error.mockRestore();
    jest.useRealTimers();
  });

  const flushWebKitEvents = async () => {
    await act(async () => {
      // Flush only WebKit's 0/1ms events, not queue watchdog/retry deadlines.
      jest.advanceTimersByTime(2);
      for (let i = 0; i < 40; i++) await Promise.resolve();
    });
  };

  const startManager = async () => {
    const managerRef = { current: null };
    const view = render(<RecordingHarness managerRef={managerRef} />);

    await act(async () => {
      await managerRef.current.startRecording();
    });
    return { managerRef, view, recorder: FakeMediaRecorder.instances[0] };
  };

  it('serializes pause/resume rotation while preserving the WebM upload contract', async () => {
    const { managerRef, recorder } = await startManager();

    expect(FakeMediaRecorder.isTypeSupported).toHaveBeenCalledWith('audio/webm;codecs=opus');
    expect(FakeMediaRecorder.isTypeSupported.mock.results[0].value).toBe(false);
    expect(recorder.options).toEqual({ mimeType: 'video/mp4' });

    act(() => managerRef.current.pauseRecording());
    act(() => managerRef.current.resumeRecording());
    expect(recorder.state).toBe('recording');

    act(() => jest.advanceTimersByTime(240000));
    expect(recorder.stopCalls).toBe(1);
    expect(recorder.startCalls).toHaveLength(1);

    // The next segment is not started until delayed dataavailable and onstop.
    await flushWebKitEvents();
    expect(recorder.startCalls).toHaveLength(2);

    await act(async () => {
      managerRef.current.stopRecording();
    });

    expect(recorder.stopCalls).toBe(2);
    expect(recorder.stream.track.stop).not.toHaveBeenCalled();
    await flushWebKitEvents();

    expect(uploadData).toHaveBeenCalledTimes(2);
    const [rotationUpload, finalUpload] = uploadData.mock.calls.map(([request]) => request);
    expect(rotationUpload.path).toContain('_chunk_');
    expect(finalUpload.path).toContain('_final_');
    expect(rotationUpload.path).toMatch(/\.webm$/);
    expect(finalUpload.path).toMatch(/\.webm$/);
    expect(rotationUpload.options.contentType).toBe('audio/webm');
    expect(finalUpload.options.contentType).toBe('audio/webm');
    expect(finalUpload.data.size).toBe(new Blob(['final-media']).size);
    expect(finalUpload.data.type).toBe('video/mp4');
    expect(recorder.stream.track.stop).toHaveBeenCalledTimes(1);
  });

  it('collects iOS timeslice pieces into one blob per recorder cycle', async () => {
    const { managerRef, recorder } = await startManager();
    expect(recorder.startCalls).toEqual([1000]);
    recorder.stopDelay = 10;

    act(() => {
      recorder.ondataavailable({ data: new Blob(['segment-one-a|'], { type: 'video/mp4' }) });
      recorder.ondataavailable({ data: new Blob(['segment-one-b|'], { type: 'video/mp4' }) });
    });
    expect(uploadData).not.toHaveBeenCalled();

    act(() => jest.advanceTimersByTime(240000));
    await advance(1);
    expect(uploadData).not.toHaveBeenCalled();
    await advance(9);

    expect(uploadData).toHaveBeenCalledTimes(1);
    const rotationUpload = uploadData.mock.calls[0][0];
    expect(rotationUpload.path).toContain('_chunk_');
    expect(rotationUpload.data.type).toBe('video/mp4');
    await expect(readBlobAsText(rotationUpload.data)).resolves.toBe(
      'segment-one-a|segment-one-b|rotated-media',
    );
    expect(recorder.startCalls).toEqual([1000, 1000]);

    act(() => recorder.ondataavailable({ data: new Blob(['segment-two-a|'], { type: 'video/mp4' }) }));
    expect(uploadData).toHaveBeenCalledTimes(1);
    act(() => managerRef.current.stopRecording());
    await advance(1);
    expect(uploadData).toHaveBeenCalledTimes(1);
    await advance(9);

    expect(uploadData).toHaveBeenCalledTimes(2);
    const finalUpload = uploadData.mock.calls[1][0];
    expect(finalUpload.path).toContain('_final_');
    expect(finalUpload.data.type).toBe('video/mp4');
    await expect(readBlobAsText(finalUpload.data)).resolves.toBe('segment-two-a|final-media');
    expect(recorder.stream.track.stop).toHaveBeenCalledTimes(1);
  });

  it('prefers supported iOS WebM and uploads ordered timeslice pieces as one final blob', async () => {
    FakeMediaRecorder.isTypeSupported.mockImplementation(type => (
      type === 'audio/webm;codecs=opus' || type === 'video/mp4'
    ));
    const { managerRef, recorder } = await startManager();
    const webmType = 'audio/webm;codecs=opus';

    expect(FakeMediaRecorder.isTypeSupported).toHaveBeenCalledWith(webmType);
    expect(recorder.options).toEqual({ mimeType: webmType });
    expect(recorder.mimeType).toBe(webmType);
    expect(recorder.startCalls).toEqual([1000]);
    recorder.stopDelay = 10;
    recorder.blobs = [new Blob(['final-media'], { type: webmType })];

    act(() => {
      recorder.ondataavailable({ data: new Blob(['webm-part-a|'], { type: webmType }) });
      recorder.ondataavailable({ data: new Blob(['webm-part-b|'], { type: webmType }) });
    });
    expect(uploadData).not.toHaveBeenCalled();

    act(() => managerRef.current.stopRecording());
    await advance(1);
    expect(uploadData).not.toHaveBeenCalled();
    await advance(9);

    expect(uploadData).toHaveBeenCalledTimes(1);
    const finalUpload = uploadData.mock.calls[0][0];
    expect(finalUpload.path).toContain('_final_');
    expect(finalUpload.options.contentType).toBe('audio/webm');
    expect(finalUpload.data.type).toBe(webmType);
    await expect(readBlobAsText(finalUpload.data)).resolves.toBe(
      'webm-part-a|webm-part-b|final-media',
    );
    expect(recorder.stream.track.stop).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['when WebM is supported', true, 'audio/webm;codecs=opus'],
    ['when WebM is unsupported', false, 'video/mp4'],
  ])('uses the native iOS recorder path for a Mac-style UA %s', async (_caseName, webmSupported, expectedMime) => {
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko)',
    });
    Capacitor.getPlatform.mockReturnValue('ios');
    Capacitor.isNativePlatform.mockReturnValue(true);
    FakeMediaRecorder.isTypeSupported.mockImplementation(type => (
      type === 'video/mp4' || (webmSupported && type === 'audio/webm;codecs=opus')
    ));

    const { managerRef, recorder } = await startManager();
    const webmType = 'audio/webm;codecs=opus';
    expect(FakeMediaRecorder.isTypeSupported).toHaveBeenCalledWith(webmType);
    expect(FakeMediaRecorder.isTypeSupported.mock.results[0].value).toBe(webmSupported);
    expect(recorder.options).toEqual({ mimeType: expectedMime });
    expect(recorder.startCalls).toEqual([1000]);
    recorder.stopDelay = 10;
    recorder.blobs = [new Blob(['native-stop-tail|'], { type: expectedMime })];

    act(() => {
      recorder.ondataavailable({ data: new Blob(['native-part-a|'], { type: expectedMime }) });
      recorder.ondataavailable({ data: new Blob(['native-part-b|'], { type: expectedMime }) });
    });
    expect(uploadData).not.toHaveBeenCalled();

    act(() => managerRef.current.stopRecording());
    expect(recorder.stream.track.stop).not.toHaveBeenCalled();
    await advance(1);
    expect(uploadData).not.toHaveBeenCalled();
    expect(recorder.stream.track.stop).not.toHaveBeenCalled();
    await advance(9);

    expect(uploadData).toHaveBeenCalledTimes(1);
    const finalUpload = uploadData.mock.calls[0][0];
    expect(finalUpload.path).toContain('_final_');
    expect(finalUpload.data.type).toBe(expectedMime);
    await expect(readBlobAsText(finalUpload.data)).resolves.toBe(
      'native-part-a|native-part-b|native-stop-tail|',
    );
    expect(recorder.stream.track.stop).toHaveBeenCalledTimes(1);
  });

  it('keeps a generic Mac UA on the non-iOS recorder path in web mode', async () => {
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko)',
    });
    const { managerRef, recorder, view } = await startManager();

    expect(Capacitor.getPlatform()).toBe('web');
    expect(recorder.options).toEqual({});
    expect(recorder.startCalls).toEqual([undefined]);
    expect(FakeMediaRecorder.isTypeSupported).not.toHaveBeenCalledWith('audio/webm;codecs=opus');

    act(() => managerRef.current.stopRecording());
    expect(recorder.stream.track.stop).toHaveBeenCalledTimes(1);
    await advance(10);
    view.unmount();
  });

  it('flushes a paused final stop once, without waiting or double cleanup', async () => {
    const { managerRef, recorder } = await startManager();
    act(() => managerRef.current.pauseRecording());
    act(() => managerRef.current.stopRecording());
    act(() => managerRef.current.stopRecording());
    expect(recorder.stopCalls).toBe(1);
    expect(recorder.state).toBe('inactive');
    expect(uploadData).not.toHaveBeenCalled();

    await flushWebKitEvents();
    const uploads = uploadData.mock.calls.map(([request]) => request);
    expect(uploads).toHaveLength(1);
    expect(uploads[0].path).toContain('_final_');
    expect(recorder.stream.track.stop).toHaveBeenCalledTimes(1);
  });

  it('turns a user stop during an in-flight rotation into one final upload', async () => {
    const { managerRef, recorder } = await startManager();
    act(() => jest.advanceTimersByTime(240000));
    expect(recorder.stopCalls).toBe(1);
    act(() => managerRef.current.stopRecording());
    await flushWebKitEvents();

    const uploads = uploadData.mock.calls.map(([request]) => request);
    expect(uploads).toHaveLength(1);
    expect(uploads[0].path).toContain('_final_');
    expect(recorder.startCalls).toHaveLength(1);
    expect(recorder.stream.track.stop).toHaveBeenCalledTimes(1);
  });

  it('does not upload final media or restart after discard or unmount', async () => {
    const discarded = await startManager();
    act(() => discarded.recorder.ondataavailable({ data: new Blob(['discarded-periodic-piece'], { type: 'video/mp4' }) }));
    expect(uploadData).not.toHaveBeenCalled();
    act(() => jest.advanceTimersByTime(240000));
    act(() => discarded.managerRef.current.discardRecording());
    await flushWebKitEvents();
    expect(uploadData).not.toHaveBeenCalled();
    expect(discarded.recorder.startCalls).toHaveLength(1);

    jest.clearAllMocks();
    const unmounted = await startManager();
    act(() => unmounted.managerRef.current.stopRecording());
    act(() => unmounted.view.unmount());
    await flushWebKitEvents();
    expect(uploadData).not.toHaveBeenCalled();
    expect(unmounted.recorder.startCalls).toHaveLength(1);
  });


  it('freezes exam and PI before pending microphone acquisition and later setting changes', async () => {
    let resolveMicrophone;
    navigator.mediaDevices.getUserMedia.mockImplementationOnce(() => new Promise(resolve => { resolveMicrophone = resolve; }));
    localStorage.setItem('noteSettings', JSON.stringify({ examLayout: true, PILayout: false }));
    const managerRef = { current: null };
    const view = render(<RecordingHarness managerRef={managerRef} />);
    let starting;
    act(() => {
      starting = managerRef.current.startRecording();
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(1);
      localStorage.setItem('noteSettings', JSON.stringify({ examLayout: false, PILayout: true }));
    });
    await act(async () => { resolveMicrophone(createStream()); await starting; });
    act(() => managerRef.current.stopRecording());
    await flushWebKitEvents();
    expect(SendMessageCommand).toHaveBeenCalled();
    const message = JSON.parse(SendMessageCommand.mock.calls[0][0].MessageBody);
    expect(message.noteSettings).toEqual({ examLayout: true, PILayout: false });
    view.unmount();
  });

  it('keeps a new microphone request pending when a cancelled request resolves late', async () => {
    let resolveOld; let resolveNew;
    navigator.mediaDevices.getUserMedia
      .mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; }))
      .mockImplementationOnce(() => new Promise(resolve => { resolveNew = resolve; }));
    const managerRef = { current: null };
    const view = render(<RecordingHarness managerRef={managerRef} />);
    let oldStart; let newStart;
    await act(async () => { oldStart = managerRef.current.startRecording(); await Promise.resolve(); });
    act(() => managerRef.current.discardRecording());
    await act(async () => { newStart = managerRef.current.startRecording(); await Promise.resolve(); });
    const oldStream = createStream();
    await act(async () => { resolveOld(oldStream); await oldStart; });
    expect(oldStream.track.stop).toHaveBeenCalledTimes(1);
    expect(managerRef.current.isStarting).toBe(true);
    expect(FakeMediaRecorder.instances).toHaveLength(0);
    const newStream = createStream();
    await act(async () => { resolveNew(newStream); await newStart; });
    expect(managerRef.current.isStarting).toBe(false);
    expect(managerRef.current.isRecording).toBe(true);
    expect(FakeMediaRecorder.instances).toHaveLength(1);
    expect(FakeMediaRecorder.instances[0].stream).toBe(newStream);
    view.unmount();
  });
  const settle = async () => act(async () => { for (let i = 0; i < 25; i++) await Promise.resolve(); });
  const advance = async ms => {
    act(() => jest.advanceTimersByTime(ms));
    await settle();
  };
  const finalize = async managerRef => {
    act(() => managerRef.current.stopRecording());
    await advance(2);
  };

  it('retains missing credentials and network auth failures, then retries with fresh auth without online hints', async () => {
    const { managerRef } = await startManager();
    fetchAuthSession.mockResolvedValueOnce({}).mockRejectedValueOnce(new TypeError('network unavailable'));
    await finalize(managerRef);
    expect(managerRef.current.uploadStatus.pending).toBe(1);
    expect(uploadData).not.toHaveBeenCalled();
    await advance(1000);
    expect(managerRef.current.uploadStatus.pending).toBe(1);
    expect(uploadData).not.toHaveBeenCalled();
    await advance(2000);
    expect(uploadData).toHaveBeenCalledTimes(1);
    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(fetchAuthSession).toHaveBeenCalledWith({ forceRefresh: true });
    expect(managerRef.current.uploadStatus.pending).toBe(0);
  });

  it('retries ambiguous SQS after more than five minutes with identical identity and no second S3 upload', async () => {
    const { managerRef, recorder } = await startManager();
    const originalBlob = recorder.blobs[0];
    mockSend.mockRejectedValue(new TypeError('response lost'));
    await finalize(managerRef);
    expect(managerRef.current.uploadStatus.pending).toBe(1);
    expect(mockSend).toHaveBeenCalledTimes(1);
    const original = SendMessageCommand.mock.calls[0][0];
    const originalUpload = uploadData.mock.calls[0][0];
    expect(originalUpload.data.type).toBe(originalBlob.type);
    await expect(readBlobAsText(originalUpload.data)).resolves.toBe(await readBlobAsText(originalBlob));
    act(() => jest.setSystemTime(Date.now() + 301000));
    mockSend.mockResolvedValue({});
    act(() => managerRef.current.retryUploads());
    await settle();
    const last = SendMessageCommand.mock.calls.at(-1)[0];
    expect(last).toEqual(original);
    expect(uploadData).toHaveBeenCalledTimes(1);
    expect(managerRef.current.uploadStatus.pending).toBe(0);
    expect(global.__recordingTestClient.graphql).toHaveBeenCalledTimes(1);
  });

  it('allows a transfer exceeding 120 seconds when bytes continue to advance and uses a fresh dispatch token', async () => {
    const { managerRef } = await startManager();
    let finish;
    const cancel = jest.fn();
    uploadData.mockReturnValueOnce({ result: new Promise(resolve => { finish = resolve; }), cancel });
    await finalize(managerRef);
    const progress = uploadData.mock.calls[0][0].options.onProgress;
    // Multipart retry progress may briefly drop; later advancing bytes still
    // reset the watchdog even before the earlier high-water mark is reached.
    for (const [elapsed, bytes] of [[100000, 100], [100000, 50], [10000, 60], [100000, 70]]) {
      await advance(elapsed);
      act(() => progress({ transferredBytes: bytes }));
    }
    expect(cancel).not.toHaveBeenCalled();
    fetchAuthSession.mockResolvedValue({ credentials: {}, tokens: { accessToken: { toString: () => 'fresh-dispatch-token' } } });
    await act(async () => finish({}));
    await settle();
    expect(JSON.parse(SendMessageCommand.mock.calls[0][0].MessageBody).accessToken).toBe('fresh-dispatch-token');
    expect(managerRef.current.uploadStatus.pending).toBe(0);
  });

  it('cancels a no-progress stall, waits for settlement and never duplicates the active attempt during flapping or Retry', async () => {
    const { managerRef } = await startManager();
    let reject;
    const cancel = jest.fn();
    uploadData.mockReturnValueOnce({ result: new Promise((resolve, fail) => { reject = fail; }), cancel });
    await finalize(managerRef);
    await advance(119000);
    act(() => uploadData.mock.calls[0][0].options.onProgress({ transferredBytes: 0 }));
    await advance(1000);
    expect(cancel).toHaveBeenCalledTimes(1);
    act(() => {
      for (let i = 0; i < 6; i++) window.dispatchEvent(new Event('online'));
      managerRef.current.retryUploads();
    });
    await advance(60000);
    expect(uploadData).toHaveBeenCalledTimes(1);
    expect(mockSend).not.toHaveBeenCalled();
    await act(async () => reject(new Error('cancelled')));
    await advance(1000);
    expect(uploadData).toHaveBeenCalledTimes(2);
    expect(uploadData.mock.calls[1][0].data).toBe(uploadData.mock.calls[0][0].data);
    expect(uploadData.mock.calls[1][0].path).toBe(uploadData.mock.calls[0][0].path);
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it('aborts a stalled dispatch at 60 seconds and retries only SQS after settlement', async () => {
    const { managerRef } = await startManager();
    let reject;
    mockSend.mockImplementationOnce(() => new Promise((resolve, fail) => { reject = fail; }));
    await finalize(managerRef);
    const signal = mockSend.mock.calls[0][1].abortSignal;
    await advance(59999);
    expect(signal.aborted).toBe(false);
    await advance(1);
    expect(signal.aborted).toBe(true);
    act(() => managerRef.current.retryUploads());
    await settle();
    expect(mockSend).toHaveBeenCalledTimes(1);
    await act(async () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
    await advance(1000);
    expect(mockSend).toHaveBeenCalledTimes(2);
    expect(uploadData).toHaveBeenCalledTimes(1);
  });

  it('visibly blocks persistent authorization and retains the item until explicit retry', async () => {
    const { managerRef } = await startManager();
    mockSend.mockRejectedValueOnce(Object.assign(new Error('denied'), { name: 'AccessDeniedException' }));
    await finalize(managerRef);
    expect(managerRef.current.uploadStatus).toEqual({ pending: 1, blocked: 1 });
    await advance(360000);
    act(() => window.dispatchEvent(new Event('online')));
    await settle();
    expect(mockSend).toHaveBeenCalledTimes(1);
    act(() => managerRef.current.retryUploads());
    await settle();
    expect(mockSend).toHaveBeenCalledTimes(2);
    expect(uploadData).toHaveBeenCalledTimes(1);
    expect(managerRef.current.uploadStatus.pending).toBe(0);
  });

  it.each(['RequestThrottled', 'ThrottlingException', 'ExpiredToken', 'RequestTimeout'])('retries HTTP400 %s with fresh auth instead of blocking', async name => {
    const { managerRef } = await startManager();
    mockSend.mockRejectedValueOnce(Object.assign(new Error('retryable service failure'), { name, $metadata: { httpStatusCode: 400 } }));
    await finalize(managerRef);
    expect(managerRef.current.uploadStatus).toEqual({ pending: 1, blocked: 0 });
    expect(mockSend).toHaveBeenCalledTimes(1);
    await advance(1000);
    expect(mockSend).toHaveBeenCalledTimes(2);
    expect(fetchAuthSession).toHaveBeenCalledWith({ forceRefresh: true });
    expect(uploadData).toHaveBeenCalledTimes(1);
    expect(managerRef.current.uploadStatus.pending).toBe(0);
  });

  it('starts B during A upload, preserves A settings and final ordering, and discards B without clearing A', async () => {
    localStorage.setItem('noteSettings', JSON.stringify({ examLayout: true, PILayout: false }));
    const { managerRef, recorder } = await startManager();
    let finish;
    uploadData.mockReturnValueOnce({ result: new Promise((resolve, reject) => { finish = reject; }), cancel: jest.fn() });
    await advance(240002);
    await finalize(managerRef);
    expect(managerRef.current.uploadStatus.pending).toBe(2);
    act(() => managerRef.current.prepareNextRecording());
    localStorage.setItem('noteSettings', JSON.stringify({ examLayout: false, PILayout: true }));
    await act(async () => managerRef.current.startRecording());
    expect(managerRef.current.isRecording).toBe(true);
    expect(FakeMediaRecorder.instances[1].state).toBe('recording');
    act(() => managerRef.current.discardRecording());
    expect(managerRef.current.uploadStatus.pending).toBe(2);
    await act(async () => finish(new TypeError('connection lost')));
    await settle();
    expect(mockSend).not.toHaveBeenCalled();
    await advance(1000);
    const messages = SendMessageCommand.mock.calls.map(([request]) => JSON.parse(request.MessageBody));
    expect(messages.map(message => message.isFinalAudio)).toEqual([false, true]);
    expect(messages[1].timestamp).toBe(messages[0].timestamp);
    expect(messages[1].noteSettings).toEqual({ examLayout: true, PILayout: false });
    expect(uploadData.mock.calls[0][0].data.size).toBe(new Blob(['rotated-media']).size);
    expect(recorder.stream.track.stop).toHaveBeenCalledTimes(1);
    expect(global.__recordingTestClient.graphql).toHaveBeenCalledTimes(1);
  });

  it('fences late successful uploads after explicit discard and never submits as another owner', async () => {
    const { managerRef } = await startManager();
    let finish;
    uploadData.mockReturnValueOnce({ result: new Promise(resolve => { finish = resolve; }), cancel: jest.fn() });
    await finalize(managerRef);
    act(() => managerRef.current.discardRecording());
    await act(async () => managerRef.current.startRecording());
    await act(async () => finish({}));
    await settle();
    expect(mockSend).not.toHaveBeenCalled();
    getCurrentUser.mockResolvedValue({ userId: 'other-owner' });
    await finalize(managerRef);
    expect(managerRef.current.uploadStatus).toEqual({ pending: 1, blocked: 1 });
    expect(mockSend).not.toHaveBeenCalled();
    expect(uploadData).toHaveBeenCalledTimes(1);
  });

  it('keeps B identity separate while A retries and does not starve A final behind B regular audio', async () => {
    const managerRef = { current: null };
    render(<RecordingHarness managerRef={managerRef} />);
    localStorage.setItem('noteSettings', JSON.stringify({ examLayout: true, PILayout: false }));
    await act(async () => managerRef.current.startRecording({ patientId: 'fictional-a', visitType: 'initialExam' }));
    uploadData.mockReturnValueOnce({ result: Promise.reject(new TypeError('network changed')), cancel: jest.fn() });
    await finalize(managerRef);
    const original = uploadData.mock.calls[0][0];
    let finish;
    uploadData.mockReturnValueOnce({ result: new Promise(resolve => { finish = resolve; }), cancel: jest.fn() });
    act(() => managerRef.current.retryUploads()); await settle();
    localStorage.setItem('noteSettings', JSON.stringify({ examLayout: false, PILayout: true }));
    await act(async () => managerRef.current.startRecording({ patientId: 'fictional-b', visitType: 'followUp' }));
    expect(managerRef.current.isRecording).toBe(true);
    act(() => FakeMediaRecorder.instances[1].ondataavailable({ data: new Blob(['B regular'], { type: 'video/mp4' }) }));
    act(() => jest.advanceTimersByTime(240000));
    await advance(2);
    await act(async () => finish({})); await settle();
    await finalize(managerRef);
    const messages = SendMessageCommand.mock.calls.map(([request]) => JSON.parse(request.MessageBody));
    expect(messages.map(message => message.isFinalAudio)).toEqual([true, false, true]);
    expect(messages[0].path).toBe(original.path);
    expect(uploadData.mock.calls[1][0].data).toBe(original.data);
    expect(messages[0].noteSettings).toEqual({ examLayout: true, PILayout: false });
    expect(messages[1].noteSettings).toEqual({ examLayout: false, PILayout: true });
    expect(messages[0].visitMetadata).toEqual({ patientId: 'fictional-a', visitType: 'initialExam' });
    expect(messages[1].visitMetadata).toEqual({ patientId: 'fictional-b', visitType: 'followUp' });
    expect(messages[2].timestamp).toBe(messages[1].timestamp);
    expect(messages[0].timestamp).not.toBe(messages[1].timestamp);
    expect(global.__recordingTestClient.graphql).toHaveBeenCalledTimes(2);
    expect(managerRef.current.uploadStatus.pending).toBe(0);
  });

  it('commits a final when Stop lands after rotation dataavailable but before onstop', async () => {
    const { managerRef, recorder } = await startManager();
    act(() => {
      recorder.ondataavailable({ data: new Blob(['rotation-periodic-a|'], { type: 'video/mp4' }) });
      recorder.ondataavailable({ data: new Blob(['rotation-periodic-b|'], { type: 'video/mp4' }) });
    });
    recorder.stopDelay = 10;
    const dataEvent = jest.spyOn(recorder, 'ondataavailable');
    act(() => jest.advanceTimersByTime(240000));
    await advance(1);
    expect(dataEvent).toHaveBeenCalledTimes(1);
    expect(uploadData).not.toHaveBeenCalled();
    const session = managerRef.current.getCaptureSession();
    act(() => managerRef.current.stopRecording());
    expect(managerRef.current.isFinishingRecording).toBe(true);
    await act(async () => managerRef.current.startRecording());
    expect(managerRef.current.getCaptureSession()).toBe(session);
    await advance(9);
    expect(managerRef.current.isFinishingRecording).toBe(false);
    expect(uploadData).toHaveBeenCalledTimes(1);
    expect(uploadData.mock.calls[0][0].data.type).toBe('video/mp4');
    await expect(readBlobAsText(uploadData.mock.calls[0][0].data)).resolves.toBe(
      'rotation-periodic-a|rotation-periodic-b|rotated-media',
    );
    expect(uploadData.mock.calls[0][0].path).toContain('_final_');
    expect(JSON.parse(SendMessageCommand.mock.calls[0][0].MessageBody).isFinalAudio).toBe(true);
    expect(recorder.stream.track.stop).toHaveBeenCalledTimes(1);
    expect(recorder.startCalls).toHaveLength(1);
    expect(global.__recordingTestClient.graphql).toHaveBeenCalledTimes(1);
  });

  it('times out a hung auth read and ignores its late success after recovery', async () => {
    const { managerRef } = await startManager();
    let oldAuth;
    fetchAuthSession.mockImplementationOnce(() => new Promise(resolve => { oldAuth = resolve; }));
    await finalize(managerRef);
    expect(uploadData).not.toHaveBeenCalled();
    await advance(60000);
    expect(managerRef.current.uploadStatus.pending).toBe(1);
    await advance(1000);
    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(managerRef.current.uploadStatus.pending).toBe(0);
    await act(async () => oldAuth({ credentials: {}, tokens: { accessToken: 'obsolete-token' } }));
    await settle();
    expect(uploadData).toHaveBeenCalledTimes(1);
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it('keeps the non-iOS final event alive until onstop before accepting B', async () => {
    Object.defineProperty(navigator, 'userAgent', { configurable: true, value: 'Android' });
    const { managerRef } = await startManager();
    expect(Capacitor.getPlatform()).toBe('web');
    expect(FakeMediaRecorder.instances[0].startCalls).toEqual([240000]);
    const a = managerRef.current.getCaptureSession();
    act(() => managerRef.current.stopRecording());
    await act(async () => managerRef.current.startRecording());
    expect(managerRef.current.getCaptureSession()).toBe(a);
    expect(managerRef.current.isFinishingRecording).toBe(true);
    await advance(2);
    expect(JSON.parse(SendMessageCommand.mock.calls[0][0].MessageBody).isFinalAudio).toBe(true);
    await act(async () => managerRef.current.startRecording());
    expect(managerRef.current.isRecording).toBe(true);
    expect(FakeMediaRecorder.instances).toHaveLength(2);
  });

  it('cancels only A remaining queued work on a late A credit denial, leaving B active', async () => {
    const { managerRef } = await startManager();
    const a = managerRef.current.getCaptureSession();
    let finish;
    uploadData.mockReturnValueOnce({ result: new Promise(resolve => { finish = resolve; }), cancel: jest.fn() });
    await finalize(managerRef);
    await act(async () => managerRef.current.startRecording());
    act(() => managerRef.current.discardRecording(a, { creditCheckFailed: true }));
    expect(managerRef.current.isRecording).toBe(true);
    expect(managerRef.current.uploadStatus.pending).toBe(0);
    expect(managerRef.current.generationError).toContain('earlier recording failed its credit check');
    await act(async () => finish({})); await settle();
    expect(mockSend).not.toHaveBeenCalled();
    expect(FakeMediaRecorder.instances[1].stream.track.stop).not.toHaveBeenCalled();
  });

  it('uses exactly one fresh credential read for a dispatch-only retry', async () => {
    const { managerRef } = await startManager();
    mockSend.mockRejectedValueOnce(new TypeError('response unavailable'));
    await finalize(managerRef);
    fetchAuthSession.mockClear();
    act(() => managerRef.current.retryUploads()); await settle();
    expect(fetchAuthSession).toHaveBeenCalledTimes(1);
    expect(fetchAuthSession).toHaveBeenCalledWith({ forceRefresh: true });
    expect(uploadData).toHaveBeenCalledTimes(1);
    expect(mockSend).toHaveBeenCalledTimes(2);
  });

  it('accepts S3 success racing watchdog cancellation and only retries the lost SQS response', async () => {
    const { managerRef } = await startManager();
    let finish;
    const cancel = jest.fn();
    uploadData.mockReturnValueOnce({ result: new Promise(resolve => { finish = resolve; }), cancel });
    mockSend.mockRejectedValueOnce(new TypeError('response lost after acceptance'));
    await finalize(managerRef);
    await advance(120000);
    expect(cancel).toHaveBeenCalledTimes(1);
    await act(async () => finish({})); await settle();
    expect(mockSend).toHaveBeenCalledTimes(1);
    await advance(1000);
    expect(mockSend).toHaveBeenCalledTimes(2);
    expect(uploadData).toHaveBeenCalledTimes(1);
    expect(managerRef.current.uploadStatus.pending).toBe(0);
  });

  it('scopes a late discard token from A after B takes the microphone', async () => {
    const { managerRef } = await startManager();
    const a = managerRef.current.getCaptureSession();
    await finalize(managerRef);
    await act(async () => managerRef.current.startRecording());
    act(() => managerRef.current.discardRecording(a));
    expect(managerRef.current.isRecording).toBe(true);
    expect(FakeMediaRecorder.instances[1].state).toBe('recording');
    expect(FakeMediaRecorder.instances[1].stream.track.stop).not.toHaveBeenCalled();
  });

  it('preserves FIFO identity if AWS accepted a message whose response was lost beyond five minutes', async () => {
    const { managerRef } = await startManager();
    const accepted = [];
    const acceptedTimes = [];
    mockSend.mockImplementationOnce(() => {
      acceptedTimes.push(Date.now());
      accepted.push(SendMessageCommand.mock.calls.at(-1)[0]);
      return Promise.reject(new TypeError('accepted, response lost'));
    }).mockImplementationOnce(() => {
      acceptedTimes.push(Date.now());
      accepted.push(SendMessageCommand.mock.calls.at(-1)[0]);
      return Promise.resolve({});
    });
    await finalize(managerRef);
    act(() => jest.setSystemTime(Date.now() + 301000));
    act(() => managerRef.current.retryUploads()); await settle();
    expect(accepted).toHaveLength(2);
    expect(acceptedTimes[1] - acceptedTimes[0]).toBeGreaterThan(300000);
    expect(accepted[1].MessageDeduplicationId).toBe(accepted[0].MessageDeduplicationId);
    expect(accepted[1].MessageGroupId).toBe(accepted[0].MessageGroupId);
    expect(JSON.parse(accepted[1].MessageBody).path).toBe(JSON.parse(accepted[0].MessageBody).path);
    expect(uploadData).toHaveBeenCalledTimes(1);
    // Two accepted sends may be delivered after FIFO dedup expires. This is
    // client identity-preservation evidence, not deployed billing validation.
    expect(global.__recordingTestClient.graphql).toHaveBeenCalledTimes(1);
  });


});
