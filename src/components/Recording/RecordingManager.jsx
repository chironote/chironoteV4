import { useState, useRef, useEffect } from 'react';
import NoSleep from 'nosleep.js';
import useAudioUploadQueue from './useAudioUploadQueue';
import useMediaRecorderController from './useMediaRecorderController';
import useNoteGeneration from './useNoteGeneration';

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
    cleanupNoteGeneration: () => {}
  });

  const {
    subscribeToNoteCompletion,
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
    clearUploadQueue
  } = useAudioUploadQueue({
    timeStampRef,
    filePathRef,
    onFinalAudioQueued: (userId, timestamp) => {
      setIsTranscriptCompleted(false);
      subscribeToNoteCompletion(userId, timestamp);
    }
  });

  const {
    startRecording,
    stopRecording,
    discardRecording,
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
