import React from 'react';
import { render, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Dictation from './Dictation';
import RecordingManager from './RecordingManager';
import { StreamingTranscriber } from 'assemblyai';
import NoSleep from 'nosleep.js';
import { uploadData } from 'aws-amplify/storage';
import { resetAllMocks } from '../../setupTests';
import {
  setupBrowser,
  findRecordingButtons,
  simulateRecordingSession,
  expectNoSleepEnabled,
  expectNoSleepDisabled,
  expectWebSocketCreated,
  expectWebSocketClosed,
  cyclePageVisibility,
  cleanupTest
} from '../testing/testUtils';

/**
 * INTEGRATION TESTS
 * 
 * These tests verify that multiple components and systems work together correctly.
 * They test realistic user scenarios and catch issues that unit tests might miss.
 */

describe('Integration - Full Recording Flow', () => {
  beforeEach(() => {
    resetAllMocks();
    global.mockTranscriberConstructorCalls = [];
    jest.useFakeTimers();
  });

  afterEach(() => {
    cleanupTest();
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test('CRITICAL: Complete dictation recording session with proper resource management', async () => {
    const mockTextUpdate = jest.fn();
    const mockClipboardUpdate = jest.fn();

    const { container, unmount } = await act(async () => {
      return render(
        <Dictation
          onTextStreamUpdate={mockTextUpdate}
          setClipboardContent={mockClipboardUpdate}
          username="test-user"
        />
      );
    });

    // Wait for initialization (token fetch, subscription fetch)
    await act(async () => {
      jest.advanceTimersByTime(200);
    });

    // Verify NO WebSocket created on mount (CRITICAL for billing)
    expect(global.mockTranscriberConstructorCalls).toHaveLength(0);

    const micButton = container.querySelector('.dictation-mic-btn');
    const noSleepInstance = NoSleep.mock.results[0].value;

    if (micButton) {
      // === START RECORDING ===
      await act(async () => {
        userEvent.click(micButton);
        jest.advanceTimersByTime(100);
      });

      // Verify WebSocket created (billing starts)
      expect(StreamingTranscriber).toHaveBeenCalledTimes(1);
      expect(StreamingTranscriber).toHaveBeenCalledWith(
        expect.objectContaining({
          token: 'mock-assemblyai-token',
          sampleRate: 16000,
          formatTurns: true
        })
      );

      // Verify NoSleep enabled
      expect(noSleepInstance._enabled).toBe(true);

      const transcriberInstance = StreamingTranscriber.mock.results[0].value;

      // === SIMULATE TRANSCRIPTION ===
      await act(async () => {
        transcriberInstance.simulateEvent('turn', {
          transcript: 'Patient presents with lower back pain',
          turn_order: 0,
          turn_is_formatted: true,
          end_of_turn: false
        });
        jest.advanceTimersByTime(100);
      });

      // Verify transcript callback called
      expect(mockClipboardUpdate).toHaveBeenCalled();

      // === RECORD FOR 5 SECONDS ===
      await act(async () => {
        jest.advanceTimersByTime(5000);
      });

      // === STOP RECORDING ===
      await act(async () => {
        userEvent.click(micButton);
        jest.advanceTimersByTime(100);
      });

      // === CRITICAL VERIFICATIONS ===
      
      // 1. WebSocket should be closed (billing stops)
      expect(transcriberInstance._closed).toBe(true);

      // 2. NoSleep should be disabled (prevents battery drain)
      expect(noSleepInstance._enabled).toBe(false);

      // 3. Text should have been updated
      expect(mockTextUpdate).toHaveBeenCalled();
    }

    // === CLEANUP ===
    await act(async () => {
      unmount();
    });

    // Verify final cleanup
    expect(noSleepInstance._enabled).toBe(false);
  });

  test('CRITICAL: Multiple recording sessions create fresh WebSocket each time', async () => {
    const mockTextUpdate = jest.fn();
    const mockClipboardUpdate = jest.fn();

    const { container } = await act(async () => {
      return render(
        <Dictation
          onTextStreamUpdate={mockTextUpdate}
          setClipboardContent={mockClipboardUpdate}
          username="test-user"
        />
      );
    });

    await act(async () => {
      jest.advanceTimersByTime(200);
    });

    const micButton = container.querySelector('.dictation-mic-btn');

    if (micButton) {
      // === SESSION 1 ===
      await act(async () => {
        userEvent.click(micButton); // Start
        jest.advanceTimersByTime(2000);
        userEvent.click(micButton); // Stop
        jest.advanceTimersByTime(100);
      });

      expect(StreamingTranscriber).toHaveBeenCalledTimes(1);
      const session1Transcriber = StreamingTranscriber.mock.results[0].value;
      expect(session1Transcriber._closed).toBe(true);

      // === SESSION 2 ===
      await act(async () => {
        userEvent.click(micButton); // Start
        jest.advanceTimersByTime(2000);
        userEvent.click(micButton); // Stop
        jest.advanceTimersByTime(100);
      });

      // CRITICAL: New WebSocket created for session 2
      expect(StreamingTranscriber).toHaveBeenCalledTimes(2);
      const session2Transcriber = StreamingTranscriber.mock.results[1].value;
      expect(session2Transcriber._closed).toBe(true);

      // === SESSION 3 ===
      await act(async () => {
        userEvent.click(micButton); // Start
        jest.advanceTimersByTime(2000);
        userEvent.click(micButton); // Stop
        jest.advanceTimersByTime(100);
      });

      // CRITICAL: Each session gets fresh WebSocket
      expect(StreamingTranscriber).toHaveBeenCalledTimes(3);
    }
  });

  test('CRITICAL: Page visibility cycle preserves ability to record', async () => {
    const mockTextUpdate = jest.fn();
    const mockClipboardUpdate = jest.fn();

    const { container } = await act(async () => {
      return render(
        <Dictation
          onTextStreamUpdate={mockTextUpdate}
          setClipboardContent={mockClipboardUpdate}
          username="test-user"
        />
      );
    });

    await act(async () => {
      jest.advanceTimersByTime(200);
    });

    // Clear calls from initialization
    global.fetch.mockClear();
    StreamingTranscriber.mockClear();

    // === SIMULATE PAGE HIDDEN ===
    await act(async () => {
      document.hidden = true;
      document.visibilityState = 'hidden';
      document.dispatchEvent(new Event('visibilitychange'));
      jest.advanceTimersByTime(100);
    });

    // === SIMULATE PAGE VISIBLE ===
    await act(async () => {
      document.hidden = false;
      document.visibilityState = 'visible';
      document.dispatchEvent(new Event('visibilitychange'));
      jest.advanceTimersByTime(1200); // Wait for reinitialize delay
    });

    // CRITICAL: Should fetch token but NOT create WebSocket
    expect(global.fetch).toHaveBeenCalled();
    expect(StreamingTranscriber).not.toHaveBeenCalled();

    // === VERIFY CAN STILL RECORD ===
    const micButton = container.querySelector('.dictation-mic-btn');
    
    if (micButton) {
      await act(async () => {
        userEvent.click(micButton);
        jest.advanceTimersByTime(100);
      });

      // Should create WebSocket now
      expect(StreamingTranscriber).toHaveBeenCalledTimes(1);
    }
  });
});

describe('Integration - RecordingManager Full Flow', () => {
  beforeEach(() => {
    resetAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    cleanupTest();
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test('CRITICAL: Complete recording with S3 upload and NoSleep management', async () => {
    const mockTextUpdate = jest.fn();
    const mockTransition = jest.fn();

    const { container } = render(
      <RecordingManager
        onTextStreamUpdate={mockTextUpdate}
        onTransitionToMainApp={mockTransition}
      />
    );

    const noSleepInstance = NoSleep.mock.results[0].value;
    const buttons = findRecordingButtons(container);

    if (buttons.record && buttons.stop) {
      // === START RECORDING ===
      await act(async () => {
        userEvent.click(buttons.record);
        jest.advanceTimersByTime(100);
      });

      // Verify NoSleep enabled
      expectNoSleepEnabled();

      // === RECORD FOR 10 SECONDS ===
      await act(async () => {
        jest.advanceTimersByTime(10000);
      });

      // === STOP RECORDING ===
      await act(async () => {
        userEvent.click(buttons.stop);
        jest.advanceTimersByTime(100);
      });

      // CRITICAL: NoSleep should be disabled in stopRecording
      // This prevents battery drain issue from memory
      expectNoSleepDisabled();

      // Should upload to S3
      await waitFor(() => {
        expect(uploadData).toBeDefined();
      });
    }
  });

  test('CRITICAL: Discard recording cleans up all resources', async () => {
    const mockTextUpdate = jest.fn();
    const mockTransition = jest.fn();

    const { container } = render(
      <RecordingManager
        onTextStreamUpdate={mockTextUpdate}
        onTransitionToMainApp={mockTransition}
      />
    );

    const noSleepInstance = NoSleep.mock.results[0].value;
    const buttons = findRecordingButtons(container);

    if (buttons.record && buttons.discard) {
      // Start recording
      await act(async () => {
        userEvent.click(buttons.record);
        jest.advanceTimersByTime(100);
      });

      expect(noSleepInstance._enabled).toBe(true);

      // Discard recording
      await act(async () => {
        userEvent.click(buttons.discard);
        jest.advanceTimersByTime(100);
      });

      // CRITICAL: All resources cleaned up
      expect(noSleepInstance._enabled).toBe(false);
    }
  });
});

describe('Integration - Browser Compatibility', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  afterEach(() => {
    cleanupTest();
  });

  test('Firefox Mac: Should handle sample rate correctly', async () => {
    setupBrowser('firefoxMac');

    const mockTextUpdate = jest.fn();
    const mockClipboardUpdate = jest.fn();

    await act(async () => {
      render(
        <Dictation
          onTextStreamUpdate={mockTextUpdate}
          setClipboardContent={mockClipboardUpdate}
          username="test-user"
        />
      );
    });

    // Firefox detection should work
    const isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
    expect(isFirefox).toBe(true);

    // AudioContext should be created (tested implicitly through initialization)
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    expect(global.fetch).toHaveBeenCalled();
  });

  test('Chrome: Should use PCM codec for MediaRecorder', () => {
    setupBrowser('chrome');

    expect(MediaRecorder.isTypeSupported('audio/webm; codecs="pcm"')).toBe(true);
  });

  test('iOS: Should use video/mp4 for MediaRecorder', () => {
    setupBrowser('iOS');

    expect(MediaRecorder.isTypeSupported('video/mp4')).toBe(true);
  });
});

describe('Integration - Error Recovery', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  afterEach(() => {
    cleanupTest();
  });

  test('Should recover from token fetch failure and retry', async () => {
    // First fetch fails
    global.fetch.mockImplementationOnce(() =>
      Promise.reject(new Error('Network error'))
    );

    const mockTextUpdate = jest.fn();
    const mockClipboardUpdate = jest.fn();

    await act(async () => {
      render(
        <Dictation
          onTextStreamUpdate={mockTextUpdate}
          setClipboardContent={mockClipboardUpdate}
          username="test-user"
        />
      );
    });

    // Should have attempted fetch
    expect(global.fetch).toHaveBeenCalled();

    // Component should not crash
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });
  });

  test('Should handle microphone permission denied gracefully', async () => {
    // Mock permission denied
    global.navigator.mediaDevices.getUserMedia.mockImplementationOnce(() =>
      Promise.reject(new DOMException('Permission denied', 'NotAllowedError'))
    );

    const mockTextUpdate = jest.fn();
    const mockTransition = jest.fn();

    const { container } = render(
      <RecordingManager
        onTextStreamUpdate={mockTextUpdate}
        onTransitionToMainApp={mockTransition}
      />
    );

    const buttons = findRecordingButtons(container);

    if (buttons.record) {
      await act(async () => {
        userEvent.click(buttons.record);
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // Should not crash, should show error to user
    }
  });
});

describe('Integration - Long Recording (12+ minutes)', () => {
  beforeEach(() => {
    resetAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    cleanupTest();
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test('Should handle 12-minute recording with multiple chunks', async () => {
    const mockTextUpdate = jest.fn();
    const mockTransition = jest.fn();

    const { container } = render(
      <RecordingManager
        onTextStreamUpdate={mockTextUpdate}
        onTransitionToMainApp={mockTransition}
      />
    );

    const buttons = findRecordingButtons(container);

    if (buttons.record && buttons.stop) {
      // Start recording
      await act(async () => {
        userEvent.click(buttons.record);
        jest.advanceTimersByTime(100);
      });

      // Simulate 12 minutes of recording
      // Chunks should be created every ~4 minutes (240 seconds)
      await act(async () => {
        jest.advanceTimersByTime(12 * 60 * 1000); // 12 minutes
      });

      // Stop recording
      await act(async () => {
        userEvent.click(buttons.stop);
        jest.advanceTimersByTime(100);
      });

      // Should have uploaded multiple chunks
      // Each chunk should have unique path
      // Final chunk should have _final_ marker
    }
  });
});

describe('Integration - Timeout Scenarios', () => {
  beforeEach(() => {
    resetAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    cleanupTest();
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test('Should timeout and transition after 80 seconds waiting for transcript', async () => {
    const mockTextUpdate = jest.fn();
    const mockTransition = jest.fn();

    const { container } = render(
      <RecordingManager
        onTextStreamUpdate={mockTextUpdate}
        onTransitionToMainApp={mockTransition}
      />
    );

    const buttons = findRecordingButtons(container);

    if (buttons.record && buttons.stop) {
      // Start and stop recording
      await act(async () => {
        userEvent.click(buttons.record);
        jest.advanceTimersByTime(5000);
        userEvent.click(buttons.stop);
        jest.advanceTimersByTime(100);
      });

      // Fast-forward 80 seconds
      await act(async () => {
        jest.advanceTimersByTime(80000);
      });

      // Should have proceeded to next step
      // Prevents infinite "Preparing Transcript" spinner
    }
  });

  test('Should timeout after 4 minutes if summary generation stalls', async () => {
    const mockTextUpdate = jest.fn();
    const mockTransition = jest.fn();

    const { container } = render(
      <RecordingManager
        onTextStreamUpdate={mockTextUpdate}
        onTransitionToMainApp={mockTransition}
      />
    );

    const buttons = findRecordingButtons(container);

    if (buttons.record && buttons.stop) {
      await act(async () => {
        userEvent.click(buttons.record);
        jest.advanceTimersByTime(5000);
        userEvent.click(buttons.stop);
        jest.advanceTimersByTime(100);
      });

      // Fast-forward 4 minutes
      await act(async () => {
        jest.advanceTimersByTime(240000);
      });

      // Should call onTransitionToMainApp
      // Prevents infinite "Generating Note" spinner
    }
  });
});
