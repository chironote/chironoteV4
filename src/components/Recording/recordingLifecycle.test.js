import {
  classifyAudioChunk,
  getFinalizationAction,
  shouldRestartRecorder,
  shouldUseExternalChunkRotation,
  usesMediaRecorderTimeslice
} from './recordingLifecycle';

describe('recording lifecycle decisions', () => {
  it('uses Android MediaRecorder timeslices without external rotation', () => {
    expect(usesMediaRecorderTimeslice(true)).toBe(true);
    expect(shouldUseExternalChunkRotation(true)).toBe(false);
  });

  it('keeps external rotation for non-Android recorders', () => {
    expect(usesMediaRecorderTimeslice(false)).toBe(false);
    expect(shouldUseExternalChunkRotation(false)).toBe(true);
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

  it('marks exactly one inactive intentional-stop event as final', () => {
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

  it('resumes a paused recorder before its final stop flush', () => {
    expect(getFinalizationAction('paused')).toBe('resume-and-stop');
    expect(getFinalizationAction('recording')).toBe('stop');
    expect(getFinalizationAction('inactive')).toBe('none');
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
