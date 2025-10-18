# ChiroNote Testing Strategy & Plan

## Overview

This document outlines the comprehensive testing strategy for ChiroNote's audio recording functionality. The goal is to replace manual device testing with automated tests that catch issues before deployment.

---

## 1. Core Testing Framework

### Tooling Already Installed
- **Jest** - Test runner (via react-scripts)
- **React Testing Library** - Component testing
- **@testing-library/user-event** - User interaction simulation
- **@testing-library/jest-dom** - DOM assertions

### Additional Tools Needed
- **jest-environment-jsdom** (may need explicit version)
- **Mock implementations** for Web Audio API (custom, we'll create)

---

## 2. Critical Test Categories

### 2.1 Microphone Permission Testing

**What to Test:**
- Permission granted on first request
- Permission denied (user clicks "Block")
- Permission previously granted (stored permission)
- Permission previously denied (stored permission)
- Permission prompt dismissed without action
- Microphone not found (no hardware)
- Microphone in use by another application

**Testing Approach:**
- Mock `navigator.mediaDevices.getUserMedia` with different responses
- Mock `navigator.permissions.query()` for different states
- Simulate DOMException errors: `NotAllowedError`, `NotFoundError`, `NotReadableError`

**Why This Matters:**
Your memories show Firefox and Mac issues with permissions. This catches those.

---

### 2.2 Browser Compatibility Testing

**Browsers to Simulate:**

1. **Chrome/Edge (Chromium)**
   - RecordingManager MIME: `audio/webm; codecs="pcm"`
   - Dictation AudioContext: 16kHz (forced)
   - Full AudioWorklet support
   - Sample rate handling: No resampling needed

2. **Firefox (Windows)**
   - RecordingManager MIME: `audio/webm` (no PCM codec)
   - Dictation AudioContext: undefined (browser default ~48kHz)
   - AudioWorklet resampling: 48kHz → 16kHz
   - isFirefox() helper returns true

3. **Firefox (Mac)** ⚠️ **Known problem area**
   - RecordingManager MIME: `audio/webm`
   - Dictation AudioContext: undefined (CRITICAL - from memory)
   - Cannot force sample rate (strict matching error)
   - AudioWorklet resampling: Required for 16kHz output
   - isFirefox() helper returns true
   - User agent contains 'Macintosh'

4. **Safari (Mac)**
   - RecordingManager MIME: `audio/webm`
   - Dictation AudioContext: 16kHz attempted
   - Sample rate: 48kHz typical from hardware
   - AudioWorklet resampling: 48kHz → 16kHz
   - Permission persistence issues noted

5. **iOS Safari/WebView (Capacitor)**
   - RecordingManager MIME: `video/mp4` (CRITICAL)
   - Dictation: Limited AudioWorklet support
   - Different permission model (more restrictive)
   - User agent contains 'iPhone' or 'iPad'

**isFirefox() Helper Function:**
```javascript
// From Dictation.jsx line 311-313
const isFirefox = () => {
  return navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
};

✓ Test returns true for Firefox user agent
✓ Test returns false for Chrome user agent
✓ Test is case-insensitive
```

**setupAudioContext() Browser Detection:**
```javascript
// From Dictation.jsx lines 316-322
const contextSampleRate = isFirefox() 
  ? undefined  // Let Firefox use its default sample rate
  : SAMPLE_RATE; // 16000 for other browsers

✓ Firefox detected → contextSampleRate = undefined
✓ Chrome detected → contextSampleRate = 16000
✓ Safari detected → contextSampleRate = 16000
✓ contextOptions only includes sampleRate if defined
```

**Testing Approach:**
- Mock `navigator.userAgent` for each browser
- Test `isFirefox()` detection accuracy
- Mock `MediaRecorder.isTypeSupported()` based on browser
- Test RecordingManager selects correct MIME type
- Test Dictation creates AudioContext with correct sample rate (or undefined)
- Verify AudioWorklet resampling logic activates when needed
- Test iOS detection for video/mp4 requirement

**Specific Test Cases:**
```javascript
// Dictation.jsx browser detection
✓ Chrome user agent → isFirefox() === false
✓ Firefox user agent → isFirefox() === true
✓ Firefox Mac → AudioContext created without sampleRate option
✓ Chrome → AudioContext created with sampleRate: 16000

// RecordingManager.jsx MIME type selection
✓ Chrome → MediaRecorder uses 'audio/webm; codecs="pcm"'
✓ Firefox → MediaRecorder uses 'audio/webm'
✓ iOS → MediaRecorder uses 'video/mp4'
✓ MediaRecorder.isTypeSupported() called for validation

// getMediaStream() constraints
✓ All browsers → sampleRate: { ideal: 16000 } (flexible)
✓ All browsers → channelCount: { ideal: 1 }
✓ All browsers → echoCancellation: true
✓ All browsers → noiseSuppression: true
✓ All browsers → autoGainControl: true
```

**Why This Matters:**
Your dictation didn't work on ANY Firefox or MOST Macs for a year. This prevents that.

---

### 2.3 Recording Lifecycle Testing

**Scenarios to Test:**

**Basic Flow:**
1. Start recording → Should request mic → Should enable NoSleep → Should start MediaRecorder
2. Stop recording → Should upload final chunk → Should disable NoSleep → Should show "Preparing Transcript"
3. Pause recording → Should pause MediaRecorder → Should maintain NoSleep
4. Resume recording → Should resume MediaRecorder → Should restart chunk interval
5. Discard recording → Should stop everything → Should disable NoSleep → Should clear all queues

**Edge Cases:**
- Start recording twice quickly (double-click protection)
- Stop before MediaRecorder is ready
- Pause before recording actually starts
- Discard during upload
- Rapid start/stop/start sequences

**Testing Approach:**
- Use `renderHook` from React Testing Library
- Mock all async operations (getUserMedia, uploadData, SQS)
- Use `act()` to wrap state changes
- Use `waitFor()` for async state updates
- Track call counts and call order

---

### 2.4 Audio Chunking & Long Recording Testing

**What to Test:**

**RecordingManager.jsx Implementation Details:**

**4-Minute Chunk Logic:**
```javascript
// MediaRecorder is configured to emit data every few seconds
// Context.md specifies the chunking happens every ~240 seconds

✓ MediaRecorder.ondataavailable fires periodically
✓ Each blob added to uploadQueueRef array
✓ processUploadQueue() called to handle sequential uploads
✓ Each chunk uploaded to S3 with unique path
✓ Chunk path format: `audio/${userId}/${timestamp}_chunk_${Date.now()}.webm`
✓ Each chunk triggers SQS message with path and isFinalAudio: false
```

**uploadS3() Function:**
```javascript
// From Context.md: This function does TWO critical actions

✓ Step 1: Upload blob to S3 via uploadData() from Amplify Storage
✓ Upload path includes userId, timestamp, and unique chunk identifier
✓ Step 2: Send SQS message to AudioTranscriptionQueue.fifo
✓ SQS message includes: { userId, timestamp, path, isFinalAudio }
✓ SQS uses SendMessageCommand from @aws-sdk/client-sqs
✓ SQS message triggers backend transcription service
```

**stopRecording() Function:**
```javascript
// From Context.md: Critical final chunk handling

✓ Calls mediaRecorder.stop()
✓ Triggers final ondataavailable event
✓ Sets setIsPreparingTranscript(true)
✓ Final chunk marked with "_final_" in filename
✓ Final chunk path: `audio/${userId}/${timestamp}_final_${Date.now()}.webm`
✓ Final SQS message has isFinalAudio: true
✓ Signals backend that recording session is complete
```

**processUploadQueue() Function:**
```javascript
// Processes queue sequentially to prevent race conditions

✓ Works through uploadQueueRef array in order
✓ Processes one chunk at a time (not parallel)
✓ Prevents duplicate uploads
✓ Maintains chunk sequence order
✓ Continues even if one chunk fails (resilience)
```

**12+ Minute Recordings:**
- Should create 3+ chunks for 12-minute recording
- Upload queue should process sequentially (not parallel)
- Regular chunks should upload before final chunk
- No chunks should be lost or duplicated
- Each chunk triggers backend processing (partial transcription)
- Final chunk triggers completion signal

**Testing Approach:**
- Use `jest.useFakeTimers()` to control time
- Fast-forward time with `jest.advanceTimersByTime(240000)`
- Track uploadData calls and their paths
- Verify chunk sequence numbers increment correctly
- Verify final chunk is always last in queue
- Verify isFinalAudio flag is false for all chunks except last
- Mock SQS SendMessageCommand and verify message contents
- Verify uploadQueueRef is managed correctly

**Specific Test Cases:**
```javascript
✓ Recording < 4 minutes → 1 chunk with _final_ marker
✓ Recording = 4 minutes → 2 chunks, last has _final_
✓ Recording = 12 minutes → 3 chunks, last has _final_
✓ Each chunk has unique timestamp in path
✓ Each chunk triggers separate SQS message
✓ Regular chunks have isFinalAudio: false
✓ Final chunk has isFinalAudio: true
✓ uploadQueueRef.current is array that grows during recording
✓ processUploadQueue processes in FIFO order
✓ S3 upload failure doesn't stop subsequent uploads
✓ SQS failure logged but doesn't crash recording
```

**MediaRecorder Configuration Tests:**
```javascript
// Browser-specific MIME types from Context.md

✓ Chrome/Edge: Uses 'audio/webm; codecs="pcm"'
✓ Firefox: Uses 'audio/webm' (no PCM codec support)
✓ Safari: Uses 'audio/webm'
✓ iOS: Uses 'video/mp4'
✓ MediaRecorder.isTypeSupported() called to verify
✓ Falls back to supported format if preferred not available
```

**Why This Matters:**
You specifically mentioned testing 12+ minute recordings. This automates that and ensures backend receives chunks correctly.

---

### 2.5 Page Visibility & Sleep Mode Testing ⚠️ **#1 CLIENT PROBLEM**

**Critical Scenarios:**

**Page Visibility Changes:**
1. **User switches tabs during recording**
   - Recording should continue
   - WebSocket should stay connected
   - NoSleep should keep screen awake
   - Audio should continue capturing

2. **User switches tabs during transcript generation**
   - Subscription should continue listening
   - Should not timeout prematurely
   - Should complete when backend finishes

3. **User returns to tab after being away**
   - Should call `reinitializeDictation()` via `handleVisibilityChange()`
   - Should fetch fresh token via `fetchAssemblyAIToken()`
   - Should fetch subscription data via `fetchUserSubscription()`
   - Should NOT call `setupTranscriptionConnection()` (prevents billing)
   - Should set `isInitialized: true` but `isTranscriberReady: false`
   - Should work when user clicks record again (new connection established then)

**Device Sleep/Lock:**
1. **Device goes to sleep during recording**
   - NoSleep should prevent this (but may fail on some devices)
   - If sleep happens, recording should handle gracefully
   - Should not crash or corrupt audio

2. **Device goes to sleep during processing**
   - RecordingManager: Should timeout gracefully after **80 seconds** waiting for transcript
   - RecordingManager: Should timeout after **4 minutes** if streaming doesn't start
   - Should call `onTransitionToMainApp()` on timeout
   - Should disable NoSleep on wake

**Testing Approach:**
- Mock `document.hidden` property changes
- Mock `document.visibilitychange` events
- Mock `Page Visibility API` states
- Simulate: `visible` → `hidden` → `visible` cycles
- Test NoSleep enable/disable calls
- Test WebSocket close/reconnect behavior
- Mock timeout scenarios (80-second subscription wait, 240-second/4-minute generate timeout)

**Implementation-Specific Tests for Dictation.jsx:**

**Visibility Change Handler:**
```javascript
// Test that handleVisibilityChange is added/removed correctly
✓ addEventListener called on mount with 'visibilitychange'
✓ removeEventListener called on unmount

// Test reinitializeDictation behavior
✓ When page becomes visible → setTimeout called with 1000ms delay
✓ reinitializeDictation sets isReconnectingRef.current = true
✓ reinitializeDictation calls cleanupResources()
✓ reinitializeDictation resets status to initial state
✓ reinitializeDictation calls fetchAssemblyAIToken()
✓ reinitializeDictation calls fetchUserSubscription()
✓ reinitializeDictation does NOT call setupTranscriptionConnection()
✓ reinitializeDictation sets isInitialized: true
✓ reinitializeDictation sets isReconnectingRef.current = false
```

**NoSleep Lifecycle in Dictation.jsx:**
```javascript
// Enable on recording start
✓ startDictation() calls noSleepRef.current.enable() before setIsTranscribing(true)

// Disable on recording stop
✓ stopDictation() calls noSleepRef.current.disable() after cleanupResources()

// Disable on cleanup
✓ cleanupResources() calls noSleepRef.current.disable()

// Verify NoSleep instance created on mount
✓ useEffect initialization creates new NoSleep() instance
✓ noSleepRef.current populated before any recording can start
```

**Implementation-Specific Tests for RecordingManager.jsx:**

**NoSleep Lifecycle:**
```javascript
// Enable on recording start
✓ startRecording() calls noSleepRef.current.enable()

// Disable on discard
✓ discardRecording() calls noSleepRef.current.disable()

// Disable after streamResponse completes
✓ streamResponse() finally block calls noSleepRef.current.disable()

// CRITICAL: Disable on stopRecording (the missing bug from memory)
✓ stopRecording() calls noSleepRef.current.disable() before setIsPreparingTranscript(true)
```

**Timeout Handling:**
```javascript
// 80-second transcript wait timeout
✓ subscribeToNoteCompletion() sets timeout for 80000ms
✓ Timeout clears subscription: subscriptionRef.current.unsubscribe()
✓ Timeout sets transcriptCompletedRef.current = true
✓ Timeout calls streamResponse()
✓ If subscription resolves before timeout, clearTimeout is called

// 4-minute (240-second) streaming timeout
✓ streamResponse() sets timeout for 240000ms
✓ Timeout sets isGeneratingSummary = false
✓ Timeout sets isPreparingTranscript = false
✓ Timeout calls onTransitionToMainApp()
✓ Timeout calls noSleepRef.current.disable()
✓ If first chunk arrives, clearTimeout is called immediately
```

**GraphQL Subscription Management:**
```javascript
// Subscription lifecycle
✓ subscribeToNoteCompletion() creates subscription with onUpdateNotesByOwner
✓ Subscription filters by timestamp: note.timestamp === timeStampRef.current
✓ Subscription waits for isCompleted: true flag
✓ Subscription stored in subscriptionRef.current
✓ On completion or timeout, subscription.unsubscribe() called
✓ On discardRecording(), subscription.unsubscribe() called immediately
```

**Specific Test Cases:**
```
✓ Visibility hidden during recording → NoSleep stays enabled
✓ Visibility hidden during transcript prep → Subscription stays active
✓ Visibility visible after hidden → Reinitialize WITHOUT WebSocket
✓ Return from background → Can start new recording
✓ NoSleep disabled after discard
✓ NoSleep disabled after stopRecording (RecordingManager)
✓ NoSleep disabled after streamResponse completes
✓ NoSleep disabled after streamResponse times out
✓ Device lock simulation → Recording fails gracefully
✓ 80-second timeout triggers if backend slow
✓ 4-minute timeout prevents infinite "Generating Note" spinner
```

**Why This Matters:**
This is your #1 client problem. These tests catch the exact scenarios causing issues.

---

### 2.6 NoSleep Management Testing ⚠️ **Battery Drain Bug**

**Critical Test Cases:**

From your memory: "nosleep stays enabled indefinitely causing Apple devices to shut down"

**Must Test:**
1. ✓ NoSleep.enable() called on recording start
2. ✓ NoSleep.disable() called on recording stop
3. ✓ NoSleep.disable() called on discard
4. ✓ NoSleep.disable() called after streamResponse() completes
5. ✓ NoSleep.disable() called if streamResponse() errors
6. ⚠️ **NoSleep.disable() called if page is closed during processing**
7. ⚠️ **NoSleep.disable() called if component unmounts during recording**

**Testing Approach:**
- Mock NoSleep class
- Track enable/disable call counts
- Assert disable called in ALL exit paths
- Test error scenarios trigger disable
- Test unmount triggers disable
- Test timeout scenarios trigger disable

**Why This Matters:**
Apple devices were shutting down due to battery drain. This prevents regression.

---

### 2.7 WebSocket Billing Prevention Testing ⚠️ **CRITICAL**

**From Your Memory:** "WebSocket established immediately on component mount causing continuous billing"

**Must Test:**

**Initialization (useEffect on mount):**
- ✓ Component mount → NO WebSocket connection
- ✓ Component mount → Token fetched via `fetchAssemblyAIToken()`
- ✓ Component mount → Subscription fetched via `fetchUserSubscription()`
- ✗ Component mount → `setupTranscriptionConnection()` NOT called
- ✓ Component mount → Sets `isInitialized: true`
- ✗ Component mount → `transcriberRef.current` remains null
- ✓ Console log: "Initialization complete - WebSocket will connect when recording starts"

**Recording Start (startDictation):**
- ✓ Always calls `setupTranscriptionConnection(currentToken)` FRESH for each session
- ✓ Creates NEW StreamingTranscriber instance with token
- ✓ Calls `transcriberRef.current.connect()`
- ✓ 'open' event handler sets `isTranscriberReady: true`
- ✓ Console log: "🟢 WEBSOCKET CONNECTION OPENED - Billing starts now"
- ✓ Establishes audio pipeline via `setupAudioPipeline()`
- ✓ ReadableStream.pipeTo(transcriberRef.current.stream())

**Recording Stop (stopDictation):**
- ✓ Calls `cleanupResources()` which closes WebSocket
- ✓ `transcriberRef.current.close()` called
- ✓ Sets `transcriberRef.current = null`
- ✓ Sets `isTranscriberReady: false` in status state
- ✓ Console log: "🔴 CLOSING WEBSOCKET CONNECTION - Billing should stop now"
- ✓ Console log: "✅ WEBSOCKET CONNECTION CLOSED - No more billing charges"
- ✗ NO setTimeout to reconnect WebSocket
- ✗ NO call to `setupTranscriptionConnection()` after stop

**Page Visibility (reinitializeDictation):**
- ✓ Page hidden during recording → No reinitialization (WebSocket stays connected)
- ✓ Page visible after hidden → Calls `reinitializeDictation()`
- ✓ Reinitialize calls `cleanupResources()` (closes any open WebSocket)
- ✓ Reinitialize fetches token via `fetchAssemblyAIToken()`
- ✓ Reinitialize fetches subscription via `fetchUserSubscription()`
- ✗ Reinitialize does NOT call `setupTranscriptionConnection()`
- ✓ Sets `isInitialized: true` but `isTranscriberReady: false`
- ✓ Console log: "Reinitialization completed - WebSocket will connect when recording starts"

**Testing Approach:**
- Mock `StreamingTranscriber` constructor to track instantiations
- Count constructor calls (should equal number of startDictation calls)
- Mock `.connect()` method and track calls
- Mock `.close()` method and track calls
- Verify `close()` called before any subsequent `connect()`
- Verify NO connections during component mount
- Verify NO connections during reinitializeDictation
- Verify NO connections on page visibility change
- Test that transcriberRef.current is null when not recording
- Verify 'open' event listener fires and logs billing start

**Specific Test Cases:**
```javascript
✓ Mount component → transcriberRef.current === null
✓ Mount component → StreamingTranscriber constructor NOT called
✓ Call startDictation() → StreamingTranscriber constructor called once
✓ Call stopDictation() → transcriberRef.current.close() called
✓ Call stopDictation() → transcriberRef.current set to null
✓ Call stopDictation() → isTranscriberReady === false
✓ Call startDictation() twice → StreamingTranscriber constructor called twice
✓ Reinitialize → transcriberRef.current === null
✓ Reinitialize → StreamingTranscriber constructor NOT called
✓ Start after reinitialize → Creates fresh connection successfully
```

**Edge Case Tests:**
```javascript
✓ Rapid start/stop/start → Each creates fresh WebSocket, closes previous
✓ Stop during connection setup → Connection aborted, no hanging WebSocket
✓ Component unmount during recording → cleanupResources() closes WebSocket
✓ Error during setupTranscriptionConnection → No WebSocket left open
✓ Token fetch fails → No WebSocket created, error handled
```

**Why This Matters:**
This was causing "astronomical billing costs." These tests ensure it never happens again.

---

### 2.8 AssemblyAI Audio Pipeline Testing

**What to Test:**

**AudioWorklet Processor Code (Embedded in Component):**
```javascript
// The processor is created as a blob URL and loaded into AudioWorklet
// Test that the processor code is correctly embedded and functional

✓ audioProcessorCode string contains 'class AudioProcessor extends AudioWorkletProcessor'
✓ audioProcessorCode contains 'registerProcessor("audio-processor", AudioProcessor)'
✓ Processor converts Float32 to Int16 with proper clamping
✓ Clamping formula: sample < 0 ? sample * 32768 : sample * 32767
✓ Processor accumulates audio in audioBufferQueue
✓ Processor sends 100ms chunks (1600 samples at 16kHz)
✓ Processor merges buffers correctly with mergeBuffers()
✓ Processor posts Uint8Array via this.port.postMessage({ audio_data })
```

**setupAudioContext() Function:**
```javascript
// Firefox-specific handling
✓ Calls isFirefox() helper to detect browser
✓ Firefox: contextSampleRate = undefined (uses browser default)
✓ Non-Firefox: contextSampleRate = SAMPLE_RATE (16000)
✓ Creates contextOptions with latencyHint: 'balanced'
✓ Only adds sampleRate to options if contextSampleRate is defined
✓ Creates AudioContext with contextOptions
✓ Resumes context if state is 'suspended'
✓ Creates Blob from audioProcessorCode
✓ Creates blob URL via URL.createObjectURL(blob)
✓ Calls audioContext.audioWorklet.addModule(processorUrl)
✓ Revokes blob URL via URL.revokeObjectURL(processorUrl)
```

**getMediaStream() Function:**
```javascript
// Microphone constraints
✓ Requests getUserMedia with audio constraints
✓ sampleRate: { ideal: 16000 } - flexible, not required
✓ channelCount: { ideal: 1 } - mono preferred
✓ echoCancellation: true
✓ noiseSuppression: true
✓ autoGainControl: true
✓ Returns { stream, sampleRate } object
✓ Extracts sampleRate from audioTrack.getSettings()
✓ Defaults to 48000 if sampleRate not available
```

**setupAudioWorklet() Function:**
```javascript
✓ Creates MediaStreamSource from stream
✓ Creates AudioWorkletNode with name 'audio-processor'
✓ Connects source to AudioWorkletNode
✓ Connects AudioWorkletNode to context.destination
✓ Sets up port.onmessage handler
✓ Handler receives event.data.audio_data
✓ Handler calls readableStreamRef.current.controller.enqueue(audioData)
✓ Handler validates audioData exists and length > 0
✓ Handler catches and logs errors
```

**createAudioStream() Function:**
```javascript
✓ Creates ReadableStream with start() and cancel() handlers
✓ start() handler stores controller reference
✓ Stores { stream, controller } in readableStreamRef.current
✓ Controller used by AudioWorklet onmessage to enqueue data
✓ cancel() handler logs cancellation reason
```

**setupAudioPipeline() Function:**
```javascript
// Correct order is critical (from memory: Firefox Mac fix)
✓ Step 1: Calls getMediaStream() FIRST to get mic sample rate
✓ Step 2: Stores stream in streamRef.current
✓ Step 3: Calls setupAudioContext(micSampleRate)
✓ Step 4: Calls setupAudioWorklet(mediaStream)
✓ Step 5: Calls createAudioStream()
✓ Step 6: Calls audioStream.pipeTo(transcriberRef.current.stream())
✓ pipeTo() NOT awaited (would block forever - from Dictation.md bug fix)
✓ pipeTo() has .catch() handler for errors
✓ Console log: "Audio pipeline setup complete"
```

**Sample Rate Handling:**
- Chrome: 16kHz AudioContext, no resampling needed
- Firefox: Default AudioContext (typically 48kHz), AudioWorklet resamples to 16kHz
- Safari: 48kHz typical, AudioWorklet resamples to 16kHz
- Firefox Mac: MUST use undefined sample rate (strict matching issue from memory)

**Data Flow Verification:**
```javascript
1. ✓ Microphone → MediaStream (48kHz typical from getSettings())
2. ✓ MediaStream → createMediaStreamSource()
3. ✓ MediaStreamSource → AudioWorkletNode via source.connect()
4. ✓ AudioWorkletNode → Processes audio in process() method
5. ✓ AudioWorkletNode → Resamples if contextSampleRate !== 16000
6. ✓ AudioWorkletNode → Converts Float32 to Int16
7. ✓ AudioWorkletNode → Chunks into 100ms/1600 samples
8. ✓ AudioWorkletNode → Posts via port.postMessage()
9. ✓ Port onmessage → Enqueues to ReadableStream controller
10. ✓ ReadableStream → Pipes to transcriberRef.current.stream()
```

**Resource Cleanup (cleanupResources):**
```javascript
✓ Closes ReadableStream controller
✓ Disconnects AudioWorkletNode
✓ Closes AudioWorkletNode port
✓ Sets audioWorkletNodeRef.current = null
✓ Closes AudioContext (if not already closed)
✓ Sets audioContextRef.current = null
✓ Stops all MediaStream tracks via track.stop()
✓ Sets streamRef.current = null
✓ Closes StreamingTranscriber
✓ Sets transcriberRef.current = null
✓ All cleanup wrapped in try/catch blocks
```

**Testing Approach:**
- Mock AudioContext constructor and verify options
- Mock audioWorklet.addModule and verify blob URL creation
- Mock AudioWorkletNode constructor and track connections
- Mock MediaStreamSource creation
- Simulate AudioWorklet port.postMessage events
- Verify ReadableStream controller.enqueue() called with audio data
- Verify ReadableStream.pipeTo() called (not awaited!)
- Test cleanup order and error handling
- Verify isFirefox() detection affects AudioContext creation

---

### 2.9 Token Management & Refresh Testing

**Token Lifecycle in Dictation.jsx:**

**Token State Structure:**
```javascript
const [token, setToken] = useState({
  value: null,      // The actual token string
  expiry: null      // Date object for expiry time
});

// Constants from Dictation.jsx
const TOKEN_REFRESH_BUFFER_MINUTES = 10;
const TOKEN_EXPIRY_HOURS = 2.9;
```

**fetchAssemblyAIToken() Function:**
```javascript
// From Dictation.jsx lines 179-223

✓ Fetches from Lambda URL: https://llck5m4mzd6sa6do3joadjzzs40jtoef.lambda-url.us-east-2.on.aws
✓ Uses GET request with Accept and Content-Type headers
✓ Parses response JSON
✓ Extracts tokenData.token field (not just tokenData)
✓ Calculates expiry: now + 2.9 hours
✓ Sets token state: { value: actualToken, expiry: expiryDate }
✓ Calls scheduleTokenRefresh(expiry)
✓ Returns actualToken (not full tokenData object)
✓ Handles HTTP errors gracefully
✓ Returns null on failure
```

**isTokenValid() Function:**
```javascript
// From Dictation.jsx lines 173-177

✓ Returns false if token.value is null
✓ Returns false if token.expiry is null
✓ Compares current time with expiry
✓ Returns true if now < expiry
✓ Returns false if token expired
```

**scheduleTokenRefresh() Function:**
```javascript
// From Dictation.jsx lines 225-239

✓ Clears existing tokenRefreshTimeoutRef
✓ Calculates time until refresh: expiry - now - 10 minutes buffer
✓ If timeUntilRefresh > 0, sets setTimeout
✓ setTimeout calls fetchAssemblyAIToken()
✓ If timeUntilRefresh <= 0, refreshes immediately
✓ Prevents token from actually expiring (refreshes early)
```

**Token Usage in Recording Flow:**
```javascript
// startDictation() token validation (lines 700-707)

✓ Checks isTokenValid() before starting
✓ If invalid, fetches new token via fetchAssemblyAIToken()
✓ Waits for token before setupTranscriptionConnection()
✓ Throws error if fetch fails
✓ Always uses fresh token for each recording session
```

**Testing Approach:**
```javascript
✓ Mock fetch() for Lambda URL
✓ Mock Date.now() and Date constructor for time control
✓ Mock setTimeout and clearTimeout
✓ Test token fetch success and failure
✓ Test token expiry detection
✓ Test refresh scheduling with various expiry times
✓ Test token validation logic
✓ Test token usage in startDictation flow
```

**Specific Test Cases:**
```javascript
✓ Fresh token → isTokenValid() returns true
✓ Expired token → isTokenValid() returns false
✓ No token → isTokenValid() returns false
✓ Token expires in 15 minutes → Schedule refresh in 5 minutes
✓ Token already expired → Refresh immediately
✓ Lambda fetch fails → Returns null, doesn't crash
✓ Lambda returns wrong format → Handles gracefully
✓ startDictation with valid token → Uses existing token
✓ startDictation with expired token → Fetches new token
✓ Component mount → Fetches initial token
✓ Reinitialize → Fetches fresh token
✓ Multiple rapid startDictation calls → Don't spam token endpoint
```

**Why This Matters:**
Token expiry during recording would cause WebSocket connection failures. Auto-refresh prevents interruptions.

---

### 2.10 Turn-Based Transcription Testing (AssemblyAI)

**Turn Event Handling in Dictation.jsx:**

**StreamingTranscriber Configuration:**
```javascript
// From Dictation.jsx setupTranscriptionConnection() lines 459-463

transcriberRef.current = new StreamingTranscriber({
  token: tokenValue,
  sampleRate: SAMPLE_RATE,  // 16000
  formatTurns: true          // CRITICAL: Enables turn-based events
});

✓ formatTurns: true enables 'turn' events
✓ Replaces old 'transcript' events
✓ Provides turn_order for proper sequencing
```

**Turn Event Structure:**
```javascript
// From Dictation.md lines 514-540

transcriberRef.current.on('turn', (turn) => {
  const { transcript, turn_order, turn_is_formatted, end_of_turn } = turn;
  
  // Store turn by order
  turnsRef.current[turn_order] = {
    transcript,
    is_formatted: turn_is_formatted,
    end_of_turn
  };
  
  // Build complete text from all turns
  const sortedTurns = Object.entries(turnsRef.current)
    .sort(([a], [b]) => parseInt(a) - parseInt(b))
    .map(([, turnData]) => turnData.transcript);
  
  const newText = sortedTurns.join(' ');
});

✓ Each turn has unique turn_order (integer)
✓ Turns stored in turnsRef.current object by order
✓ Turns sorted numerically before display
✓ All turns joined with spaces
✓ No complex similarity matching needed
✓ No manual text replacement logic
```

**Turn Storage and Ordering:**
```javascript
// From Dictation.jsx lines 149-150
const turnsRef = useRef({});              // Stores turn data by turn_order
const currentTurnOrderRef = useRef(-1);   // Tracks latest turn order (unused in current impl)

✓ turnsRef structured as: { [turn_order]: { transcript, is_formatted, end_of_turn } }
✓ Object keys are turn_order integers
✓ Allows out-of-order turn arrival
✓ Sorting ensures correct display order
```

**Turn Lifecycle:**
```javascript
// startDictation() - Reset turns
✓ setTranscription('')
✓ turnsRef.current = {}
✓ currentTurnOrderRef.current = -1

// During recording - Accumulate turns
✓ Each 'turn' event adds to turnsRef.current
✓ Existing turns can be updated (same turn_order)
✓ Transcript built from all turns on each update

// stopDictation() - Finalize transcript
✓ finalTranscription = transcription (complete text)
✓ Sent to parent via onTextStreamUpdate(finalTranscription)
```

**Testing Approach:**
```javascript
✓ Mock StreamingTranscriber 'turn' event handler
✓ Simulate multiple turn events with different turn_orders
✓ Test out-of-order turn arrival (turn 3 before turn 2)
✓ Test turn updates (same turn_order, new transcript)
✓ Test turn metadata usage (is_formatted, end_of_turn)
✓ Verify sorting by turn_order
✓ Verify joining with spaces
✓ Test transcript updates trigger setClipboardContent()
```

**Specific Test Cases:**
```javascript
✓ Single turn → transcript === turn.transcript
✓ Two turns in order (0, 1) → Joined with space
✓ Two turns out of order (1, 0) → Sorted correctly
✓ Turn update (same order) → Transcript updated
✓ Empty transcript in turn → Skipped (return early)
✓ formatTurns: false → Should not use (old implementation)
✓ Turn with metadata → Stored but not currently used in logic
✓ Many turns (10+) → All sorted and joined correctly
✓ Turn 0 → Included (not skipped)
✓ Negative turn_order → Edge case handling
```

**Benefits of Turn-Based Approach:**
```javascript
✓ Eliminates complex similarity matching logic
✓ No need to detect replacements or edits
✓ Automatic ordering via turn_order
✓ Cleaner, more reliable code
✓ Follows AssemblyAI best practices
✓ Prevents text corruption from manual parsing
```

**Why This Matters:**
Previous implementation had complex similarity matching that could corrupt transcriptions. Turn-based approach is simpler and more reliable.

---

### 2.11 Error Handling & Recovery Testing

**Network Errors:**
- S3 upload failure → Continue recording, retry chunk
- SQS send failure → Log error, don't crash
- Token fetch failure → Show error, prevent recording
- Subscription fetch failure → Log warning, allow recording (fail open)
- StreamingTranscriber connection timeout → Show error, cleanup

**Resource Errors:**
- AudioContext creation failure → Show error
- AudioWorklet module load failure → Fallback or error
- ReadableStream error → Close transcriber, cleanup
- MediaRecorder error → Stop recording, cleanup

**State Errors:**
- Start while already starting → Ignore (prevent double-start)
- Stop while not recording → Ignore
- Pause while not recording → Ignore
- Multiple rapid state changes → Handle gracefully

**Testing Approach:**
- Mock failures in each async operation
- Use `Promise.reject()` for network errors
- Verify error boundaries don't crash app
- Verify cleanup happens even on error
- Verify user sees appropriate error messages
- Test error recovery (can start new recording after error)

---

### 2.10 Mobile-Specific Testing

**Android Capacitor:**
- AndroidManifest.xml permissions (RECORD_AUDIO, MODIFY_AUDIO_SETTINGS, CAMERA, RECORD_VIDEO)
- WebView microphone access
- Background recording behavior
- Screen sleep during recording

**iOS Capacitor:**
- Different getUserMedia behavior
- MP4 requirement for MediaRecorder
- Background audio restrictions
- App suspension during recording

**Testing Approach:**
- Mock Capacitor platform detection
- Test different platform-specific code paths
- Simulate mobile permission states
- Test platform-specific MIME types

---

## 3. Testing Implementation Plan

### Phase 1: Setup (Week 1)
1. Create `setupTests.js` with all Web Audio API mocks
2. Create helper utilities for browser simulation
3. Create fixtures for common test scenarios
4. Set up test coverage reporting

### Phase 2: Core Tests (Week 2)
1. Microphone permission tests
2. Browser compatibility tests
3. Recording lifecycle tests
4. NoSleep management tests

### Phase 3: Advanced Tests (Week 3)
1. Page visibility and sleep mode tests ⚠️ **Priority**
2. WebSocket billing prevention tests ⚠️ **Priority**
3. Audio chunking and long recording tests
4. AssemblyAI pipeline tests

### Phase 4: Edge Cases (Week 4)
1. Error handling and recovery tests
2. Mobile-specific tests
3. Integration tests (full recording flow)
4. Performance tests (memory leaks, cleanup)

---

## 4. Testing Best Practices

### Test Organization
- One test file per component: `RecordingManager.test.jsx`, `Dictation.test.jsx`
- Group related tests in `describe()` blocks
- Use descriptive test names: `should disable NoSleep when recording is discarded`

### Test Independence
- Each test should be isolated (no shared state)
- Use `beforeEach()` to reset mocks
- Use `afterEach()` to cleanup resources
- Don't rely on test execution order

### Async Testing
- Always use `async/await` with async operations
- Wrap state changes in `act()`
- Use `waitFor()` for eventual state changes
- Set appropriate timeouts for long operations

### Mock Philosophy
- Mock external dependencies (AWS, AssemblyAI)
- Mock browser APIs (Web Audio, MediaRecorder)
- Don't mock the code you're testing
- Keep mocks simple and readable

---

## 5. Continuous Integration

### Running Tests
```bash
npm test                    # Run all tests
npm test -- --coverage      # Run with coverage report
npm test -- --watch         # Run in watch mode
npm test Recording          # Run specific test file
```

### Pre-Deployment Checklist
- [ ] All tests passing
- [ ] Coverage > 80% for recording components
- [ ] No console errors or warnings
- [ ] Manual smoke test on one device (just to be safe)

### GitHub Actions (Future)
- Run tests on every PR
- Block merge if tests fail
- Generate coverage reports
- Test on multiple Node versions

---

## 6. Known Issues to Prevent (From Memories)

### Browser-Specific
- ✓ Firefox Mac sample rate mismatch → Test default AudioContext
- ✓ Firefox PCM codec not supported → Test MIME type selection
- ✓ iOS requires MP4 → Test iOS user agent detection
- ✓ Safari permission persistence → Test stream reuse

### Billing & Performance
- ✓ WebSocket connected on mount → Test NO connection until recording
- ✓ WebSocket not closed after stop → Test close() called
- ✓ NoSleep enabled indefinitely → Test disable() in all paths
- ✓ Apple devices shutting down → Test NoSleep cleanup

### User Experience
- ✓ Page visibility causing issues → Test visibility change handler
- ✓ Device sleep interrupting recording → Test NoSleep behavior
- ✓ Permissions not working on Firefox/Mac → Test permission states
- ✓ Recording not working after tab switch → Test reinitialization

---

## 7. Success Metrics

### Coverage Goals
- **RecordingManager.jsx**: 90%+ coverage
- **Dictation.jsx**: 90%+ coverage
- **Overall recording functionality**: 85%+ coverage

### Quality Goals
- Zero critical bugs in production
- All browser-specific issues caught before deployment
- All billing issues prevented
- All NoSleep issues prevented

### Time Savings
- **Before**: 2+ hours manual testing on 5 devices
- **After**: 30 seconds automated testing
- **ROI**: After 10 deployments, you've saved 20 hours

---

## 8. Recommended Testing Methodology

### Test-Driven Development (TDD) - For New Features
1. Write test for new feature (it fails)
2. Implement minimum code to pass test
3. Refactor while keeping test green
4. Repeat

### Regression Testing - For Bug Fixes
1. Write test that reproduces the bug
2. Verify test fails (proves bug exists)
3. Fix the bug
4. Verify test passes
5. Keep test to prevent regression

### Snapshot Testing - For UI Components
- Not recommended for recording logic (too dynamic)
- Useful for confirmation popups, credit limit popups
- Keep snapshots small and focused

---

## 9. Next Steps

1. **Review this plan** - Make sure it covers your needs
2. **Prioritize tests** - Which are most important to you?
3. **Create setupTests.js** - Foundation for all tests
4. **Start with high-value tests** - Page visibility and NoSleep first?
5. **Iterate** - Add more tests as you find issues

---

## Questions to Answer Before Implementation

1. **Priority**: Which tests are most critical for you?
   - Page visibility / sleep mode?
   - Browser compatibility?
   - WebSocket billing prevention?
   - All equally important?

2. **Coverage**: Do you want 100% test coverage or focus on critical paths?

3. **Time**: How much time can you dedicate to this?
   - Full implementation: 20-30 hours
   - High-priority tests only: 8-12 hours
   - Minimal viable tests: 4-6 hours

4. **Mobile**: Test mobile-specific code or focus on web first?

5. **CI/CD**: Want automated testing in deployment pipeline?

---

## 10. Implementation Roadmap with Time Estimates

### Phase 1: Critical Infrastructure (4-6 hours)
**Priority: HIGHEST - Foundation for all tests**

1. **Create setupTests.js** (2-3 hours)
   - Mock all Web Audio API components
   - Mock AssemblyAI StreamingTranscriber
   - Mock AWS Amplify (Auth, Storage, API)
   - Mock NoSleep.js
   - Mock browser APIs (getUserMedia, MediaRecorder)
   - Export test utilities for reuse

2. **Create test helper utilities** (1-2 hours)
   - Browser simulation helpers (setupBrowser function)
   - Permission state helpers
   - Audio data simulation helpers
   - Time control helpers for fake timers
   - Mock data factories

3. **Verify test infrastructure** (1 hour)
   - Run basic smoke tests
   - Verify all mocks work correctly
   - Test helper utilities independently

**Deliverable:** Complete testing foundation, ready for component tests

---

### Phase 2: High-Priority Bug Prevention (8-12 hours)
**Priority: CRITICAL - Prevents known costly issues**

1. **Page Visibility & Sleep Mode Tests** (3-4 hours)
   - Dictation.jsx visibility change handler
   - NoSleep lifecycle in both components
   - Timeout handling (80s, 240s)
   - GraphQL subscription management
   - **Prevents: #1 client problem (devices shutting down)**

2. **WebSocket Billing Prevention Tests** (2-3 hours)
   - Component mount behavior
   - Recording start/stop lifecycle
   - Page visibility reconnection
   - TranscriberRef null state verification
   - **Prevents: Astronomical billing costs**

3. **NoSleep Management Tests** (2 hours)
   - Enable/disable in all code paths
   - Component unmount handling
   - Error scenario handling
   - **Prevents: Battery drain, device shutdowns**

4. **Firefox Mac Sample Rate Tests** (1-2 hours)
   - isFirefox() detection
   - AudioContext creation with undefined sample rate
   - AudioWorklet resampling verification
   - **Prevents: Dictation not working on Firefox/Mac**

**Deliverable:** Tests for all major bugs from memories, prevents regressions

---

### Phase 3: Core Functionality Tests (6-8 hours)
**Priority: HIGH - Ensures basic features work**

1. **Browser Compatibility Tests** (2-3 hours)
   - MIME type selection per browser
   - Sample rate handling per browser
   - User agent detection
   - MediaRecorder configuration

2. **Recording Lifecycle Tests** (2-3 hours)
   - Start, stop, pause, resume, discard
   - State transitions
   - MediaRecorder lifecycle
   - Resource cleanup

3. **Microphone Permission Tests** (2 hours)
   - Permission granted/denied/not found
   - getUserMedia error scenarios
   - Constraint flexibility

**Deliverable:** Confidence in core recording features across browsers

---

### Phase 4: Advanced Features (8-10 hours)
**Priority: MEDIUM - Ensures quality and reliability**

1. **Audio Pipeline Tests** (3-4 hours)
   - AudioWorklet processor testing
   - ReadableStream pipeline
   - setupAudioPipeline() sequence
   - Resource cleanup order

2. **Audio Chunking & Long Recording Tests** (2-3 hours)
   - 4-minute chunk logic
   - S3 upload with correct paths
   - SQS message formatting
   - Final chunk marker
   - 12+ minute recording simulation

3. **Token Management Tests** (2 hours)
   - Token fetch and refresh
   - Expiry detection
   - Scheduled refresh
   - Usage in recording flow

4. **Turn-Based Transcription Tests** (1-2 hours)
   - Turn event handling
   - Out-of-order turn arrival
   - Turn sorting and joining
   - Metadata storage

**Deliverable:** Comprehensive coverage of all features

---

### Phase 5: Edge Cases & Polish (4-6 hours)
**Priority: LOWER - Nice to have**

1. **Error Handling Tests** (2-3 hours)
   - Network failure scenarios
   - Resource errors
   - State errors
   - Recovery paths

2. **Mobile-Specific Tests** (2-3 hours)
   - iOS platform detection
   - Android platform handling
   - Capacitor integration
   - Permission models

**Deliverable:** Robust error handling, mobile support verified

---

## 11. Quick Win Tests (Start Here!)

If you want immediate value with minimal time investment:

### Option A: Top 5 Critical Tests (4-6 hours)
1. **WebSocket NOT created on mount** (1 hour)
   - Prevents billing issues immediately
   - Single focused test
   
2. **NoSleep disabled on stopRecording** (1 hour)
   - Prevents battery drain
   - Fixes missing bug from memory

3. **Firefox uses undefined sample rate** (1 hour)
   - Fixes Firefox Mac issue
   - Simple browser detection test

4. **reinitializeDictation doesn't create WebSocket** (1 hour)
   - Prevents visibility change billing
   - Verifies critical fix

5. **80-second timeout works** (1-2 hours)
   - Prevents infinite "Preparing Transcript"
   - Client experience improvement

**ROI:** Prevents the 4 most expensive bugs with minimal effort

---

### Option B: One Component at a Time (per component)
1. **Start with Dictation.jsx** (12-16 hours for complete coverage)
   - Contains most critical bugs
   - WebSocket billing prevention
   - Page visibility handling
   - AudioWorklet pipeline

2. **Then RecordingManager.jsx** (8-12 hours for complete coverage)
   - Audio chunking
   - S3/SQS uploads
   - Timeout handling
   - NoSleep management

**ROI:** One bulletproof component at a time

---

## 12. Success Metrics & Validation

### Coverage Targets
- **Dictation.jsx**: 90%+ line coverage (especially critical paths)
- **RecordingManager.jsx**: 85%+ line coverage
- **Critical functions**: 100% coverage
  - `cleanupResources()`
  - `reinitializeDictation()`
  - `setupAudioPipeline()`
  - `stopRecording()`
  - `stopDictation()`

### Regression Prevention Checklist
- [ ] All bugs from memories have tests
- [ ] Firefox Mac sample rate issue caught
- [ ] WebSocket billing issue caught
- [ ] NoSleep battery drain caught
- [ ] Page visibility issues caught
- [ ] All timeout scenarios tested

### Deployment Safety Checklist
- [ ] Run `npm test` passes before each deploy
- [ ] No console.error in test output
- [ ] Coverage report generated
- [ ] Critical paths 100% covered
- [ ] Manual smoke test on one device (old habit, but faster)

---

## 13. Maintenance & Updates

### When to Update Tests
1. **Always:** When fixing a bug (write test first, then fix)
2. **Always:** When adding new features
3. **Sometimes:** When refactoring (update if behavior changes)
4. **Never:** Just to increase coverage percentage (focus on critical paths)

### Test Maintenance Time
- **Per bug fix:** 30 minutes - 1 hour (write test, fix, verify)
- **Per new feature:** 1-2 hours (design tests, implement, cover edge cases)
- **Periodic review:** 2 hours per quarter (update deprecated mocks, fix flaky tests)

### Red Flags (Tests that need attention)
- Tests failing intermittently (timing issues)
- Tests taking >5 seconds (too slow)
- Tests with many mocks (too coupled)
- Tests that always pass (not testing anything)

---

**Ready to proceed when you are. Let me know which phase or option you'd like to start with!**