// Uploaded blobs are transcribed independently, so every periodic chunk must
// be a complete media container. MediaRecorder timeslices may be dependent
// fragments of one WebM container and are therefore unsafe for this pipeline.
export const usesMediaRecorderTimeslice = () => false;

export const shouldUseExternalChunkRotation = (isAndroid) => !usesMediaRecorderTimeslice(isAndroid);

export const getPauseAction = ({ isAndroid, recorderState }) => {
  if (recorderState !== 'recording') {
    return 'none';
  }

  return isAndroid ? 'stop' : 'pause';
};

export const getResumeAction = ({ isAndroid, recorderState }) => {
  if (isAndroid && recorderState === 'inactive') {
    return 'start';
  }

  if (recorderState === 'paused') {
    return 'resume';
  }

  return 'none';
};

export const getFinalizationAction = ({
  isAndroid,
  isPaused,
  recorderState
}) => {
  if (recorderState === 'paused') {
    return 'resume-and-stop';
  }

  if (recorderState === 'recording') {
    return 'stop';
  }

  if (isAndroid && isPaused && recorderState === 'inactive') {
    return 'start-and-stop';
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
  if (isDiscarding || blobSize <= 0) {
    return 'skip';
  }

  if (isFinalizing && isRecorderInactive) {
    return hasQueuedFinalChunk ? 'skip' : 'final';
  }

  if (blobSize < minimumBlobSize) {
    return 'skip';
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
