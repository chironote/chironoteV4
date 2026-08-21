import React, { act } from 'react';
import { render, waitFor } from '@testing-library/react';
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
    this.ondataavailable({ data: blob });
    Promise.resolve().then(() => {
      if (this.onstop) {
        this.onstop();
      }
    });
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

  it('serializes the four-minute rotation and uploads a complete final MP4 after pause/resume', async () => {
    const managerRef = { current: null };
    render(<RecordingHarness managerRef={managerRef} />);

    await act(async () => {
      await managerRef.current.startRecording();
    });

    const recorder = FakeMediaRecorder.instances[0];
    expect(recorder.options).toEqual({ mimeType: 'video/mp4' });

    act(() => managerRef.current.pauseRecording());
    act(() => managerRef.current.resumeRecording());
    expect(recorder.state).toBe('recording');

    act(() => jest.advanceTimersByTime(240000));
    expect(recorder.stopCalls).toBe(1);
    expect(recorder.startCalls).toHaveLength(1);

    await act(async () => {
      await Promise.resolve();
    });
    expect(recorder.startCalls).toHaveLength(2);

    await act(async () => {
      managerRef.current.stopRecording();
    });

    expect(recorder.stopCalls).toBe(2);
    expect(recorder.stream.track.stop).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      const finalUpload = uploadData.mock.calls.find(([request]) => request.path.includes('_final_'));
      expect(finalUpload).toBeDefined();
    });
    const finalUpload = uploadData.mock.calls.find(([request]) => request.path.includes('_final_'));
    expect(finalUpload[0].data.size).toBe(new Blob(['final-media']).size);
    expect(finalUpload[0].data.type).toBe('video/mp4');
    jest.clearAllTimers();
  });
});
