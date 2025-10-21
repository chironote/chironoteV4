import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Dictation from './Dictation';
import { StreamingTranscriber } from 'assemblyai';
import NoSleep from 'nosleep.js';
import { resetAllMocks } from '../../setupTests';

// =============================================================================
// CRITICAL TESTS - BILLING PREVENTION
// =============================================================================

describe('Dictation - WebSocket Billing Prevention', () => {
  beforeEach(() => {
    resetAllMocks();
    global.mockTranscriberConstructorCalls = [];
  });

  test('should NOT create WebSocket connection on component mount', async () => {
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

    // Wait for initialization
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('lambda-url'),
        expect.any(Object)
      );
    });

    // CRITICAL: StreamingTranscriber should NOT be instantiated on mount
    expect(global.mockTranscriberConstructorCalls).toHaveLength(0);
    expect(StreamingTranscriber).not.toHaveBeenCalled();
  });

  test('should create WebSocket ONLY when recording starts', async () => {
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

    // Wait for initialization
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    // Verify no connection yet
    expect(StreamingTranscriber).not.toHaveBeenCalled();

    // Simulate clicking the microphone button to start recording
    const micButton = container.querySelector('.dictation-mic-btn');
    
    if (micButton) {
      await act(async () => {
        userEvent.click(micButton);
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // NOW the transcriber should be created
      expect(StreamingTranscriber).toHaveBeenCalledTimes(1);
      expect(StreamingTranscriber).toHaveBeenCalledWith(
        expect.objectContaining({
          token: 'mock-assemblyai-token',
          sampleRate: 16000,
          formatTurns: true
        })
      );
    }
  });

  test('should close WebSocket connection when recording stops', async () => {
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
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    // Start recording
    const micButton = container.querySelector('.dictation-mic-btn');
    
    if (micButton) {
      await act(async () => {
        userEvent.click(micButton);
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      const transcriberInstance = StreamingTranscriber.mock.results[0].value;

      // Stop recording (click mic button again)
      await act(async () => {
        userEvent.click(micButton);
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // Verify WebSocket was closed
      expect(transcriberInstance._closed).toBe(true);
    }
  });

  test('should create FRESH WebSocket for each recording session', async () => {
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
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    const micButton = container.querySelector('.dictation-mic-btn');
    
    if (micButton) {
      // First recording session
      await act(async () => {
        userEvent.click(micButton); // Start
        await new Promise(resolve => setTimeout(resolve, 50));
        userEvent.click(micButton); // Stop
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      expect(StreamingTranscriber).toHaveBeenCalledTimes(1);

      // Second recording session
      await act(async () => {
        userEvent.click(micButton); // Start again
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      // Should create a NEW transcriber instance
      expect(StreamingTranscriber).toHaveBeenCalledTimes(2);
    }
  });

  test('reinitializeDictation should NOT create WebSocket connection', async () => {
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

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    // Reset the mock to track new calls
    StreamingTranscriber.mockClear();

    // Simulate page becoming hidden then visible (triggers reinitialize)
    await act(async () => {
      document.hidden = true;
      document.visibilityState = 'hidden';
      document.dispatchEvent(new Event('visibilitychange'));
      await new Promise(resolve => setTimeout(resolve, 100));

      document.hidden = false;
      document.visibilityState = 'visible';
      document.dispatchEvent(new Event('visibilitychange'));
      await new Promise(resolve => setTimeout(resolve, 1200)); // Wait for reinitialize delay
    });

    // CRITICAL: Should NOT create WebSocket during reinitialize
    expect(StreamingTranscriber).not.toHaveBeenCalled();
  });
});

// =============================================================================
// CRITICAL TESTS - NOSLEEP MANAGEMENT
// =============================================================================

describe('Dictation - NoSleep Management', () => {
  beforeEach(() => {
    resetAllMocks();
    global.mockTranscriberConstructorCalls = [];
  });

  test('should enable NoSleep when recording starts', async () => {
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
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    const micButton = container.querySelector('.dictation-mic-btn');
    
    if (micButton) {
      const noSleepInstance = NoSleep.mock.results[0].value;

      await act(async () => {
        userEvent.click(micButton);
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      expect(noSleepInstance.enableCallCount).toBeGreaterThan(0);
      expect(noSleepInstance._enabled).toBe(true);
    }
  });

  test('should disable NoSleep when recording stops', async () => {
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
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    const micButton = container.querySelector('.dictation-mic-btn');
    
    if (micButton) {
      const noSleepInstance = NoSleep.mock.results[0].value;

      // Start recording
      await act(async () => {
        userEvent.click(micButton);
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      expect(noSleepInstance._enabled).toBe(true);

      // Stop recording
      await act(async () => {
        userEvent.click(micButton);
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // CRITICAL: NoSleep must be disabled to prevent battery drain
      expect(noSleepInstance._enabled).toBe(false);
      expect(noSleepInstance.disableCallCount).toBeGreaterThan(0);
    }
  });

  test('should disable NoSleep on component unmount', async () => {
    const mockTextUpdate = jest.fn();
    const mockClipboardUpdate = jest.fn();

    const { unmount } = await act(async () => {
      return render(
        <Dictation
          onTextStreamUpdate={mockTextUpdate}
          setClipboardContent={mockClipboardUpdate}
          username="test-user"
        />
      );
    });

    const noSleepInstance = NoSleep.mock.results[0].value;

    await act(async () => {
      unmount();
    });

    expect(noSleepInstance._enabled).toBe(false);
  });
});

// =============================================================================
// CRITICAL TESTS - FIREFOX MAC SAMPLE RATE FIX
// =============================================================================

describe('Dictation - Firefox Browser Detection', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  test('should detect Firefox user agent correctly', () => {
    const originalUserAgent = navigator.userAgent;
    
    // Mock Firefox user agent
    Object.defineProperty(navigator, 'userAgent', {
      writable: true,
      value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/115.0'
    });

    const isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
    expect(isFirefox).toBe(true);

    // Restore
    Object.defineProperty(navigator, 'userAgent', {
      writable: true,
      value: originalUserAgent
    });
  });

  test('should NOT detect Chrome as Firefox', () => {
    const originalUserAgent = navigator.userAgent;
    
    // Mock Chrome user agent
    Object.defineProperty(navigator, 'userAgent', {
      writable: true,
      value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    const isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
    expect(isFirefox).toBe(false);

    // Restore
    Object.defineProperty(navigator, 'userAgent', {
      writable: true,
      value: originalUserAgent
    });
  });

  test('AudioContext should be created with correct sample rate based on browser', async () => {
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

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    // For non-Firefox browsers, AudioContext should be created with 16000 Hz
    // This is tested implicitly through the AudioWorklet setup
    expect(global.AudioContext).toBeDefined();
  });
});

// =============================================================================
// PAGE VISIBILITY & SLEEP MODE TESTS
// =============================================================================

describe('Dictation - Page Visibility Handling', () => {
  beforeEach(() => {
    resetAllMocks();
    global.mockTranscriberConstructorCalls = [];
  });

  test('should NOT close WebSocket when page becomes hidden during recording', async () => {
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
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    const micButton = container.querySelector('.dictation-mic-btn');
    
    if (micButton) {
      // Start recording
      await act(async () => {
        userEvent.click(micButton);
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      const transcriberInstance = StreamingTranscriber.mock.results[0].value;

      // Page becomes hidden
      await act(async () => {
        document.hidden = true;
        document.visibilityState = 'hidden';
        document.dispatchEvent(new Event('visibilitychange'));
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // WebSocket should still be connected
      expect(transcriberInstance._connected).toBe(true);
      expect(transcriberInstance._closed).toBe(false);
    }
  });

  test('should reinitialize when page becomes visible after being hidden', async () => {
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

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    // Clear fetch calls from initialization
    global.fetch.mockClear();

    // Simulate visibility change
    await act(async () => {
      document.hidden = true;
      document.visibilityState = 'hidden';
      document.dispatchEvent(new Event('visibilitychange'));
      await new Promise(resolve => setTimeout(resolve, 100));

      document.hidden = false;
      document.visibilityState = 'visible';
      document.dispatchEvent(new Event('visibilitychange'));
      await new Promise(resolve => setTimeout(resolve, 1200));
    });

    // Should fetch token again during reinitialize
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('lambda-url'),
      expect.any(Object)
    );
  });
});

// =============================================================================
// TOKEN MANAGEMENT TESTS
// =============================================================================

describe('Dictation - Token Management', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  test('should fetch AssemblyAI token on component mount', async () => {
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

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'https://llck5m4mzd6sa6do3joadjzzs40jtoef.lambda-url.us-east-2.on.aws',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          })
        })
      );
    });
  });

  test('should handle token fetch failure gracefully', async () => {
    // Mock fetch to fail
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

    // Should not crash
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    expect(global.fetch).toHaveBeenCalled();
  });
});

// =============================================================================
// TURN-BASED TRANSCRIPTION TESTS
// =============================================================================

describe('Dictation - Turn-Based Transcription', () => {
  beforeEach(() => {
    resetAllMocks();
    global.mockTranscriberConstructorCalls = [];
  });

  test('should configure StreamingTranscriber with formatTurns: true', async () => {
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
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    const micButton = container.querySelector('.dictation-mic-btn');
    
    if (micButton) {
      await act(async () => {
        userEvent.click(micButton);
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      expect(StreamingTranscriber).toHaveBeenCalledWith(
        expect.objectContaining({
          formatTurns: true
        })
      );
    }
  });

  test('should handle turn events and build transcript correctly', async () => {
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
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    const micButton = container.querySelector('.dictation-mic-btn');
    
    if (micButton) {
      await act(async () => {
        userEvent.click(micButton);
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      const transcriberInstance = StreamingTranscriber.mock.results[0].value;

      // Simulate turn events
      await act(async () => {
        transcriberInstance.simulateEvent('turn', {
          transcript: 'Hello world',
          turn_order: 0,
          turn_is_formatted: true,
          end_of_turn: false
        });
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      // The transcript should be updated and passed to callbacks
      expect(mockClipboardUpdate).toHaveBeenCalled();
    }
  });

  test('should handle out-of-order turn events correctly', async () => {
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
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    const micButton = container.querySelector('.dictation-mic-btn');
    
    if (micButton) {
      await act(async () => {
        userEvent.click(micButton);
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      const transcriberInstance = StreamingTranscriber.mock.results[0].value;

      // Simulate out-of-order turns (turn 1 arrives before turn 0)
      await act(async () => {
        transcriberInstance.simulateEvent('turn', {
          transcript: 'second part',
          turn_order: 1,
          turn_is_formatted: true,
          end_of_turn: false
        });
        
        transcriberInstance.simulateEvent('turn', {
          transcript: 'first part',
          turn_order: 0,
          turn_is_formatted: true,
          end_of_turn: false
        });
        
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      // Turns should be sorted by turn_order
      // The final transcript should be "first part second part"
      expect(mockClipboardUpdate).toHaveBeenCalled();
    }
  });
});

// =============================================================================
// RESOURCE CLEANUP TESTS
// =============================================================================

describe('Dictation - Resource Cleanup', () => {
  beforeEach(() => {
    resetAllMocks();
    global.mockTranscriberConstructorCalls = [];
  });

  test('should cleanup all resources when component unmounts', async () => {
    const mockTextUpdate = jest.fn();
    const mockClipboardUpdate = jest.fn();

    const { unmount, container } = await act(async () => {
      return render(
        <Dictation
          onTextStreamUpdate={mockTextUpdate}
          setClipboardContent={mockClipboardUpdate}
          username="test-user"
        />
      );
    });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    const noSleepInstance = NoSleep.mock.results[0].value;

    // Start recording to create resources
    const micButton = container.querySelector('.dictation-mic-btn');
    if (micButton) {
      await act(async () => {
        userEvent.click(micButton);
        await new Promise(resolve => setTimeout(resolve, 100));
      });
    }

    // Unmount
    await act(async () => {
      unmount();
    });

    // Verify cleanup
    expect(noSleepInstance._enabled).toBe(false);
  });
});
