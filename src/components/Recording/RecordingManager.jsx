import { useState, useRef, useEffect } from 'react';
import NoSleep from 'nosleep.js';
import useAudioUploadQueue from './useAudioUploadQueue';
import useMediaRecorderController from './useMediaRecorderController';
import useNoteGeneration from './useNoteGeneration';
import { AUDIO_UPLOAD_FAILURE_MESSAGE } from './recordingConstants';
import { createRecordingTelemetryClient } from './recordingTelemetryClient';
import { getRecordingClientContext } from './recordingTelemetryContext';

const createManagerTelemetryClient = (clientContext) => createRecordingTelemetryClient({
  clientContext,
  onDeliveryFailure: ({ errorCode }) => {
    console.error(`Recording telemetry delivery failed: ${errorCode}`);
  },
  onRejected: ({ code }) => {
    console.error(`Recording telemetry event rejected: ${code}`);
  }
});

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
  const recordingJobIdRef = useRef(null);
  const noSleepRef = useRef(null);
  const isDiscardingRef = useRef(false);
  const terminalOutcomeRef = useRef(null);
  const telemetryContextRef = useRef(null);
  const telemetryClientRef = useRef(null);
  const cleanupRef = useRef({
    cleanupRecorder: () => {},
    cancelRecordingForFailure: () => {},
    cleanupNoteGeneration: () => {}
  });

  if (!telemetryContextRef.current) {
    telemetryContextRef.current = getRecordingClientContext();
  }
  if (!telemetryClientRef.current) {
    telemetryClientRef.current = createManagerTelemetryClient(telemetryContextRef.current);
  }

  const emitTelemetry = (eventName, payload = {}, jobId = recordingJobIdRef.current) => (
    telemetryClientRef.current?.emit(jobId, eventName, payload) || null
  );

  const {
    subscribeToNoteCompletion,
    failNoteGeneration,
    resetNoteGenerationState,
    cleanupNoteGeneration
  } = useNoteGeneration({
    timeStampRef,
    recordingJobIdRef,
    isDiscardingRef,
    terminalOutcomeRef,
    noSleepRef,
    emitTelemetry,
    telemetryContext: telemetryContextRef.current,
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
    emitTelemetry,
    telemetryContext: telemetryContextRef.current,
    onFinalAudioQueued: (userId, timestamp, recordingJobId) => {
      setIsTranscriptCompleted(false);
      subscribeToNoteCompletion(userId, timestamp, recordingJobId);
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
    recordingJobIdRef,
    noSleepRef,
    isDiscardingRef,
    terminalOutcomeRef,
    emitTelemetry,
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
    setTextStream,
    onTextStreamUpdate,
    onTransitionToMainApp
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
    if (telemetryClientRef.current?.isDisposed) {
      telemetryClientRef.current = createManagerTelemetryClient(telemetryContextRef.current);
    }
    telemetryClientRef.current?.start();
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
      telemetryClientRef.current?.dispose();
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
    recordingJobId: recordingJobIdRef.current,
    textStream
  };
}

export default RecordingManager;
