import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { getUserId } from './recordingAuth';
import useMediaRecorderController from './useMediaRecorderController';
import { AUDIO_UPLOAD_FAILURE_MESSAGE } from './recordingConstants';

jest.mock('./recordingAuth', () => ({
  getUserId: jest.fn()
}));

class MockMediaRecorder {
  static instances = [];
  static startError = null;

  static isTypeSupported() {
    return true;
  }

  constructor(stream, options) {
    this.mimeType = options.mimeType || 'audio/webm';
    this.state = 'inactive';
    this.stream = stream;
    MockMediaRecorder.instances.push(this);
  }

  pause() {
    this.state = 'paused';
  }

  resume() {
    this.state = 'recording';
  }

  start() {
    if (MockMediaRecorder.startError) {
      throw MockMediaRecorder.startError;
    }
    this.state = 'recording';
  }

  stop() {
    this.state = 'inactive';
    this.emitData();
    if (this.onstop) {
      this.onstop();
    }
  }

  emitData() {
    if (this.ondataavailable) {
      this.ondataavailable({
        data: new Blob(['a'.repeat(1200)], { type: this.mimeType }),
        target: this
      });
    }
  }
}

const createDeferred = () => {
  let resolve;
  const promise = new Promise(resolvePromise => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
};

const flushPromises = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

describe('useMediaRecorderController cleanup', () => {
  let container;
  let consoleError;
  let consoleLog;
  let controller;
  let root;
  let track;

  const refs = {
    filePathRef: { current: null },
    isDiscardingRef: { current: false },
    noSleepRef: {
      current: {
        disable: jest.fn(),
        enable: jest.fn()
      }
    },
    pathStampRef: { current: null },
    recordingJobIdRef: { current: null },
    terminalOutcomeRef: { current: null },
    timeStampRef: { current: null }
  };

  const callbacks = {
    cancelUploadSession: jest.fn(),
    cleanupNoteGeneration: jest.fn(),
    emitTelemetry: jest.fn(),
    onTextStreamUpdate: jest.fn(),
    onTransitionToMainApp: jest.fn(),
    queueUpload: jest.fn(),
    resetNoteGenerationState: jest.fn(),
    setIsGeneratingSummary: jest.fn(),
    setIsPaused: jest.fn(),
    setIsPreparingTranscript: jest.fn(),
    setIsRecording: jest.fn(),
    setIsTranscriptCompleted: jest.fn(),
    setTextStream: jest.fn(),
    startUploadSession: jest.fn()
  };

  const Harness = () => {
    controller = useMediaRecorderController({
      ...refs,
      ...callbacks
    });
    return null;
  };

  beforeEach(() => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
    global.MediaRecorder = MockMediaRecorder;
    MockMediaRecorder.instances = [];
    MockMediaRecorder.startError = null;
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
    track = { stop: jest.fn() };
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: jest.fn().mockResolvedValue({
          active: true,
          getTracks: () => [track]
        })
      }
    });
    getUserId.mockResolvedValue('user-12345678');

    Object.values(callbacks).forEach(callback => callback.mockClear());
    refs.isDiscardingRef.current = false;
    refs.recordingJobIdRef.current = null;
    refs.terminalOutcomeRef.current = null;
    refs.noSleepRef.current.disable.mockClear();
    refs.noSleepRef.current.enable.mockClear();

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => {
      root.render(<Harness />);
    });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    consoleError.mockRestore();
    consoleLog.mockRestore();
    delete global.MediaRecorder;
    global.IS_REACT_ACT_ENVIRONMENT = false;
    jest.clearAllMocks();
  });

  test('unmount cleanup cancels the session and emits one discarded terminal outcome', async () => {
    await act(async () => {
      await controller.startRecording();
    });

    expect(callbacks.startUploadSession).toHaveBeenCalledTimes(1);
    const sessionId = callbacks.startUploadSession.mock.calls[0][0];

    Object.values(callbacks).forEach(callback => callback.mockClear());

    act(() => {
      controller.cleanupRecorder();
    });

    expect(callbacks.cancelUploadSession).toHaveBeenCalledWith(sessionId);
    expect(callbacks.queueUpload).not.toHaveBeenCalled();
    expect(track.stop).toHaveBeenCalledTimes(1);
    expect(callbacks.cleanupNoteGeneration).toHaveBeenCalledTimes(1);
    expect(callbacks.setIsRecording).not.toHaveBeenCalled();
    expect(callbacks.setIsPreparingTranscript).not.toHaveBeenCalled();
    expect(callbacks.setTextStream).not.toHaveBeenCalled();
    expect(callbacks.emitTelemetry).toHaveBeenCalledWith('recording.discarded', {
      outcome: 'discarded',
      reasonCode: 'component_unmounted'
    });
    expect(refs.terminalOutcomeRef.current).toBe('recording.discarded');
  });

  test('serializes audio events so a final chunk cannot overtake an earlier chunk', async () => {
    const firstUserLookup = createDeferred();
    getUserId
      .mockImplementationOnce(() => firstUserLookup.promise)
      .mockResolvedValue('user-12345678');

    await act(async () => {
      await controller.startRecording();
    });

    const sessionId = callbacks.startUploadSession.mock.calls[0][0];
    const recorder = MockMediaRecorder.instances[0];
    recorder.emitData();
    controller.stopRecording();

    await act(async () => {
      await flushPromises();
    });
    expect(getUserId).toHaveBeenCalledTimes(1);
    expect(callbacks.queueUpload).not.toHaveBeenCalled();

    await act(async () => {
      firstUserLookup.resolve('user-12345678');
      await flushPromises();
    });

    expect(callbacks.queueUpload).toHaveBeenCalledTimes(2);
    expect(callbacks.queueUpload.mock.calls[0][1]).toContain('_recording_chunk_');
    expect(callbacks.queueUpload.mock.calls[1][1]).toContain('_recording_final_');
    expect(callbacks.queueUpload.mock.calls[0][2]).toMatchObject({
      chunkOrder: 0,
      recordingJobId: sessionId,
      sessionId
    });
    expect(callbacks.queueUpload.mock.calls[1][2]).toMatchObject({
      chunkOrder: 1,
      recordingJobId: sessionId,
      sessionId
    });
  });

  test('turns a missing authenticated identity into telemetry and a terminal failure', async () => {
    getUserId.mockResolvedValue(null);

    await act(async () => {
      await controller.startRecording();
    });

    MockMediaRecorder.instances[0].emitData();
    await act(async () => {
      await flushPromises();
    });

    expect(callbacks.queueUpload).not.toHaveBeenCalled();
    expect(callbacks.emitTelemetry).toHaveBeenCalledWith('upload.failed', expect.objectContaining({
      errorCode: 'user_identity_unavailable',
      provider: 'aws_auth'
    }));
    expect(callbacks.emitTelemetry).toHaveBeenCalledWith('recording.failed', {
      errorCode: 'user_identity_unavailable',
      outcome: 'failed',
      reasonCode: 'authentication_failed'
    });
    expect(callbacks.setTextStream).toHaveBeenCalledWith(
      expect.stringContaining(AUDIO_UPLOAD_FAILURE_MESSAGE)
    );
    expect(callbacks.setTextStream).toHaveBeenCalledWith(
      expect.stringContaining(`Recording reference: ${refs.recordingJobIdRef.current}`)
    );
    expect(callbacks.onTextStreamUpdate).toHaveBeenCalledTimes(1);
    expect(callbacks.onTransitionToMainApp).toHaveBeenCalledTimes(1);
    expect(refs.terminalOutcomeRef.current).toBe('recording.failed');
  });

  test('cleans up and exposes a support reference when microphone capture cannot start', async () => {
    navigator.mediaDevices.getUserMedia.mockRejectedValueOnce(
      Object.assign(new Error('permission detail must not escape'), { name: 'NotAllowedError' })
    );

    await act(async () => {
      await controller.startRecording();
    });

    const sessionId = callbacks.startUploadSession.mock.calls[0][0];
    expect(callbacks.cancelUploadSession).toHaveBeenCalledWith(sessionId);
    expect(callbacks.emitTelemetry).toHaveBeenCalledWith('capture.failed', {
      errorCode: 'not_allowed_error',
      provider: 'media_recorder'
    });
    expect(callbacks.emitTelemetry).toHaveBeenCalledWith('recording.failed', {
      errorCode: 'capture_start_failed',
      outcome: 'failed'
    });
    expect(callbacks.setTextStream).toHaveBeenCalledWith(
      expect.stringContaining(`Recording reference: ${sessionId}`)
    );
    expect(callbacks.onTransitionToMainApp).toHaveBeenCalledTimes(1);
    expect(refs.terminalOutcomeRef.current).toBe('recording.failed');
  });

  test('contains a synchronous MediaRecorder start failure', async () => {
    MockMediaRecorder.startError = Object.assign(new Error('unsafe detail'), {
      name: 'NotSupportedError'
    });

    await act(async () => {
      await controller.startRecording();
    });

    expect(callbacks.emitTelemetry).toHaveBeenCalledWith('capture.failed', {
      errorCode: 'not_supported_error',
      provider: 'media_recorder'
    });
    expect(callbacks.emitTelemetry).toHaveBeenCalledWith('recording.failed', {
      errorCode: 'not_supported_error',
      outcome: 'failed'
    });
    expect(track.stop).toHaveBeenCalledTimes(1);
    expect(callbacks.onTransitionToMainApp).toHaveBeenCalledTimes(1);
    expect(refs.terminalOutcomeRef.current).toBe('recording.failed');
  });
});
