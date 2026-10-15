import { useState, useRef, useEffect } from 'react';
import NoSleep from 'nosleep.js';
import useAudioUploadQueue from './useAudioUploadQueue';
import useMediaRecorderController from './useMediaRecorderController';
import useNoteGeneration from './useNoteGeneration';

function RecordingManager({ onTextStreamUpdate, onTransitionToMainApp, onSavedNoteReady, onGenerationStateChange, onGenerationError }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isPreparingTranscript, setIsPreparingTranscript] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [isTranscriptCompleted, setIsTranscriptCompleted] = useState(false);
  const [generationError, setGenerationError] = useState('');
  const [textStream, setTextStream] = useState('');
  const [completionStatus, setCompletionStatus] = useState('');
  const foregroundRef = useRef(true);

  const timeStampRef = useRef(null);
  const pathStampRef = useRef(null);
  const filePathRef = useRef(null);
  const noSleepRef = useRef(null);
  const isDiscardingRef = useRef(false);
  const cleanupRef = useRef({
    cleanupRecorder: () => {},
    cleanupNoteGeneration: () => {}
  });

  const {
    subscribeToNoteCompletion,
    resetNoteGenerationState,
    cleanupNoteGeneration
  } = useNoteGeneration({
    isForeground: timestamp => foregroundRef.current && timestamp === timeStampRef.current,
    onBackgroundStatus: setCompletionStatus,
    onGenerationError: message => { setGenerationError(message); onGenerationError?.(message); },
    onGenerationStateChange,
    onSavedNoteReady,
    timeStampRef,
    isDiscardingRef,
    noSleepRef,
    setTextStream,
    setIsPreparingTranscript,
    setIsGeneratingSummary,
    setIsTranscriptCompleted,
    onTextStreamUpdate,
    onTransitionToMainApp
  });

  const {
    queueUpload,
    clearUploadQueue,
    retryUploads,
    uploadStatus
  } = useAudioUploadQueue({
    timeStampRef,
    filePathRef,
    onFinalAudioQueued: (userId, timestamp, capture) => {
      if (foregroundRef.current && timestamp === timeStampRef.current) setIsTranscriptCompleted(false);
      subscribeToNoteCompletion(userId, timestamp, capture);
    }
  });

  const {
    isStarting,
    startRecording: startRecorderSession,
    stopRecording,
    discardRecording: discardRecorderSession,
    pauseRecording,
    resumeRecording,
    cleanupRecorder,
    isRecordingRef,
    isPausedRef
  } = useMediaRecorderController({
    timeStampRef,
    pathStampRef,
    filePathRef,
    noSleepRef,
    isDiscardingRef,
    queueUpload,
    clearUploadQueue,
    cleanupNoteGeneration,
    resetNoteGenerationState,
    setIsRecording,
    setIsPaused,
    setIsPreparingTranscript,
    setIsGeneratingSummary,
    setIsTranscriptCompleted,
    setTextStream
  });

  useEffect(() => {
    cleanupRef.current = {
      cleanupRecorder,
      cleanupNoteGeneration
    };
  });

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording, isRecordingRef]);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused, isPausedRef]);

  useEffect(() => {
    noSleepRef.current = new NoSleep();
    return () => {
      if (noSleepRef.current) {
        noSleepRef.current.disable();
      }
    };
  }, []);

  const continueInBackground = () => {
    foregroundRef.current = false;
    setIsPreparingTranscript(false);
    setIsGeneratingSummary(false);
    onGenerationStateChange?.(false);
    onTransitionToMainApp();
  };

  const startRecording = metadata => {
    foregroundRef.current = true;
    setCompletionStatus('');
    setIsPreparingTranscript(false);
    setIsGeneratingSummary(false);
    onGenerationStateChange?.(false);
    const previousTimestamp = timeStampRef.current;
    const ready = startRecorderSession(metadata);
    const timestamp = timeStampRef.current;
    const created = timestamp !== null && timestamp !== previousTimestamp;
    // Eligibility runs after microphone start and can outlive this popup/session.
    // Keep its cancellation bound to the session it actually started.
    return Object.assign(ready, {
      isCurrent: () => created && timestamp === timeStampRef.current && !isDiscardingRef.current,
      discard: () => { if (created) discardRecording(timestamp); }
    });
  };

  const discardRecording = (timestamp = timeStampRef.current) => {
    if (timestamp !== timeStampRef.current) {
      clearUploadQueue(timestamp);
      cleanupNoteGeneration(timestamp);
      return;
    }
    discardRecorderSession();
    onGenerationStateChange?.(false);
  };

  useEffect(() => {
    return () => {
      cleanupRef.current.cleanupRecorder();
      cleanupRef.current.cleanupNoteGeneration();
    };
  }, []);

  return {
    continueInBackground,
    uploadStatus,
    completionStatus,
    retryUploads,
    generationError,
    isStarting,
    isRecording,
    isPaused,
    isPreparingTranscript,
    isGeneratingSummary,
    isTranscriptCompleted,
    startRecording,
    stopRecording,
    discardRecording,
    pauseRecording,
    resumeRecording,
    textStream
  };
}

export default RecordingManager;
