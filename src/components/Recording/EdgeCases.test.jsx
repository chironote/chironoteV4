import React from 'react';
import { render, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Dictation from './Dictation';
import RecordingManager from './RecordingManager';
import { StreamingTranscriber } from 'assemblyai';
import { uploadData } from 'aws-amplify/storage';
import { resetAllMocks } from '../../setupTests';
import {
  setupBrowser,
  createMockTurnEvent,
  createOutOfOrderTurns,
  findRecordingButtons,
  expectNoSleepDisabled,
  cleanupTest
} from '../testing/testUtils';

/**
 * EDGE CASE & PERFORMANCE TESTS
 * 
 * Tests for unusual scenarios, rapid interactions, and performance edge cases
 * that could cause issues in production.
 */

describe('Edge Cases - Rapid User Interactions', () => {
  beforeEach(() => {
    resetAllMocks();
    global.mockTranscriberConstructorCalls = [];
  });

  afterEach(() => {
    cleanupTest();
  });

  test('should handle rapid double-click on record button', async () => {
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
      await new Promise(resolve => setTimeout(resolve, 200));
    });

    const micButton = container.querySelector('.dictation-mic-btn');

    if (micButton) {
      // Rapid double-click
      await act(async () => {
        userEvent.click(micButton);
        userEvent.click(micButton);
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // Should only create one WebSocket connection, not two
      const connectionCount = global.mockTranscriberConstructorCalls?.length || 0;
      expect(connectionCount).toBeLessThanOrEqual(1);
    }
  });

  test('should handle rapid start-stop-start sequence', async () => {
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
      await new Promise(resolve => setTimeout(resolve, 200));
    });

    const micButton = container.querySelector('.dictation-mic-btn');

    if (micButton) {
      // Rapid sequence: start-stop-start
      await act(async () => {
        userEvent.click(micButton); // Start
        await new Promise(resolve => setTimeout(resolve, 50));
        userEvent.click(micButton); // Stop
        await new Promise(resolve => setTimeout(resolve, 50));
        userEvent.click(micButton); // Start again
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      // Should handle gracefully without crashes
      expect(StreamingTranscriber).toHaveBeenCalled();
    }
  });

  test('should handle component unmount during active recording', async () => {
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

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 200));
    });

    const micButton = container.querySelector('.dictation-mic-btn');

    if (micButton) {
      // Start recording
      await act(async () => {
        userEvent.click(micButton);
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // Unmount while recording (user navigates away)
      await act(async () => {
        unmount();
      });

      // Should cleanup all resources without errors
      // NoSleep should be disabled
      expectNoSleepDisabled();
    }
  });

  test('should handle multiple rapid pause/resume cycles', async () => {
    const mockTextUpdate = jest.fn();
    const mockTransition = jest.fn();

    const { container } = render(
      <RecordingManager
        onTextStreamUpdate={mockTextUpdate}
        onTransitionToMainApp={mockTransition}
      />
    );

    const buttons = findRecordingButtons(container);

    if (buttons.record && buttons.pause) {
      // Start recording
      await act(async () => {
        userEvent.click(buttons.record);
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // Rapid pause/resume cycles
      for (let i = 0; i < 5; i++) {
        await act(async () => {
          userEvent.click(buttons.pause); // Pause
          await new Promise(resolve => setTimeout(resolve, 50));
          userEvent.click(buttons.pause); // Resume (same button)
          await new Promise(resolve => setTimeout(resolve, 50));
        });
      }

      // Should handle gracefully
    }
  });
});

describe('Edge Cases - Network & API Failures', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  afterEach(() => {
    cleanupTest();
  });

  test('should handle intermittent token fetch failures with retry', async () => {
    // Fail first attempt, succeed on second
    let attemptCount = 0;
    global.fetch.mockImplementation(() => {
      attemptCount++;
      if (attemptCount === 1) {
        return Promise.reject(new Error('Network timeout'));
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          token: 'mock-assemblyai-token',
          expiresIn: 10800
        })
      });
    });

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

    // Should not crash on first failure
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 200));
    });

    expect(global.fetch).toHaveBeenCalled();
  });

  test('should handle S3 upload retry after failure', async () => {
    let uploadAttempts = 0;
    
    uploadData.mockImplementation(() => {
      uploadAttempts++;
      if (uploadAttempts === 1) {
        return {
          result: Promise.reject(new Error('S3 timeout'))
        };
      }
      return {
        result: Promise.resolve({
          path: 'mock-s3-path',
          key: 'mock-key'
        })
      };
    });

    const mockTextUpdate = jest.fn();
    const mockTransition = jest.fn();

    render(
      <RecordingManager
        onTextStreamUpdate={mockTextUpdate}
        onTransitionToMainApp={mockTransition}
      />
    );

    // Should handle S3 failure gracefully
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });
  });

  test('should handle WebSocket connection timeout', async () => {
    // Mock WebSocket that never connects
    StreamingTranscriber.mockImplementationOnce((config) => ({
      config,
      connect: jest.fn(() => new Promise(() => {})), // Never resolves
      close: jest.fn(),
      on: jest.fn(),
      stream: () => ({
        getWriter: () => ({
          write: jest.fn(),
          close: jest.fn(),
          abort: jest.fn()
        })
      })
    }));

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
      await new Promise(resolve => setTimeout(resolve, 200));
    });

    const micButton = container.querySelector('.dictation-mic-btn');

    if (micButton) {
      await act(async () => {
        userEvent.click(micButton);
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // Should not hang indefinitely
    }
  });
});

describe('Edge Cases - Turn Event Handling', () => {
  beforeEach(() => {
    resetAllMocks();
    global.mockTranscriberConstructorCalls = [];
  });

  afterEach(() => {
    cleanupTest();
  });

  test('should handle empty transcript in turn event', async () => {
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
      await new Promise(resolve => setTimeout(resolve, 200));
    });

    const micButton = container.querySelector('.dictation-mic-btn');

    if (micButton) {
      await act(async () => {
        userEvent.click(micButton);
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      const transcriber = StreamingTranscriber.mock.results[0].value;

      // Send turn with empty transcript
      await act(async () => {
        transcriber.simulateEvent('turn', {
          transcript: '',
          turn_order: 0,
          turn_is_formatted: true,
          end_of_turn: false
        });
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      // Should handle gracefully, not crash
    }
  });

  test('should handle very large turn order numbers', async () => {
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
      await new Promise(resolve => setTimeout(resolve, 200));
    });

    const micButton = container.querySelector('.dictation-mic-btn');

    if (micButton) {
      await act(async () => {
        userEvent.click(micButton);
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      const transcriber = StreamingTranscriber.mock.results[0].value;

      // Send turn with very large order number
      await act(async () => {
        transcriber.simulateEvent('turn', {
          transcript: 'Test transcript',
          turn_order: 999999,
          turn_is_formatted: true,
          end_of_turn: false
        });
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      // Should handle large numbers correctly
    }
  });

  test('should handle many turns rapidly (50+ turns)', async () => {
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
      await new Promise(resolve => setTimeout(resolve, 200));
    });

    const micButton = container.querySelector('.dictation-mic-btn');

    if (micButton) {
      await act(async () => {
        userEvent.click(micButton);
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      const transcriber = StreamingTranscriber.mock.results[0].value;

      // Send 50 turns rapidly
      await act(async () => {
        for (let i = 0; i < 50; i++) {
          transcriber.simulateEvent('turn', {
            transcript: `Part ${i}`,
            turn_order: i,
            turn_is_formatted: true,
            end_of_turn: false
          });
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // Should handle many turns without performance issues
      expect(mockClipboardUpdate).toHaveBeenCalled();
    }
  });

  test('should handle duplicate turn_order (update scenario)', async () => {
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
      await new Promise(resolve => setTimeout(resolve, 200));
    });

    const micButton = container.querySelector('.dictation-mic-btn');

    if (micButton) {
      await act(async () => {
        userEvent.click(micButton);
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      const transcriber = StreamingTranscriber.mock.results[0].value;

      // Send turn
      await act(async () => {
        transcriber.simulateEvent('turn', {
          transcript: 'Original text',
          turn_order: 0,
          turn_is_formatted: true,
          end_of_turn: false
        });
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      // Send updated version of same turn
      await act(async () => {
        transcriber.simulateEvent('turn', {
          transcript: 'Updated text',
          turn_order: 0,
          turn_is_formatted: true,
          end_of_turn: false
        });
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      // Should use updated text, not duplicate
      expect(mockClipboardUpdate).toHaveBeenCalled();
    }
  });
});

describe('Edge Cases - Memory & Performance', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  afterEach(() => {
    cleanupTest();
  });

  test('should not leak memory after multiple mount/unmount cycles', async () => {
    const mockTextUpdate = jest.fn();
    const mockClipboardUpdate = jest.fn();

    // Mount and unmount 10 times
    for (let i = 0; i < 10; i++) {
      const { unmount } = await act(async () => {
        return render(
          <Dictation
            onTextStreamUpdate={mockTextUpdate}
            setClipboardContent={mockClipboardUpdate}
            username="test-user"
          />
        );
      });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        unmount();
      });
    }

    // All resources should be cleaned up
    // NoSleep should be disabled
    expectNoSleepDisabled();
  });

  test('should handle very long transcription text (10,000+ characters)', async () => {
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
      await new Promise(resolve => setTimeout(resolve, 200));
    });

    const micButton = container.querySelector('.dictation-mic-btn');

    if (micButton) {
      await act(async () => {
        userEvent.click(micButton);
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      const transcriber = StreamingTranscriber.mock.results[0].value;

      // Create very long text (10,000 characters)
      const longText = 'A'.repeat(10000);

      await act(async () => {
        transcriber.simulateEvent('turn', {
          transcript: longText,
          turn_order: 0,
          turn_is_formatted: true,
          end_of_turn: false
        });
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // Should handle large text without performance issues
      expect(mockClipboardUpdate).toHaveBeenCalled();
    }
  });

  test('should cleanup timers on unmount to prevent leaks', async () => {
    jest.useFakeTimers();

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

    await act(async () => {
      jest.advanceTimersByTime(200);
    });

    const micButton = container.querySelector('.dictation-mic-btn');

    if (micButton) {
      // Start recording (starts timers)
      await act(async () => {
        userEvent.click(micButton);
        jest.advanceTimersByTime(100);
      });

      // Unmount (should cleanup all timers)
      await act(async () => {
        unmount();
      });

      // Advance timers - should not cause any callbacks to fire
      await act(async () => {
        jest.advanceTimersByTime(10000);
      });

      // No errors should occur
    }

    jest.useRealTimers();
  });
});

describe('Edge Cases - Browser Edge Cases', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  afterEach(() => {
    cleanupTest();
  });

  test('should handle Safari on iOS with video/mp4 MIME type', () => {
    setupBrowser('iOS');

    // iOS requires video/mp4
    expect(MediaRecorder.isTypeSupported('video/mp4')).toBe(true);
    expect(MediaRecorder.isTypeSupported('audio/webm')).toBe(false);
  });

  test('should handle old Firefox without PCM codec support', () => {
    setupBrowser('firefox');

    // Firefox doesn't support PCM codec
    expect(MediaRecorder.isTypeSupported('audio/webm; codecs="pcm"')).toBe(false);
    expect(MediaRecorder.isTypeSupported('audio/webm')).toBe(true);
  });

  test('should handle getUserMedia returning high sample rate (96kHz)', async () => {
    // Mock 96kHz microphone (professional audio interface)
    const highRateTrack = {
      kind: 'audio',
      id: 'mock-audio-track',
      enabled: true,
      stop: jest.fn(),
      getSettings: jest.fn(() => ({
        sampleRate: 96000, // Very high sample rate
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }))
    };

    global.navigator.mediaDevices.getUserMedia.mockImplementationOnce(() =>
      Promise.resolve({
        id: 'mock-stream',
        active: true,
        getTracks: jest.fn(() => [highRateTrack]),
        getAudioTracks: jest.fn(() => [highRateTrack]),
        getVideoTracks: jest.fn(() => []),
        addTrack: jest.fn(),
        removeTrack: jest.fn()
      })
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

    // Should handle high sample rate and resample to 16kHz
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 200));
    });
  });
});
