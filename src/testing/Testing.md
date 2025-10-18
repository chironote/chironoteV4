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
   - Should use: `audio/webm; codecs="pcm"`
   - Sample rate: 16kHz AudioContext
   - Full AudioWorklet support

2. **Firefox (Windows)**
   - Should use: `audio/webm` (no PCM codec)
   - Sample rate: Default (let browser decide)
   - AudioWorklet resampling required

3. **Firefox (Mac)** ⚠️ **Known problem area**
   - Should use: `audio/webm`
   - Sample rate: Must NOT force 16kHz (use default)
   - Strict sample rate matching issues
   - AudioWorklet resampling critical

4. **Safari (Mac)**
   - Should use: `audio/webm`
   - Sample rate: 48kHz typical
   - Permission persistence issues

5. **iOS Safari/WebView**
   - Should use: `video/mp4`
   - Limited AudioWorklet support
   - Different permission model

**Testing Approach:**
- Mock `navigator.userAgent` for each browser
- Mock `MediaRecorder.isTypeSupported()` based on browser
- Test that correct MIME type is selected
- Test that correct AudioContext sample rate is used (or not specified for Firefox)

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

**4-Minute Chunks:**
- Recording should stop and restart MediaRecorder every 240 seconds
- Each chunk should upload to S3 with unique path
- Chunk paths should include: `_chunk_`, timestamp, and sequence number
- Final chunk should include: `_final_` marker

**12+ Minute Recordings:**
- Should create 3+ chunks for 12-minute recording
- Upload queue should process sequentially (not parallel)
- Regular chunks should upload before final chunk
- No chunks should be lost or duplicated

**Testing Approach:**
- Use `jest.useFakeTimers()` to control time
- Fast-forward time with `jest.advanceTimersByTime(240000)`
- Track uploadData calls and their paths
- Verify chunk sequence numbers increment correctly
- Verify final chunk is always last in queue

**Why This Matters:**
You specifically mentioned testing 12+ minute recordings. This automates that.

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
   - Should reinitialize Dictation (token fetch only, no WebSocket)
   - Should NOT reconnect WebSocket (prevents billing)
   - Should work when user clicks record again

**Device Sleep/Lock:**
1. **Device goes to sleep during recording**
   - NoSleep should prevent this (but may fail on some devices)
   - If sleep happens, recording should handle gracefully
   - Should not crash or corrupt audio

2. **Device goes to sleep during processing**
   - Should timeout gracefully after 80 seconds
   - Should transition to main app
   - Should disable NoSleep on wake

**Testing Approach:**
- Mock `document.hidden` property changes
- Mock `document.visibilitychange` events
- Mock `Page Visibility API` states
- Simulate: `visible` → `hidden` → `visible` cycles
- Test NoSleep enable/disable calls
- Test WebSocket close/reconnect behavior
- Mock timeout scenarios (80-second subscription wait, 120-second generate timeout)

**Specific Test Cases:**
```
✓ Visibility hidden during recording → NoSleep stays enabled
✓ Visibility hidden during transcript prep → Subscription stays active
✓ Visibility visible after hidden → Reinitialize WITHOUT WebSocket
✓ Return from background → Can start new recording
✓ NoSleep disabled after discard
✓ NoSleep disabled after successful completion
✓ Device lock simulation → Recording fails gracefully
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

**Initialization:**
- ✓ Component mount → NO WebSocket connection
- ✓ Component mount → Token fetched
- ✓ Component mount → Subscription data fetched
- ✗ Component mount → No StreamingTranscriber created

**Recording Start:**
- ✓ Start dictation → Create NEW StreamingTranscriber
- ✓ Start dictation → Establish fresh WebSocket
- ✓ WebSocket open → Billing starts (log this)

**Recording Stop:**
- ✓ Stop dictation → Close WebSocket immediately
- ✓ Stop dictation → Reset isTranscriberReady to false
- ✓ WebSocket closed → Billing stops (log this)
- ✗ Stop dictation → NO reconnection

**Page Visibility:**
- ✓ Page hidden → No action (WebSocket stays connected if recording)
- ✓ Page visible → Reinitialize (token only, NO WebSocket)
- ✗ Page visible → Should NOT create WebSocket until next recording

**Testing Approach:**
- Mock StreamingTranscriber constructor
- Count constructor calls (should match recording session count)
- Mock .connect() and .close() methods
- Verify close() called before next connect()
- Verify NO connections during idle periods
- Test visibility change doesn't create WebSocket

**Why This Matters:**
This was causing "astronomical billing costs." These tests ensure it never happens again.

---

### 2.8 AssemblyAI Audio Pipeline Testing

**What to Test:**

**AudioWorklet Processing:**
- AudioContext created with correct sample rate (or undefined for Firefox)
- AudioWorklet module loaded from blob URL
- MediaStreamSource connected to AudioWorklet
- AudioWorklet connected to destination
- PCM data enqueued to ReadableStream
- ReadableStream piped to StreamingTranscriber

**Sample Rate Handling:**
- Chrome: 16kHz AudioContext, no resampling
- Firefox: Default AudioContext, resampling in AudioWorklet
- Safari: 48kHz typical, resampling in AudioWorklet
- iOS: Different approach (limited AudioWorklet)

**Data Flow:**
1. Microphone → MediaStream (48kHz typical)
2. MediaStream → MediaStreamSource
3. MediaStreamSource → AudioWorkletNode
4. AudioWorkletNode → Resample to 16kHz if needed
5. AudioWorkletNode → Convert Float32 to Int16
6. AudioWorkletNode → 100ms chunks (1600 samples)
7. ReadableStream → Pipe to AssemblyAI

**Testing Approach:**
- Mock AudioContext and verify sample rate
- Mock AudioWorklet.addModule and verify blob URL
- Mock AudioWorkletNode and track connections
- Simulate audio data through the pipeline
- Verify ReadableStream.pipeTo() called with transcriber stream
- Test cleanup (stream.cancel(), context.close(), etc.)

---

### 2.9 Error Handling & Recovery Testing

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

**Ready to proceed when you are. Let me know which areas are highest priority.**