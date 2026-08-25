import {
  classifyAudioChunk,
  getFinalizationAction,
  getPauseAction,
  getResumeAction,
  shouldRestartRecorder,
  shouldUseExternalChunkRotation,
  usesMediaRecorderTimeslice
} from './recordingLifecycle';

describe('recording lifecycle decisions', () => {
  it('uses one Android chunk scheduler', () => {
    expect(usesMediaRecorderTimeslice(true)).toBe(true);
    expect(shouldUseExternalChunkRotation(true)).toBe(false);
  });

  it('keeps external rotation for non-Android recorders', () => {
    expect(usesMediaRecorderTimeslice(false)).toBe(false);
    expect(shouldUseExternalChunkRotation(false)).toBe(true);
  });

  it('flushes Android at pause and starts a fresh container at resume', () => {
    expect(getPauseAction({ isAndroid: true, recorderState: 'recording' })).toBe('stop');
    expect(getResumeAction({ isAndroid: true, recorderState: 'inactive' })).toBe('start');
  });

  it('uses native MediaRecorder pause and resume outside Android', () => {
    expect(getPauseAction({ isAndroid: false, recorderState: 'recording' })).toBe('pause');
    expect(getResumeAction({ isAndroid: false, recorderState: 'paused' })).toBe('resume');
  });

  it('treats normal timeslice data as a regular chunk', () => {
    expect(classifyAudioChunk({
      blobSize: 1001,
      minimumBlobSize: 1000,
      isDiscarding: false,
      isFinalizing: false,
      isRecorderInactive: false,
      hasQueuedFinalChunk: false
    })).toBe('regular');
  });

  it('marks exactly one intentional inactive-stop event as final', () => {
    const event = {
      blobSize: 1001,
      minimumBlobSize: 1000,
      isDiscarding: false,
      isFinalizing: true,
      isRecorderInactive: true
    };

    expect(classifyAudioChunk({ ...event, hasQueuedFinalChunk: false })).toBe('final');
    expect(classifyAudioChunk({ ...event, hasQueuedFinalChunk: true })).toBe('skip');
  });

  it('keeps a non-empty finalization marker even below the regular audio threshold', () => {
    expect(classifyAudioChunk({
      blobSize: 20,
      minimumBlobSize: 1000,
      isDiscarding: false,
      isFinalizing: true,
      isRecorderInactive: true,
      hasQueuedFinalChunk: false
    })).toBe('final');
  });

  it('flushes every supported recorder state when the user stops', () => {
    expect(getFinalizationAction({
      isAndroid: false,
      isPaused: true,
      recorderState: 'paused'
    })).toBe('resume-and-stop');
    expect(getFinalizationAction({
      isAndroid: false,
      isPaused: false,
      recorderState: 'recording'
    })).toBe('stop');
    expect(getFinalizationAction({
      isAndroid: true,
      isPaused: true,
      recorderState: 'inactive'
    })).toBe('start-and-stop');
  });

  it('does not restart after finalization, discard, or cleanup', () => {
    const activeStoppedRecorder = {
      isRecording: true,
      isPaused: false,
      recorderState: 'inactive'
    };

    expect(shouldRestartRecorder({ ...activeStoppedRecorder, isFinalizing: true, isDiscarding: false })).toBe(false);
    expect(shouldRestartRecorder({ ...activeStoppedRecorder, isFinalizing: false, isDiscarding: true })).toBe(false);
    expect(shouldRestartRecorder({ ...activeStoppedRecorder, isFinalizing: false, isDiscarding: false })).toBe(true);
  });
});
