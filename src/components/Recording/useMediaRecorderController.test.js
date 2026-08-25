import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import useMediaRecorderController from './useMediaRecorderController';
import { getUserId } from './recordingAuth';

jest.mock('./recordingAuth', () => ({
  getUserId: jest.fn()
}));

jest.mock('../../services/nativePlatform', () => ({
  addNativeAppStateListener: jest.fn(() => Promise.resolve(null))
}));

describe('useMediaRecorderController Android pause lifecycle', () => {
  let container;
  let root;
  let controller;
  let consoleLogSpy;
  let originalActEnvironment;
  let originalUserAgent;
  let recorder;

  class MockMediaRecorder {
    static isTypeSupported = jest.fn(() => true);

    constructor() {
      this.state = 'inactive';
      this.start = jest.fn((timeslice) => {
        this.state = 'recording';
        this.timeslice = timeslice;
      });
      this.pause = jest.fn(() => {
        this.state = 'paused';
      });
      this.resume = jest.fn(() => {
        this.state = 'recording';
      });
      this.stop = jest.fn(() => {
        this.state = 'inactive';
        this.ondataavailable?.({
          data: new Blob([new Uint8Array(1500)], { type: 'audio/webm' }),
          target: this
        });
        this.onstop?.();
      });
      recorder = this;
    }
  }

  const createProps = () => ({
    timeStampRef: { current: null },
    pathStampRef: { current: null },
    filePathRef: { current: null },
    noSleepRef: { current: null },
    isDiscardingRef: { current: false },
    queueUpload: jest.fn(),
    clearUploadQueue: jest.fn(),
    cleanupNoteGeneration: jest.fn(),
    resetNoteGenerationState: jest.fn(),
    setIsRecording: jest.fn(),
    setIsPaused: jest.fn(),
    setIsPreparingTranscript: jest.fn(),
    setIsGeneratingSummary: jest.fn(),
    setIsTranscriptCompleted: jest.fn(),
    setTextStream: jest.fn()
  });

  beforeEach(() => {
    originalActEnvironment = global.IS_REACT_ACT_ENVIRONMENT;
    global.IS_REACT_ACT_ENVIRONMENT = true;
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    originalUserAgent = Object.getOwnPropertyDescriptor(window.navigator, 'userAgent');
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value: 'Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36'
    });

    window.MediaRecorder = MockMediaRecorder;
    global.MediaRecorder = MockMediaRecorder;
    navigator.mediaDevices = {
      getUserMedia: jest.fn(() => Promise.resolve({
        active: true,
        getTracks: () => [{ stop: jest.fn() }]
      }))
    };
    getUserId.mockResolvedValue('user-id');

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    if (originalUserAgent) {
      Object.defineProperty(window.navigator, 'userAgent', originalUserAgent);
    }
    global.IS_REACT_ACT_ENVIRONMENT = originalActEnvironment;
    consoleLogSpy.mockRestore();
    jest.clearAllMocks();
  });

  it('flushes a regular chunk at pause and starts a fresh Android container at resume', async () => {
    const props = createProps();
    const Harness = () => {
      controller = useMediaRecorderController(props);
      return null;
    };

    await act(async () => {
      root.render(<Harness />);
    });
    await act(async () => {
      await controller.startRecording();
    });

    expect(recorder.start).toHaveBeenCalledTimes(1);
    expect(recorder.start).toHaveBeenLastCalledWith(240000);

    act(() => controller.pauseRecording());
    await act(async () => Promise.resolve());

    expect(recorder.pause).not.toHaveBeenCalled();
    expect(recorder.stop).toHaveBeenCalledTimes(1);
    expect(props.queueUpload).toHaveBeenNthCalledWith(
      1,
      expect.any(Blob),
      expect.stringMatching(/_recording_chunk_.+_rc2_0\.webm$/)
    );

    act(() => controller.resumeRecording());
    expect(recorder.resume).not.toHaveBeenCalled();
    expect(recorder.start).toHaveBeenCalledTimes(2);
    expect(recorder.start).toHaveBeenLastCalledWith(240000);

    act(() => controller.stopRecording());
    await act(async () => Promise.resolve());

    expect(recorder.stop).toHaveBeenCalledTimes(2);
    expect(props.queueUpload).toHaveBeenNthCalledWith(
      2,
      expect.any(Blob),
      expect.stringMatching(/_recording_final_.+_rc2_1\.webm$/)
    );
  });
});
