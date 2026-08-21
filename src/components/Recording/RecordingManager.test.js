import React, { act } from 'react';
import { render } from '@testing-library/react';
import RecordingManager from './RecordingManager';
import { getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';
import { uploadData } from 'aws-amplify/storage';

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
      // Keep this lifecycle test focused on recorder/upload ordering; the
      // production SQS contract is outside the browser lifecycle boundary.
      this.send = jest.fn().mockRejectedValue(new Error('SQS mocked in lifecycle test'));
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
  Capacitor: { isNativePlatform: jest.fn(() => false) },
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

  static isTypeSupported = jest.fn(() => true);

  constructor(stream, options) {
    this.stream = stream;
    this.options = options;
    this.state = 'inactive';
    this.startCalls = [];
    this.stopCalls = 0;
    this.blobs = [
      new Blob(['rotated-media'], { type: 'video/mp4' }),
      new Blob(['final-media'], { type: 'video/mp4' }),
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
    const blob = this.blobs.shift() || new Blob(['final-media'], { type: 'video/mp4' });
    // Model WKWebView: neither final event is synchronous with stop().
    setTimeout(() => {
      this.ondataavailable({ data: blob });
    }, 0);
    setTimeout(() => {
      if (this.onstop) {
        this.onstop();
      }
    }, 1);
  }
}

function RecordingHarness({ managerRef }) {
  managerRef.current = RecordingManager({
    onTextStreamUpdate: jest.fn(),
    onTransitionToMainApp: jest.fn(),
  });
  return null;
}

describe('RecordingManager iPhone lifecycle', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    FakeMediaRecorder.instances = [];
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
    });
    Object.defineProperty(window.navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: jest.fn().mockResolvedValue(createStream()) },
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
    uploadData.mockReturnValue({ result: Promise.resolve({}) });
    global.__recordingTestClient.graphql.mockImplementation(() => ({ subscribe: jest.fn() }));
  });

  afterEach(() => {
    jest.clearAllTimers();
    console.error.mockRestore();
    jest.useRealTimers();
  });

  const flushWebKitEvents = async () => {
    await act(async () => {
      jest.runOnlyPendingTimers();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
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
});
