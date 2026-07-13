---
type: feature-reference
title: "Dictation.jsx Context"
description: "Legacy implementation reference for AssemblyAI realtime dictation and AudioWorklet streaming."
resource: "../../src/components/Recording/Dictation.md"
tags: [chironote, component, recording, dictation, legacy]
---


> Source: [`Dictation.md`](../../src/components/Recording/Dictation.md)

# Dictation.jsx Context

## Overview
Complete implementation of Dictation.jsx using native Web Audio API instead of RecordRTC for AssemblyAI streaming. Eliminates audio format mismatch issues and provides better hardware compatibility through direct PCM streaming.

## ES6 Imports Required

```javascript
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { StreamingTranscriber } from 'assemblyai';
import NoSleep from 'nosleep.js';
import './Recording.css';
import { generateClient } from 'aws-amplify/api';
import * as queries from '../../graphql/queries';
import * as mutations from '../../graphql/mutations';
import { getCurrentUser } from 'aws-amplify/auth';
import CreditPopup from './CreditLimit';
```

**CRITICAL**: RecordRTC is NOT imported - replaced with native Web Audio API

## Constants

```javascript
const client = generateClient();

// Token and connection constants
const TOKEN_REFRESH_BUFFER_MINUTES = 10;
const TOKEN_EXPIRY_HOURS = 2.9;

// Audio processing constants - AssemblyAI streaming requirements
const SAMPLE_RATE = 16000;    // AssemblyAI requires EXACTLY 16kHz - no flexibility
const CHANNELS = 1;           // AssemblyAI requires mono audio only
const BUFFER_SIZE = 4096;     // Web Audio API buffer size
```

## State Variables

### Status State Object
```javascript
const [status, setStatus] = useState({
  isLoading: false,
  isTranscribing: false,
  isInitialized: false,
  isTranscriberReady: false,
  isQueued: false,
  isStopping: false
});
```

### Data State Variables
```javascript
const [transcription, setTranscription] = useState('');
const [token, setToken] = useState({
  value: null,
  expiry: null
});
const [subscription, setSubscription] = useState({
  data: null,
  hasHours: false
});
const [timer, setTimer] = useState(0);
const [showCreditPopup, setShowCreditPopup] = useState(false);
```

## Ref Variables

### Core Refs
```javascript
// AssemblyAI connection
const transcriberRef = useRef(null);

// Web Audio API refs (AudioWorklet implementation)
const audioContextRef = useRef(null);
const audioWorkletNodeRef = useRef(null);  // Replaces deprecated ScriptProcessor
const streamRef = useRef(null);
const readableStreamRef = useRef(null);

// Utility refs
const noSleepRef = useRef(null);
const timerIntervalRef = useRef(null);
const tokenRefreshTimeoutRef = useRef(null);
const heartbeatIntervalRef = useRef(null);

// Data refs
const turnsRef = useRef({});              // Stores turn data by turn_order
const currentTurnOrderRef = useRef(-1);    // Tracks latest turn order received

// Control flow refs
const isInitializingRef = useRef(false);
const isConnectingRef = useRef(false);
const isReconnectingRef = useRef(false);
```

## Flow Logic Description

### Initialization Flow
1. **Component Mount**:
   - Initialize NoSleep
   - Fetch AssemblyAI token via lambda
   - Fetch user subscription data
   - Setup transcription connection in advance
   - Set isInitialized to true

2. **Token Management**:
   - Check token expiry every minute
   - Auto-refresh tokens before expiration
   - Refresh transcription connection with new tokens

3. **Subscription Validation**:
   - Check user hours remaining
   - Show credit popup if insufficient hours
   - Update hours after recording sessions

### Recording Flow
1. **Start Dictation**:
   - Validate subscription hours
   - Ensure token is valid and transcriber ready
   - Request microphone permission with flexible constraints
   - Setup Web Audio API pipeline
   - Start ReadableStream to AssemblyAI
   - Enable NoSleep
   - Start timer

2. **During Recording**:
   - Process audio data through ScriptProcessor
   - Convert Float32 to Int16 PCM
   - Stream PCM directly to AssemblyAI via ReadableStream
   - Handle real-time transcript updates
   - Update clipboard content

3. **Stop Dictation**:
   - Stop ReadableStream
   - Clean up Web Audio API resources
   - Disable NoSleep
   - Calculate hours used and update subscription
   - Send final transcription to parent
   - Re-initialize connection for next session

### Error Handling & Reconnection
1. **Connection Management**:
   - Detect unexpected disconnections
   - Auto-reconnect with fresh tokens
   - Prevent multiple simultaneous connections
   - Queue actions during transitions

2. **Resource Cleanup**:
   - Proper AudioContext disposal
   - Stream track cleanup
   - Clear all intervals and timeouts
   - Reset all refs to null

## Web Audio API Implementation with AudioWorklet (Modern Approach)

**CRITICAL**: This implementation uses AudioWorklet instead of deprecated ScriptProcessorNode for better performance and reliability. The AudioWorklet processor code is embedded directly in Dictation.jsx as a blob URL.

### AudioWorklet Processor Code (Embedded in Component)
```javascript
// This code will be created as a blob URL and loaded into AudioWorklet
const audioProcessorCode = `
const MAX_16BIT_INT = 32767;

class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.audioBufferQueue = new Int16Array(0);
  }

  process(inputs) {
    try {
      const input = inputs[0];
      if (!input || !input[0]) return true;

      const channelData = input[0];
      const float32Array = Float32Array.from(channelData);

      // Convert Float32 to Int16 with proper clamping
      const int16Array = Int16Array.from(
        float32Array.map((sample) => {
          const clamped = Math.max(-1, Math.min(1, sample));
          return clamped < 0 ? clamped * 32768 : clamped * MAX_16BIT_INT;
        })
      );

      // Merge with existing buffer queue
      this.audioBufferQueue = this.mergeBuffers(this.audioBufferQueue, int16Array);

      // Send chunks of 100ms duration (1600 samples at 16kHz)
      const samplesFor100ms = 1600;
      while (this.audioBufferQueue.length >= samplesFor100ms) {
        const chunk = this.audioBufferQueue.subarray(0, samplesFor100ms);
        this.audioBufferQueue = this.audioBufferQueue.subarray(samplesFor100ms);

        // Send as Uint8Array buffer to match AssemblyAI expectations
        const buffer = new Uint8Array(chunk.buffer.slice(chunk.byteOffset, chunk.byteOffset + chunk.byteLength));
        this.port.postMessage({ audio_data: buffer });
      }

      return true;
    } catch (error) {
      console.error('[AudioProcessor] Error:', error);
      return false;
    }
  }

  mergeBuffers(lhs, rhs) {
    const merged = new Int16Array(lhs.length + rhs.length);
    merged.set(lhs, 0);
    merged.set(rhs, lhs.length);
    return merged;
  }
}

registerProcessor('audio-processor', AudioProcessor);
`;
```

### Audio Context and Worklet Setup
```javascript
const setupAudioContext = async () => {
  // Create AudioContext at exactly 16kHz for AssemblyAI compatibility
  audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({
    sampleRate: SAMPLE_RATE,  // Must be exactly 16000
    latencyHint: 'balanced'   // Optimize for real-time processing
  });

  // Resume context if suspended (browser autoplay policy)
  if (audioContextRef.current.state === 'suspended') {
    await audioContextRef.current.resume();
  }

  // Create blob URL for AudioWorklet processor
  const blob = new Blob([audioProcessorCode], { type: 'application/javascript' });
  const processorUrl = URL.createObjectURL(blob);

  // Add AudioWorklet module
  await audioContextRef.current.audioWorklet.addModule(processorUrl);

  // Clean up blob URL
  URL.revokeObjectURL(processorUrl);
};
```

### Media Stream Configuration
```javascript
const getMediaStream = async () => {
  // Request microphone with optimal settings for AssemblyAI
  return await navigator.mediaDevices.getUserMedia({
    audio: {
      sampleRate: { ideal: 16000 },     // Prefer 16kHz but allow browser flexibility
      channelCount: { ideal: 1 },       // Prefer mono but allow browser flexibility
      echoCancellation: true,           // Enable for better quality
      noiseSuppression: true,           // Enable for better quality
      autoGainControl: true            // Enable for consistent levels
    }
  });
};
```

### AudioWorklet Node Setup
```javascript
const setupAudioWorklet = (mediaStream) => {
  // Create media stream source
  const source = audioContextRef.current.createMediaStreamSource(mediaStream);

  // Create AudioWorklet node
  audioWorkletNodeRef.current = new AudioWorkletNode(
    audioContextRef.current,
    'audio-processor'
  );

  // Connect audio pipeline
  source.connect(audioWorkletNodeRef.current);
  audioWorkletNodeRef.current.connect(audioContextRef.current.destination);

  // Handle processed audio data
  audioWorkletNodeRef.current.port.onmessage = (event) => {
    if (!readableStreamRef.current?.controller) return;

    try {
      const audioData = event.data.audio_data;
      if (audioData && audioData.length > 0) {
        readableStreamRef.current.controller.enqueue(audioData);
      }
    } catch (error) {
      console.error('[Dictation] Error enqueuing audio data:', error);
    }
  };
};
```

### ReadableStream Creation for AssemblyAI
```javascript
const createAudioStream = () => {
  let controller;

  const stream = new ReadableStream({
    start(ctrl) {
      controller = ctrl;
      console.log('[Dictation] ReadableStream started');
    },
    cancel(reason) {
      console.log('[Dictation] ReadableStream cancelled:', reason);
    }
  });

  // Store controller reference for AudioWorklet message handler
  readableStreamRef.current = {
    stream,
    controller
  };

  return stream;
};
```

### Complete Audio Pipeline Setup
```javascript
const setupAudioPipeline = async () => {
  // 1. Setup AudioContext and load AudioWorklet
  await setupAudioContext();

  // 2. Get microphone stream
  const mediaStream = await getMediaStream();
  streamRef.current = mediaStream;

  // 3. Setup AudioWorklet processing
  setupAudioWorklet(mediaStream);

  // 4. Create ReadableStream for AssemblyAI
  const audioStream = createAudioStream();

  // 5. Connect to AssemblyAI transcriber (don't await - let it stream continuously)
  audioStream.pipeTo(transcriberRef.current.stream()).catch(error => {
    console.error('[Dictation] Audio stream error:', error);
  });

  console.log('[Dictation] Audio pipeline setup complete');
};
```

## AssemblyAI Token Generation

### Lambda Fetch Implementation
```javascript
const fetchAssemblyAIToken = async () => {
  try {
    console.log('[Dictation] Fetching AssemblyAI token from lambda');

    const response = await fetch(
      'https://tks3r2tlj2kq4rejfvusvqucye0btywr.lambda-url.us-east-2.on.aws',
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const tokenData = await response.json();

    // Calculate expiry time
    const now = new Date();
    const expiry = new Date(now.getTime() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

    // Update token state
    setToken({
      value: tokenData,
      expiry: expiry
    });

    // Schedule next refresh
    scheduleTokenRefresh(expiry);

    console.log('[Dictation] Token fetched successfully, expires at:', expiry);
    return tokenData;
  } catch (error) {
    console.error('[Dictation] Error fetching AssemblyAI token:', error);
    return null;
  }
};
```

### Token Refresh Scheduling
```javascript
const scheduleTokenRefresh = (expiry) => {
  clearTimeout(tokenRefreshTimeoutRef.current);

  const now = new Date();
  const timeUntilRefresh = expiry.getTime() - now.getTime() - (TOKEN_REFRESH_BUFFER_MINUTES * 60 * 1000);

  if (timeUntilRefresh > 0) {
    tokenRefreshTimeoutRef.current = setTimeout(() => {
      fetchAssemblyAIToken();
    }, timeUntilRefresh);
  } else {
    // Token already expired or expiring soon, refresh immediately
    fetchAssemblyAIToken();
  }
};
```

## Resource Cleanup Implementation

### Complete Cleanup Function
```javascript
const cleanupResources = useCallback(() => {
  console.log('[Dictation] Starting resource cleanup');

  // Stop ReadableStream
  if (readableStreamRef.current?.controller) {
    try {
      readableStreamRef.current.controller.close();
    } catch (error) {
      console.error('[Dictation] Error closing stream controller:', error);
    }
  }

  // Cleanup AudioWorklet Node
  if (audioWorkletNodeRef.current) {
    try {
      audioWorkletNodeRef.current.disconnect();
      audioWorkletNodeRef.current.port.close();
    } catch (error) {
      console.error('[Dictation] Error disconnecting AudioWorklet:', error);
    }
    audioWorkletNodeRef.current = null;
  }

  // Cleanup AudioContext
  if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
    audioContextRef.current.close().catch(error => {
      console.error('[Dictation] Error closing AudioContext:', error);
    });
    audioContextRef.current = null;
  }

  // Stop media stream tracks
  if (streamRef.current) {
    streamRef.current.getTracks().forEach(track => {
      track.stop();
      console.log('[Dictation] Stopped media track:', track.kind);
    });
    streamRef.current = null;
  }

  // Close AssemblyAI connection
  if (transcriberRef.current) {
    try {
      transcriberRef.current.close();
    } catch (error) {
      console.error('[Dictation] Error closing transcriber:', error);
    }
    transcriberRef.current = null;
  }

  // Disable NoSleep
  if (noSleepRef.current) {
    noSleepRef.current.disable();
  }

  // Clear timers
  stopTimer();
  clearTimeout(tokenRefreshTimeoutRef.current);
  clearInterval(heartbeatIntervalRef.current);

  // Reset refs
  readableStreamRef.current = null;
  heartbeatIntervalRef.current = null;

  console.log('[Dictation] Resource cleanup complete');
}, []);
```

## StreamingTranscriber Setup

```javascript
const setupTranscriptionConnection = async (tokenValue) => {
  console.log('[Dictation] Setting up transcription connection with token:', tokenValue ? 'present' : 'missing');
  return new Promise((resolve, reject) => {
    // Add timeout to prevent hanging
    const connectionTimeout = setTimeout(() => {
      console.error('[Dictation] StreamingTranscriber connection timeout after 10 seconds');
      reject(new Error('Connection timeout - StreamingTranscriber failed to connect'));
    }, 10000);

    try {
      console.log('[Dictation] Creating StreamingTranscriber instance');
      transcriberRef.current = new StreamingTranscriber({
        token: tokenValue,
        sampleRate: SAMPLE_RATE,  // Must be exactly 16000
        formatTurns: true         // Enable turn-based formatting
      });

      transcriberRef.current.on('open', () => {
        console.log('[Dictation] StreamingTranscriber connected successfully');
        clearTimeout(connectionTimeout);
        setStatus(prev => ({ ...prev, isTranscriberReady: true }));
        resolve();
      });

      transcriberRef.current.on('error', (error) => {
        console.error('[Dictation] StreamingTranscriber error:', error);
        clearTimeout(connectionTimeout);
        setStatus(prev => ({ ...prev, isTranscriberReady: false }));
        reject(error);
      });

      transcriberRef.current.on('turn', (turn) => {
        if (!turn.transcript) {
          return;
        }

        console.log('[Dictation] Turn received:', turn);

        const { transcript, turn_order, turn_is_formatted, end_of_turn } = turn;

        // Store turn by order with metadata
        turnsRef.current[turn_order] = {
          transcript,
          is_formatted: turn_is_formatted,
          end_of_turn
        };

        // Build text from all turns in order
        const sortedTurns = Object.entries(turnsRef.current)
          .sort(([a], [b]) => parseInt(a) - parseInt(b))
          .map(([, turnData]) => turnData.transcript);

        const newText = sortedTurns.join(' ');

        setTranscription(newText);
        setClipboardContent(newText);
      });

      console.log('[Dictation] Attempting to connect StreamingTranscriber');
      transcriberRef.current.connect();

    } catch (error) {
      console.error('[Dictation] Error in setupTranscriptionConnection:', error);
      clearTimeout(connectionTimeout);
      reject(error);
    }
  });
};
```

## Main Functions Implementation

### Start Dictation
```javascript
const startDictation = async () => {
  if (status.isLoading || status.isStopping) {
    setStatus(prev => ({ ...prev, isQueued: true }));
    return;
  }

  try {
    setStatus(prev => ({ ...prev, isLoading: true }));
    setTranscription('');
    setClipboardContent('');
    turnsRef.current = {};
    currentTurnOrderRef.current = -1;

    // Validate subscription hours
    if (!subscription.hasHours) {
      const updatedSub = await fetchUserSubscription();
      if (!updatedSub || updatedSub.hoursleft <= 0) {
        setShowCreditPopup(true);
        setStatus(prev => ({ ...prev, isLoading: false }));
        return;
      }
    }

    // Ensure connection ready
    if (!isTokenValid() || !status.isTranscriberReady) {
      let currentToken = token.value;
      if (!isTokenValid()) {
        currentToken = await fetchAssemblyAIToken();
      }
      if (!status.isTranscriberReady && currentToken) {
        await setupTranscriptionConnection(currentToken);
      }
    }

    // Setup complete audio pipeline with AudioWorklet
    await setupAudioPipeline();

    // Enable NoSleep and start timer
    if (noSleepRef.current) {
      noSleepRef.current.enable();
    }
    startTimer();

    setStatus(prev => ({
      ...prev,
      isTranscribing: true,
      isLoading: false,
      isQueued: false
    }));

    setClipboardContent(' ');
  } catch (error) {
    console.error('[Dictation] Start error:', error);
    setStatus(prev => ({ ...prev, isLoading: false, isQueued: false }));
    cleanupResources();
    alert('Failed to start dictation. Check microphone permissions.');
  }
};
```

### Stop Dictation
```javascript
const stopDictation = () => {
  if (!status.isTranscribing && !status.isStopping) return;

  console.log('[Dictation] Stopping dictation');
  setStatus(prev => ({ ...prev, isStopping: true }));

  const finalTranscription = transcription;

  // Stop streaming and cleanup
  cleanupResources();

  // Disable NoSleep and stop timer
  if (noSleepRef.current) {
    noSleepRef.current.disable();
  }
  stopTimer();

  // Update subscription hours
  const hoursUsed = timer / 3600;
  updateUserSubscriptionHours(hoursUsed);

  // Send final transcription to parent
  if (finalTranscription) {
    onTextStreamUpdate(finalTranscription);
  }

  setStatus(prev => ({
    ...prev,
    isTranscribing: false,
    isStopping: false
  }));

  // Re-initialize after delay
  setTimeout(async () => {
    if (!isTokenValid()) {
      await fetchAssemblyAIToken();
    }
    if (token.value) {
      await setupTranscriptionConnection(token.value);
    }
  }, 1000);
};
```

## Subscription and Credit Management

### Fetching User Subscription Data
To ensure a user has enough credit before starting a dictation session, their subscription data is fetched from the backend. This is handled by the `fetchUserSubscription` function, which uses the `getUserSubscription` GraphQL query.

```javascript
const fetchUserSubscription = async () => {
  try {
    console.log('[Dictation] Fetching user subscription');

    const user = await getCurrentUser();
    const owner = user.username;
    const subscriptionData = await client.graphql({
      query: queries.getUserSubscription,
      variables: { owner }
    });

    const userData = subscriptionData.data.getUserSubscription;
    setSubscription({
      data: userData,
      hasHours: userData ? userData.hoursleft > 0 : false
    });

    console.log('[Dictation] Subscription fetched successfully');
    return userData;
  } catch (error) {
    console.error('[Dictation] Error fetching user subscription:', error);
    return null;
  }
};
```

### Updating User Hours
After a dictation session ends, the duration is calculated and subtracted from the user's remaining hours. This is done by calling the `updateUserSubscriptionHours` function, which executes the `updateUserSubscription` GraphQL mutation.

**Note**: The mutation is named `updateUserSubscription`, not `setHours`.

```javascript
const updateUserSubscriptionHours = async (hoursUsed) => {
  if (!subscription.data) return;

  try {
    const newHoursLeft = Math.max(0, subscription.data.hoursleft - hoursUsed);

    await client.graphql({
      query: mutations.updateUserSubscription,
      variables: {
        input: {
          id: subscription.data.id, // The 'id' here is the 'owner' username
          hoursleft: newHoursLeft
        }
      }
    });

    setSubscription(prev => ({
      ...prev,
      data: { ...prev.data, hoursleft: newHoursLeft },
      hasHours: newHoursLeft > 0
    }));

    console.log(`[Dictation] Updated hours left: ${newHoursLeft}`);
  } catch (error) {
    console.error('[Dictation] Error updating subscription hours:', error);
  }
};
```

This function is called within `stopDictation`:

```javascript
// In stopDictation()
const hoursUsed = timer / 3600;
updateUserSubscriptionHours(hoursUsed);
```

### Streaming Transcription to Clipboard

The `Dictation` component streams live transcription text directly to the main clipboard textarea. This is achieved by passing a state setter function from the parent `App.jsx` component down to `Dictation`.

#### Data Flow Explained

1.  **State Management in `App.jsx`**: The `clipboardContent` state, which holds the text for the main textarea, is defined and managed in `App.jsx`.

2.  **Passing the Setter Function**: `App.jsx` passes the `setClipboardContent` function as a prop when initializing the `Dictation` component.

    *App.jsx*:
    ```javascript
    // In App.jsx
    const [clipboardContent, setClipboardContent] = useState('');

    const dictation = Dictation({
      setClipboardContent, // The setter is passed here
      // ... other props
    });
    ```

3.  **Updating State from `Dictation.jsx`**: Inside the `Dictation` component, the `StreamingTranscriber`'s `on('turn', ...)` event handler receives real-time turn updates with metadata. This handler uses turn ordering to build the complete transcription and calls the `setClipboardContent` prop with the latest text, which updates the state in `App.jsx`.

    *Dictation.jsx*:
    ```javascript
    // Inside setupTranscriptionConnection()
    transcriberRef.current.on('turn', (turn) => {
      // Extract turn metadata and transcript
      const { transcript, turn_order, turn_is_formatted, end_of_turn } = turn;

      // Store and sort turns by order
      turnsRef.current[turn_order] = { transcript, is_formatted: turn_is_formatted, end_of_turn };
      const sortedTexts = Object.entries(turnsRef.current)
        .sort(([a], [b]) => parseInt(a) - parseInt(b))
        .map(([, turnData]) => turnData.transcript)
        .join(' ');

      // Update parent state via the passed prop
      setClipboardContent(sortedTexts);
    });
    ```

4.  **Displaying in `Clipboard.jsx`**: The `App.jsx` component passes the `clipboardContent` state down to the `Clipboard` component, which binds it to its `textarea`. This ensures that any update to the state is immediately reflected in the UI, creating a seamless live-streaming effect.

    *App.jsx*:
    ```javascript
    <Clipboard
      clipboardContent={clipboardContent}
      setClipboardContent={setClipboardContent}
      // ... other props
    />
    ```

## Component Return Object

```javascript
return {
  isDictationLoading: status.isLoading,
  isTranscribing: status.isTranscribing,
  isInitialized: status.isInitialized,
  isTranscriberReady: status.isTranscriberReady,
  dictationQueued: status.isQueued,
  isStoppingDictation: status.isStopping,
  isWebSocketConnecting: status.isLoading && !status.isTranscribing,
  creditPopupElement,
  startDictation,
  stopDictation,
  toggleDictation: () => {
    if (status.isTranscribing || status.isStopping) {
      stopDictation();
    } else {
      startDictation();
    }
  }
};
```

## State Communication with App.jsx

### Props Expected by App.jsx
The parent component (App.jsx) expects these properties from the Dictation component:

```javascript
// In App.jsx - line 297-301
const dictation = Dictation({
  onTextStreamUpdate: handleTextStreamUpdate,
  setClipboardContent,
  username: user.username
});

// State updates - lines 304-312
useEffect(() => {
  setIsDictationLoading(dictation.isDictationLoading);
  setIsTranscribing(dictation.isTranscribing);
  setIsWebSocketConnecting(dictation.isWebSocketConnecting);
}, [
  dictation.isDictationLoading,
  dictation.isTranscribing,
  dictation.isWebSocketConnecting
]);
```

### Props Passed to ClipboardButtons
App.jsx passes these states to ClipboardButtons component:

```javascript
// In App.jsx - lines 788-792
isDictationLoading={isDictationLoading}
isTranscribing={isTranscribing}
isWebSocketConnecting={isWebSocketConnecting}
startDictation={dictation.toggleDictation}  // Note: uses toggleDictation
dictationReady={dictation.isInitialized}
```

### ClipboardButtons Usage
ClipboardButtons calls the startDictation function when mic button is clicked:

```javascript
// In ClipboardButtons.jsx - lines 28-34
const handleDictationClick = () => {
  trackDictationStart();
  startDictation();  // Calls dictation.toggleDictation
};
```

#### UI State and Visual Feedback

The state flags from `Dictation.jsx` are passed up to `App.jsx` and then down to `ClipboardButtons.jsx` to provide clear visual feedback to the user throughout the dictation lifecycle.

1.  **Initial State (Ready):**
    *   **Condition**: `dictationReady` is `true`.
    *   **UI Feedback**: The microphone button (`#dictation-mic-btn`) is displayed with its default styling, indicating the feature is available.

2.  **User Clicks Mic (Loading/Connecting):**
    *   **Condition**: `isDictationLoading` or `isWebSocketConnecting` is `true`.
    *   **UI Feedback**:
        *   The mic button gets the `.button-loading` class, which applies a subtle pulsing animation. This signals that the system is working on connecting to the transcription service and securing microphone access.
        *   The button remains clickable. If clicked again, the request is queued and will start automatically once the initial loading is complete.
    *   **Clipboard Textarea**: `setClipboardContent('')` is called immediately, clearing any previous text from the main textarea.

3.  **Recording Active:**
    *   **Condition**: `isTranscribing` is `true`.
    *   **UI Feedback**:
        *   The mic button's pulsing animation stops.
        *   It receives the `.button-recording` class, turning its background solid green.
        *   A red, blinking `.recording-indicator` dot appears on the top-right of the button, providing a clear and persistent visual cue that the microphone is live and capturing audio.
    *   **Clipboard Textarea**: Just before transcription begins, `setClipboardContent(' ')` is called. This ensures the textarea is blank and ready to receive the first transcribed words, preventing a "flash" of old content.

4.  **User Clicks Mic to Stop (Finalizing):**
    *   **Condition**: `isStoppingDictation` is `true`.
    *   **UI Feedback**: The mic button returns to its default, non-pulsing, non-recording state. The UI provides immediate feedback that the recording has stopped, even while background cleanup (closing streams, updating credits) occurs.

5.  **Error State:**
    *   **Condition**: An error occurs during `startDictation` (e.g., microphone permission denied).
    *   **UI Feedback**: The loading state is set to `false`, the button returns to its default state, and a browser `alert()` notifies the user of the failure.

## State Flow Summary
1. **User clicks mic button** â†’ ClipboardButtons.handleDictationClick()
2. **ClipboardButtons calls** â†’ dictation.toggleDictation()
3. **toggleDictation checks state** â†’ calls startDictation() or stopDictation()
4. **State changes in Dictation** â†’ status.isLoading, status.isTranscribing
5. **App.jsx useEffect detects changes** â†’ updates local state
6. **Local state passed to ClipboardButtons** â†’ UI updates with loading/recording states

## Critical Implementation Notes

### Recent Bug Fix - Audio Pipeline Blocking Issue
**Problem**: The `setupAudioPipeline` function was blocking indefinitely at `await audioStream.pipeTo(transcriberRef.current.stream())` because `pipeTo` waits for stream completion, but real-time audio streams never complete.

**Solution**: Removed `await` and added error handling to allow continuous streaming:
```javascript
// 5. Connect to AssemblyAI transcriber (don't await - let it stream continuously)
audioStream.pipeTo(transcriberRef.current.stream()).catch(error => {
  console.error('[Dictation] Audio stream error:', error);
});
```

### AssemblyAI Requirements (NON-NEGOTIABLE)
- **Sample Rate**: Exactly 16000Hz - no ranges, no flexibility
- **Channels**: Exactly 1 (mono) - stereo not supported
- **Data Format**: Int16 PCM audio via ReadableStream
- **Token**: Valid temporary token from lambda endpoint
- **Turn Formatting**: `formatTurns: true` enables turn-based events with metadata

### Turn-Based Event Handling (Latest Implementation)
- **Event Type**: Uses `turn` events instead of deprecated `transcript` events
- **Turn Metadata**: Each turn includes `turn_order`, `turn_is_formatted`, and `end_of_turn`
- **Automatic Ordering**: Turns are stored by order and automatically sorted for display
- **Simplified Logic**: Eliminates complex similarity matching and replacement detection
- **Debug Logging**: Added console.log for turn events to help with troubleshooting

### Web Audio API Best Practices
- **AudioWorklet**: Modern replacement for deprecated ScriptProcessorNode - better performance and no main thread blocking
- **AudioContext**: Must match 16kHz sample rate exactly for AssemblyAI compatibility
- **MediaStream**: Stop all tracks on cleanup to prevent resource leaks
- **ReadableStream**: Use controller.enqueue() for streaming data to AssemblyAI
- **Buffer Management**: Process audio in 100ms chunks (1600 samples) for optimal streaming performance

### Resource Management
- **AudioContext.close()**: Essential to prevent memory leaks
- **MediaStreamTracks.stop()**: Release microphone access
- **StreamingTranscriber.close()**: Close WebSocket connection
- **NoSleep.disable()**: Prevent battery drain from staying awake

### Error Handling Priorities
1. **Microphone Permission Denied**: Clear error message to user
2. **Token Expired**: Auto-refresh and retry connection
3. **Network Connection Lost**: Auto-reconnect with backoff
4. **AssemblyAI Service Error**: Graceful degradation with user notification

## Expected Benefits

- **Modern AudioWorklet Implementation**: Eliminates deprecated ScriptProcessorNode, no main thread blocking
- **Embedded Processor Code**: No external files needed - AudioWorklet code is embedded as blob URL in component
- **Optimal Buffer Management**: Processes audio in 100ms chunks matching AssemblyAI's cookbook pattern
- **Better Performance**: AudioWorklet runs on dedicated audio thread for consistent processing
- **Direct PCM Streaming**: Fixes audio format mismatch bugs completely with proper Int16 conversion
- **Hardware Compatibility**: Flexible audio constraints work across different devices
- **Accurate Audio Requirements**: Meets AssemblyAI specifications exactly (16kHz mono PCM)
- **Improved Resource Management**: Proper cleanup prevents memory leaks and battery drain
- **Robust Error Handling**: Comprehensive reconnection and cleanup procedures
- **Simplified Turn Handling**: Turn-based events with metadata eliminate complex text processing logic
- **Natural Text Flow**: Automatic turn ordering ensures proper sentence progression and formatting
- **Metadata-Driven Logic**: Uses AssemblyAI's turn metadata instead of manual similarity detection

## Provenance

Derived from [`Dictation.md`](../../src/components/Recording/Dictation.md).

