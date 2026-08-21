export const usesMediaRecorderTimeslice = (isAndroid) => Boolean(isAndroid);

export const shouldUseExternalChunkRotation = (isAndroid) => !usesMediaRecorderTimeslice(isAndroid);

export const getFinalizationAction = (recorderState) => {
  if (recorderState === 'paused') {
    return 'resume-and-stop';
  }

  if (recorderState === 'recording') {
    return 'stop';
  }

  return 'none';
};

export const classifyAudioChunk = ({
  blobSize,
  minimumBlobSize,
  isDiscarding,
  isFinalizing,
  isRecorderInactive,
  hasQueuedFinalChunk
}) => {
  if (isDiscarding || blobSize < minimumBlobSize) {
    return 'skip';
  }

  if (isFinalizing && isRecorderInactive) {
    return hasQueuedFinalChunk ? 'skip' : 'final';
  }

  return 'regular';
};

export const shouldRestartRecorder = ({
  isFinalizing,
  isRecording,
  isPaused,
  isDiscarding,
  recorderState
}) => (
  !isFinalizing &&
  isRecording &&
  recorderState === 'inactive' &&
  !isPaused &&
  !isDiscarding
);
