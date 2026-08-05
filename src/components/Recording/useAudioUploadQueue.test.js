import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { uploadData } from 'aws-amplify/storage';
import { SQSClient } from '@aws-sdk/client-sqs';
import { generateToken, getAwsCredentials } from './recordingAuth';
import useAudioUploadQueue from './useAudioUploadQueue';

jest.mock('aws-amplify/storage', () => ({
  uploadData: jest.fn()
}));

jest.mock('@aws-sdk/client-sqs', () => ({
  SQSClient: jest.fn(),
  SendMessageCommand: jest.fn((input) => input)
}));

jest.mock('./recordingAuth', () => ({
  generateToken: jest.fn(),
  getAwsCredentials: jest.fn()
}));

const createDeferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
};

const flushPromises = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

describe('useAudioUploadQueue', () => {
  let container;
  let consoleError;
  let consoleLog;
  let controller;
  let root;
  let mockSend;
  let onFinalAudioQueued;
  let onUploadError;

  const Harness = () => {
    controller = useAudioUploadQueue({
      filePathRef: { current: null },
      onFinalAudioQueued,
      onUploadError
    });
    return null;
  };

  beforeEach(() => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    mockSend = jest.fn();
    onFinalAudioQueued = jest.fn();
    onUploadError = jest.fn();
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});

    getAwsCredentials.mockResolvedValue({
      accessKeyId: 'test',
      secretAccessKey: 'test'
    });
    generateToken.mockResolvedValue('test-token');
    SQSClient.mockImplementation(() => ({ send: mockSend }));

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
    global.IS_REACT_ACT_ENVIRONMENT = false;
    jest.clearAllMocks();
  });

  const queueFinalMp4 = () => {
    controller.startUploadSession('session-1');
    controller.queueUpload(
      new Blob(['audio'], { type: 'video/mp4' }),
      'protected/user/1_recording_final_path_0.mp4',
      {
        contentType: 'video/mp4',
        sessionId: 'session-1',
        timestamp: 1,
        userId: 'user-12345678'
      }
    );
  };

  test('cancels an active Amplify upload and suppresses late callbacks', async () => {
    const upload = createDeferred();
    const cancel = jest.fn();
    uploadData.mockReturnValue({ cancel, result: upload.promise });

    await act(async () => {
      queueFinalMp4();
      await flushPromises();
    });

    expect(uploadData).toHaveBeenCalledTimes(1);

    act(() => {
      controller.cancelUploadSession('session-1');
    });
    expect(cancel).toHaveBeenCalledWith('Recording session cancelled');

    await act(async () => {
      upload.resolve({ path: 'cancelled-upload' });
      await flushPromises();
    });

    expect(mockSend).not.toHaveBeenCalled();
    expect(onFinalAudioQueued).not.toHaveBeenCalled();
    expect(onUploadError).not.toHaveBeenCalled();
  });

  test('reports a final SQS failure once instead of retrying forever', async () => {
    uploadData.mockReturnValue({
      cancel: jest.fn(),
      result: Promise.resolve({ path: 'uploaded' })
    });
    mockSend.mockRejectedValue(new Error('SQS unavailable'));

    await act(async () => {
      queueFinalMp4();
      await flushPromises();
    });

    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(onUploadError).toHaveBeenCalledTimes(1);
    expect(onUploadError.mock.calls[0][0]).toMatchObject({
      name: 'RecordingUploadError',
      stage: 'queue notification'
    });
    expect(onFinalAudioQueued).not.toHaveBeenCalled();
  });

  test('uploads Safari audio with matching MP4 metadata and completes once', async () => {
    uploadData.mockReturnValue({
      cancel: jest.fn(),
      result: Promise.resolve({ path: 'uploaded' })
    });
    mockSend.mockResolvedValue({ MessageId: 'message-1' });

    await act(async () => {
      queueFinalMp4();
      await flushPromises();
    });

    expect(uploadData).toHaveBeenCalledWith(expect.objectContaining({
      path: expect.stringMatching(/\.mp4$/),
      options: expect.objectContaining({
        contentType: 'video/mp4'
      })
    }));
    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(onFinalAudioQueued).toHaveBeenCalledTimes(1);
    expect(onUploadError).not.toHaveBeenCalled();
  });
});
