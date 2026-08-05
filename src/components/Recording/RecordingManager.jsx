import { useState, useRef, useEffect } from 'react';
import NoSleep from 'nosleep.js';
import useAudioUploadQueue from './useAudioUploadQueue';
import useMediaRecorderController from './useMediaRecorderController';
import useNoteGeneration from './useNoteGeneration';
import { AUDIO_UPLOAD_FAILURE_MESSAGE } from './recordingConstants';

function RecordingManager({ onTextStreamUpdate, onTransitionToMainApp }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isPreparingTranscript, setIsPreparingTranscript] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [isTranscriptCompleted, setIsTranscriptCompleted] = useState(false);
  const [textStream, setTextStream] = useState('');

  const timeStampRef = useRef(null);
  const pathStampRef = useRef(null);
  const filePathRef = useRef(null);
  const noSleepRef = useRef(null);
  const isDiscardingRef = useRef(false);
  const cleanupRef = useRef({
    cleanupRecorder: () => {},
    cancelRecordingForFailure: () => {},
    cleanupNoteGeneration: () => {}
  });

  const {
    subscribeToNoteCompletion,
    failNoteGeneration,
    resetNoteGenerationState,
    cleanupNoteGeneration
  } = useNoteGeneration({
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
    startUploadSession,
    cancelUploadSession
  } = useAudioUploadQueue({
    filePathRef,
    onFinalAudioQueued: (userId, timestamp) => {
      setIsTranscriptCompleted(false);
      subscribeToNoteCompletion(userId, timestamp);
    },
    onUploadError: (error) => {
      failNoteGeneration(
        'audio_submission_failed',
        error,
        AUDIO_UPLOAD_FAILURE_MESSAGE
      );
      cleanupRef.current.cancelRecordingForFailure();
    }
  });

  const {
    startRecording,
    stopRecording,
    discardRecording,
    pauseRecording,
    resumeRecording,
    cleanupRecorder,
    cancelRecordingForFailure,
    isRecordingRef,
    isPausedRef
  } = useMediaRecorderController({
    timeStampRef,
    pathStampRef,
    filePathRef,
    noSleepRef,
    isDiscardingRef,
    queueUpload,
    startUploadSession,
    cancelUploadSession,
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
      cancelRecordingForFailure,
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

  useEffect(() => {
    return () => {
      cleanupRef.current.cleanupRecorder();
      cleanupRef.current.cleanupNoteGeneration();
    };
  }, []);

  return {
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
