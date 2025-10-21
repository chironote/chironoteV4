/**
 * Testing Utilities for ChiroNote
 * 
 * Provides helper functions for simulating browser environments,
 * creating mock data, and testing audio recording functionality.
 */

// =============================================================================
// BROWSER SIMULATION HELPERS
// =============================================================================

/**
 * Simulates different browser user agents
 */
export const setupBrowser = (browserType) => {
  const userAgents = {
    chrome: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    firefox: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0',
    firefoxMac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/115.0',
    safari: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
    iOS: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    edge: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0'
  };

  if (userAgents[browserType]) {
    Object.defineProperty(navigator, 'userAgent', {
      writable: true,
      configurable: true,
      value: userAgents[browserType]
    });
  }

  return navigator.userAgent;
};

/**
 * Resets browser simulation to default
 */
export const resetBrowser = () => {
  Object.defineProperty(navigator, 'userAgent', {
    writable: true,
    configurable: true,
    value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  });
};

// =============================================================================
// PERMISSION STATE HELPERS
// =============================================================================

/**
 * Simulates microphone permission states
 */
export const setMicrophonePermission = (state) => {
  const permissionStates = {
    granted: 'granted',
    denied: 'denied',
    prompt: 'prompt'
  };

  global.navigator.permissions.query.mockImplementation(() =>
    Promise.resolve({ state: permissionStates[state] || 'prompt' })
  );

  if (state === 'denied') {
    global.navigator.mediaDevices.getUserMedia.mockImplementation(() =>
      Promise.reject(new DOMException('Permission denied', 'NotAllowedError'))
    );
  } else if (state === 'granted') {
    global.navigator.mediaDevices.getUserMedia.mockImplementation(() =>
      Promise.resolve(createMockMediaStream())
    );
  }
};

/**
 * Creates a mock MediaStream with audio track
 */
export const createMockMediaStream = (sampleRate = 48000) => ({
  id: `mock-stream-${Date.now()}`,
  active: true,
  getTracks: jest.fn(() => [createMockAudioTrack(sampleRate)]),
  getAudioTracks: jest.fn(() => [createMockAudioTrack(sampleRate)]),
  getVideoTracks: jest.fn(() => []),
  addTrack: jest.fn(),
  removeTrack: jest.fn()
});

/**
 * Creates a mock audio track
 */
export const createMockAudioTrack = (sampleRate = 48000) => ({
  kind: 'audio',
  id: `mock-audio-track-${Date.now()}`,
  enabled: true,
  stop: jest.fn(),
  getSettings: jest.fn(() => ({
    sampleRate,
    channelCount: 1,
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true
  }))
});

// =============================================================================
// AUDIO DATA SIMULATION
// =============================================================================

/**
 * Simulates turn events from AssemblyAI
 */
export const createMockTurnEvent = (turnOrder, transcript, options = {}) => ({
  transcript,
  turn_order: turnOrder,
  turn_is_formatted: options.isFormatted !== false,
  end_of_turn: options.endOfTurn || false,
  ...options
});

/**
 * Simulates multiple turn events for testing
 */
export const createMockTurnSequence = (transcripts) => {
  return transcripts.map((transcript, index) =>
    createMockTurnEvent(index, transcript)
  );
};

/**
 * Simulates out-of-order turn events
 */
export const createOutOfOrderTurns = () => [
  createMockTurnEvent(2, 'third part'),
  createMockTurnEvent(0, 'first part'),
  createMockTurnEvent(1, 'second part')
];

/**
 * Creates mock audio blob
 */
export const createMockAudioBlob = (size = 1024, type = 'audio/webm') => {
  const content = new Array(size).fill('a');
  return new Blob(content, { type });
};

// =============================================================================
// TIME CONTROL HELPERS
// =============================================================================

/**
 * Advances timers by specified duration
 */
export const advanceTime = async (ms) => {
  await act(async () => {
    jest.advanceTimersByTime(ms);
    await Promise.resolve(); // Flush promises
  });
};

/**
 * Runs all pending timers
 */
export const flushTimers = async () => {
  await act(async () => {
    jest.runOnlyPendingTimers();
    await Promise.resolve();
  });
};

// =============================================================================
// PAGE VISIBILITY HELPERS
// =============================================================================

/**
 * Simulates page becoming hidden
 */
export const hidePage = () => {
  document.hidden = true;
  document.visibilityState = 'hidden';
  document.dispatchEvent(new Event('visibilitychange'));
};

/**
 * Simulates page becoming visible
 */
export const showPage = () => {
  document.hidden = false;
  document.visibilityState = 'visible';
  document.dispatchEvent(new Event('visibilitychange'));
};

/**
 * Simulates page visibility cycle (hidden then visible)
 */
export const cyclePageVisibility = async (hiddenDuration = 1000) => {
  hidePage();
  await advanceTime(hiddenDuration);
  showPage();
  await advanceTime(100);
};

// =============================================================================
// ASSEMBLYAI TOKEN HELPERS
// =============================================================================

/**
 * Creates mock AssemblyAI token response
 */
export const createMockTokenResponse = (options = {}) => ({
  token: options.token || 'mock-assemblyai-token',
  expiresIn: options.expiresIn || 10800 // 3 hours
});

/**
 * Simulates token expiry
 */
export const simulateExpiredToken = () => {
  global.fetch.mockImplementationOnce(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        token: 'expired-token',
        expiresIn: -1 // Already expired
      })
    })
  );
};

/**
 * Simulates token fetch failure
 */
export const simulateTokenFetchFailure = () => {
  global.fetch.mockImplementationOnce(() =>
    Promise.reject(new Error('Network error'))
  );
};

// =============================================================================
// S3 & SQS HELPERS
// =============================================================================

/**
 * Simulates S3 upload success
 */
export const mockS3UploadSuccess = (path = 'mock-s3-path') => {
  const { uploadData } = require('aws-amplify/storage');
  uploadData.mockImplementationOnce(() => ({
    result: Promise.resolve({
      path,
      key: `mock-key-${Date.now()}`
    })
  }));
};

/**
 * Simulates S3 upload failure
 */
export const mockS3UploadFailure = (error = 'S3 upload failed') => {
  const { uploadData } = require('aws-amplify/storage');
  uploadData.mockImplementationOnce(() => ({
    result: Promise.reject(new Error(error))
  }));
};

/**
 * Verifies S3 upload was called with correct parameters
 */
export const expectS3Upload = (userId, timestamp, isFinal = false) => {
  const { uploadData } = require('aws-amplify/storage');
  
  expect(uploadData).toHaveBeenCalledWith(
    expect.objectContaining({
      path: expect.stringContaining(userId),
      data: expect.any(Blob),
      options: expect.objectContaining({
        contentType: 'audio/webm',
        metadata: expect.objectContaining({
          timestamp: timestamp.toString(),
          userId
        })
      })
    })
  );

  if (isFinal) {
    expect(uploadData).toHaveBeenCalledWith(
      expect.objectContaining({
        path: expect.stringContaining('_final_')
      })
    );
  }
};

/**
 * Verifies SQS message was sent
 */
export const expectSQSMessage = (userId, timestamp, isFinal = false) => {
  const { SendMessageCommand } = require('@aws-sdk/client-sqs');
  
  expect(SendMessageCommand).toHaveBeenCalledWith(
    expect.objectContaining({
      QueueUrl: expect.stringContaining('AudioTranscriptionQueue'),
      MessageBody: expect.stringContaining(userId),
      MessageGroupId: userId
    })
  );
};

// =============================================================================
// COMPONENT INTERACTION HELPERS
// =============================================================================

/**
 * Finds recording control buttons
 */
export const findRecordingButtons = (container) => ({
  record: container.querySelector('[data-testid="record-button"]') ||
          container.querySelector('.record-button'),
  stop: container.querySelector('[data-testid="stop-button"]') ||
        container.querySelector('.stop-button'),
  pause: container.querySelector('[data-testid="pause-button"]') ||
         container.querySelector('.pause-button'),
  resume: container.querySelector('[data-testid="resume-button"]') ||
          container.querySelector('.resume-button'),
  discard: container.querySelector('[data-testid="discard-button"]') ||
           container.querySelector('.discard-button'),
  mic: container.querySelector('.dictation-mic-btn')
});

/**
 * Simulates full recording session
 */
export const simulateRecordingSession = async (container, duration = 5000) => {
  const buttons = findRecordingButtons(container);
  
  if (buttons.record) {
    // Start recording
    await act(async () => {
      userEvent.click(buttons.record);
      await advanceTime(100);
    });

    // Record for specified duration
    await advanceTime(duration);

    // Stop recording
    if (buttons.stop) {
      await act(async () => {
        userEvent.click(buttons.stop);
        await advanceTime(100);
      });
    }
  }

  return buttons;
};

// =============================================================================
// NOSLEEP VERIFICATION HELPERS
// =============================================================================

/**
 * Gets NoSleep instance from component
 */
export const getNoSleepInstance = () => {
  const NoSleep = require('nosleep.js');
  return NoSleep.mock.results[0]?.value;
};

/**
 * Verifies NoSleep was enabled
 */
export const expectNoSleepEnabled = () => {
  const noSleep = getNoSleepInstance();
  expect(noSleep?._enabled).toBe(true);
  expect(noSleep?.enableCallCount).toBeGreaterThan(0);
};

/**
 * Verifies NoSleep was disabled
 */
export const expectNoSleepDisabled = () => {
  const noSleep = getNoSleepInstance();
  expect(noSleep?._enabled).toBe(false);
};

// =============================================================================
// WEBSOCKET VERIFICATION HELPERS
// =============================================================================

/**
 * Gets StreamingTranscriber instance count
 */
export const getTranscriberInstanceCount = () => {
  return global.mockTranscriberConstructorCalls?.length || 0;
};

/**
 * Verifies no WebSocket connection exists
 */
export const expectNoWebSocket = () => {
  const count = getTranscriberInstanceCount();
  expect(count).toBe(0);
};

/**
 * Verifies WebSocket connection was created
 */
export const expectWebSocketCreated = () => {
  const count = getTranscriberInstanceCount();
  expect(count).toBeGreaterThan(0);
};

/**
 * Gets the latest transcriber instance
 */
export const getLatestTranscriber = () => {
  const { StreamingTranscriber } = require('assemblyai');
  const instances = StreamingTranscriber.mock.results;
  return instances[instances.length - 1]?.value;
};

/**
 * Verifies WebSocket was closed
 */
export const expectWebSocketClosed = () => {
  const transcriber = getLatestTranscriber();
  expect(transcriber?._closed).toBe(true);
  expect(transcriber?._connected).toBe(false);
};

// =============================================================================
// CLEANUP HELPERS
// =============================================================================

/**
 * Complete cleanup between tests
 */
export const cleanupTest = () => {
  jest.clearAllMocks();
  resetBrowser();
  document.hidden = false;
  document.visibilityState = 'visible';
  global.localStorage.clear();
  global.mockTranscriberConstructorCalls = [];
};

// Re-export from testing library
export { act } from '@testing-library/react';
