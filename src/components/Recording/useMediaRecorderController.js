import { useRef } from 'react';
import {
  AUDIO_CHUNK_INTERVAL_MS,
  AUDIO_UPLOAD_FAILURE_MESSAGE,
  MIN_AUDIO_BLOB_SIZE,
  RECORDING_CAPTURE_FAILURE_MESSAGE
} from './recordingConstants';
import { getUserId } from './recordingAuth';
import { getRecordingMediaDescriptor } from './recordingMedia';
import {
  createPrivacySafeDeviceHash,
  getAppliedTrackSettings
} from './recordingTelemetryContext';
import { createSignalHealthMonitor } from './recordingSignalHealth';
import {
  addRecordingSupportReference,
  createRecordingJobId,
  toSafeErrorCode
} from './recordingTelemetrySchema';

const RECORDING_AUDIO_CONSTRAINTS = Object.freeze({
  channelCount: 1,
  echoCancellation: false,
  noiseSuppression: false,
  autoGainControl: false
});

function useMediaRecorderController({
  timeStampRef,
  pathStampRef,
  filePathRef,
  recordingJobIdRef = { current: null },
  noSleepRef,
  isDiscardingRef,
  terminalOutcomeRef = { current: null },
  emitTelemetry = () => {},
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
  onTextStreamUpdate = () => {},
  onTransitionToMainApp = () => {}
}) {
  const mediaRecorderRef = useRef(null);
  const recordingIntervalRef = useRef(null);
  const lastUploadedChunkRef = useRef(0);
  const isRecordingRef = useRef(false);
  const isPausedRef = useRef(false);
  const isFinalizingRecordingRef = useRef(false);
  const streamRef = useRef(null);
  const recordingSessionIdRef = useRef(null);
  const discardResetTimeoutRef = useRef(null);
  const audioEventChainRef = useRef(Promise.resolve());
  const emittedChunkOrderRef = useRef(0);
  const captureStartedAtRef = useRef(null);
  const signalHealthMonitorRef = useRef(null);
  const isAndroid = useRef(/android/i.test(navigator.userAgent)).current;
  const isSafari = useRef(/^((?!chrome|android).)*safari/i.test(navigator.userAgent)).current;

  const emitTerminalOutcome = (eventName, payload = {}) => {
    if (terminalOutcomeRef.current) {
      return;
    }
    terminalOutcomeRef.current = eventName;
    emitTelemetry(eventName, payload);
  };

  const showRecordingFailure = (message) => {
    const messageWithReference = addRecordingSupportReference(
      message,
      recordingJobIdRef.current
    );
    setTextStream(messageWithReference);
    onTextStreamUpdate(messageWithReference);
    onTransitionToMainApp();
  };

  const stopSignalHealthMonitor = () => {
    if (!signalHealthMonitorRef.current) {
      return null;
    }
    const summary = signalHealthMonitorRef.current.stop();
    signalHealthMonitorRef.current = null;
    emitTelemetry('signal.summary', summary);
    return summary;
  };

  const startChunkInterval = () => {
    recordingIntervalRef.current = setInterval(() => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    }, AUDIO_CHUNK_INTERVAL_MS);
  };

  const startRecorder = () => {
    if (isAndroid) {
      mediaRecorderRef.current.start(AUDIO_CHUNK_INTERVAL_MS);
    } else {
      mediaRecorderRef.current.start();
    }
  };

  const setupRecorder = async () => {
    try {
      setTextStream('');

      let stream = streamRef.current;
      if (!stream || !stream.active) {
        console.log('[RecordingManager] Creating new media stream');
        stream = await navigator.mediaDevices.getUserMedia({
          audio: RECORDING_AUDIO_CONSTRAINTS
        });
        streamRef.current = stream;
      } else {
        console.log('[RecordingManager] Reusing existing media stream');
      }

      const uaString = navigator.userAgent.toLowerCase();
      let options = {};

      if (/iphone|ipad/i.test(uaString)) {
        options = { mimeType: 'video/mp4' };
      } else if (/firefox/i.test(uaString)) {
        options = { mimeType: 'audio/webm' };
      } else if (MediaRecorder.isTypeSupported('audio/webm; codecs="pcm"')) {
        options = { mimeType: 'audio/webm; codecs="pcm"' };
      }

      const recorder = new MediaRecorder(stream, options);
      const audioTrack = stream.getAudioTracks?.()[0] || stream.getTracks?.()[0];
      const recorderSessionId = recordingSessionIdRef.current;
      const recorderTimestamp = timeStampRef.current;
      const recorderPathstamp = pathStampRef.current;
      mediaRecorderRef.current = recorder;

      const safeTrackSettings = getAppliedTrackSettings(audioTrack);
      createPrivacySafeDeviceHash(audioTrack, recordingJobIdRef.current)
        .catch(() => null)
        .then((deviceHash) => {
          if (
            isDiscardingRef.current ||
            recordingSessionIdRef.current !== recorderSessionId
          ) {
            return;
          }
          emitTelemetry('capture.settings_applied', {
            appliedTrackSettings: safeTrackSettings,
            deviceHash: deviceHash || undefined,
            deviceType: 'microphone',
            mimeType: recorder.mimeType || options.mimeType || 'audio/webm',
            requestedTrackSettings: RECORDING_AUDIO_CONSTRAINTS
          });
        });
      signalHealthMonitorRef.current = createSignalHealthMonitor(stream);

      recorder.ondataavailable = (event) => {
        if (isDiscardingRef.current) {
          return;
        }

        const audioBlob = event.data;
        const isFinalAudio = (
          isFinalizingRecordingRef.current &&
          event.target?.state === 'inactive'
        );
        const sessionId = recorderSessionId;
        const timestamp = recorderTimestamp;
        const pathstamp = recorderPathstamp;
        const mediaDescriptor = getRecordingMediaDescriptor(
          audioBlob.type,
          event.target?.mimeType
        );
        const chunkOrder = emittedChunkOrderRef.current;
        emittedChunkOrderRef.current += 1;

        if (!sessionId || !timestamp || !pathstamp) {
          return;
        }

        if (audioBlob.size < MIN_AUDIO_BLOB_SIZE) {
          emitTelemetry('chunk.rejected', {
            chunkBytes: audioBlob.size,
            chunkOrder,
            container: mediaDescriptor.extension,
            isFinalChunk: isFinalAudio,
            mimeType: mediaDescriptor.contentType,
            reasonCode: 'below_minimum_size'
          });
          if (audioBlob.size > 0) {
            console.warn(`[RecordingManager] Skipping small audio blob (${audioBlob.size} bytes) - likely header-only, no audio frames`);
          }
          return;
        }

        emitTelemetry('chunk.emitted', {
          chunkBytes: audioBlob.size,
          chunkOrder,
          container: mediaDescriptor.extension,
          isFinalChunk: isFinalAudio,
          mimeType: mediaDescriptor.contentType
        });

        audioEventChainRef.current = audioEventChainRef.current
          .then(async () => {
            if (isDiscardingRef.current || recordingSessionIdRef.current !== sessionId) {
              return;
            }

            const userId = await getUserId();
            if (isDiscardingRef.current || recordingSessionIdRef.current !== sessionId) {
              return;
            }
            if (!userId) {
              emitTelemetry('upload.failed', {
                attempt: 1,
                chunkBytes: audioBlob.size,
                chunkOrder,
                errorCode: 'user_identity_unavailable',
                isFinalChunk: isFinalAudio,
                provider: 'aws_auth',
                reasonCode: 'authentication_failed'
              });
              emitTerminalOutcome('recording.failed', {
                errorCode: 'user_identity_unavailable',
                outcome: 'failed',
                reasonCode: 'authentication_failed'
              });
              cancelRecording({ clearContent: false });
              showRecordingFailure(AUDIO_UPLOAD_FAILURE_MESSAGE);
              return;
            }

            const chunkType = isFinalAudio ? 'final' : 'chunk';
            const filePath = `protected/${userId}/${timestamp}_recording_${chunkType}_${pathstamp}_${lastUploadedChunkRef.current++}.${mediaDescriptor.extension}`;
            queueUpload(audioBlob, filePath, {
              chunkOrder,
              contentType: mediaDescriptor.contentType,
              recordingJobId: sessionId,
              sessionId,
              timestamp,
              userId
            });
          })
          .catch((error) => {
            console.error(`Unable to queue recorded audio data (${toSafeErrorCode(error, 'queue_failed')})`);
          });
      };

      recorder.onstop = () => {
        if (mediaRecorderRef.current !== recorder) {
          return;
        }

        if (isFinalizingRecordingRef.current) {
          isRecordingRef.current = false;
          isFinalizingRecordingRef.current = false;
          mediaRecorderRef.current = null;
          if (!isSafari && streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
          }
        } else if (
          isRecordingRef.current &&
          mediaRecorderRef.current &&
          mediaRecorderRef.current.state === 'inactive' &&
          !isPausedRef.current &&
          !isDiscardingRef.current
        ) {
          startRecorder();
        }
      };
    } catch (error) {
      console.error(`Error accessing microphone (${toSafeErrorCode(error, 'microphone_access_failed')})`);
      emitTelemetry('capture.failed', {
        errorCode: toSafeErrorCode(error, 'microphone_access_failed'),
        provider: 'media_recorder'
      });
    }
  };

  const startRecording = async () => {
    if (discardResetTimeoutRef.current) {
      clearTimeout(discardResetTimeoutRef.current);
      discardResetTimeoutRef.current = null;
    }
    isDiscardingRef.current = false;
    lastUploadedChunkRef.current = 0;
    emittedChunkOrderRef.current = 0;
    audioEventChainRef.current = Promise.resolve();
    isFinalizingRecordingRef.current = false;
    terminalOutcomeRef.current = null;
    resetNoteGenerationState();
    cleanupNoteGeneration();

    timeStampRef.current = Date.now();
    pathStampRef.current = Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    recordingJobIdRef.current = createRecordingJobId();
    recordingSessionIdRef.current = recordingJobIdRef.current;
    const startedSessionId = recordingSessionIdRef.current;
    captureStartedAtRef.current = Date.now();
    emitTelemetry('capture.requested', {
      provider: 'media_recorder',
      requestedTrackSettings: RECORDING_AUDIO_CONSTRAINTS
    });
    startUploadSession(recordingSessionIdRef.current);

    await setupRecorder();
    if (
      isDiscardingRef.current ||
      recordingSessionIdRef.current !== startedSessionId
    ) {
      if (mediaRecorderRef.current?.state !== 'inactive') {
        mediaRecorderRef.current?.stop();
      }
      mediaRecorderRef.current = null;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      stopSignalHealthMonitor();
      return;
    }
    if (mediaRecorderRef.current) {
      try {
        startRecorder();
        setIsRecording(true);
        isRecordingRef.current = true;
        setIsPaused(false);
        isPausedRef.current = false;
        emitTelemetry('capture.started', {
          provider: 'media_recorder'
        });

        if (noSleepRef.current) {
          noSleepRef.current.enable();
        }

        startChunkInterval();
      } catch (error) {
        const errorCode = toSafeErrorCode(error, 'media_recorder_start_failed');
        console.error(`Unable to start media recorder (${errorCode})`);
        emitTelemetry('capture.failed', {
          errorCode,
          provider: 'media_recorder'
        });
        cancelRecording({ clearContent: false });
        emitTerminalOutcome('recording.failed', {
          errorCode,
          outcome: 'failed'
        });
        showRecordingFailure(RECORDING_CAPTURE_FAILURE_MESSAGE);
      }
    } else {
      cancelRecording({ clearContent: false });
      emitTerminalOutcome('recording.failed', {
        errorCode: 'capture_start_failed',
        outcome: 'failed'
      });
      showRecordingFailure(RECORDING_CAPTURE_FAILURE_MESSAGE);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      isFinalizingRecordingRef.current = true;
      setIsRecording(false);
      setIsPaused(false);
      isPausedRef.current = false;
      mediaRecorderRef.current.stop();
      stopSignalHealthMonitor();
      emitTelemetry('capture.stopped', {
        durationMs: Math.max(0, Date.now() - (captureStartedAtRef.current || Date.now())),
        reasonCode: 'user_stopped'
      });
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
      setIsPreparingTranscript(true);
      setIsTranscriptCompleted(false);
    }
  };

  const cancelRecording = ({
    clearContent = true,
    discardReasonCode = 'user_discarded',
    emitDiscarded = false,
    resetDiscardFlag = true,
    updateState = true
  } = {}) => {
    isDiscardingRef.current = true;
    isRecordingRef.current = false;
    isPausedRef.current = false;
    isFinalizingRecordingRef.current = true;

    if (mediaRecorderRef.current) {
      if (mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      mediaRecorderRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }

    cancelUploadSession(recordingSessionIdRef.current);
    recordingSessionIdRef.current = null;
    stopSignalHealthMonitor();

    if (emitDiscarded) {
      emitTelemetry('capture.stopped', {
        durationMs: Math.max(0, Date.now() - (captureStartedAtRef.current || Date.now())),
        reasonCode: 'discarded'
      });
      emitTerminalOutcome('recording.discarded', {
        outcome: 'discarded',
        reasonCode: discardReasonCode
      });
    }

    if (updateState) {
      setIsRecording(false);
      setIsPaused(false);
      setIsPreparingTranscript(false);
      setIsGeneratingSummary(false);
      setIsTranscriptCompleted(false);
      if (clearContent) {
        setTextStream('');
      }
    }

    timeStampRef.current = null;
    pathStampRef.current = null;
    filePathRef.current = null;
    captureStartedAtRef.current = null;
    lastUploadedChunkRef.current = 0;
    resetNoteGenerationState();

    if (noSleepRef.current) {
      noSleepRef.current.disable();
    }

    cleanupNoteGeneration();

    if (discardResetTimeoutRef.current) {
      clearTimeout(discardResetTimeoutRef.current);
      discardResetTimeoutRef.current = null;
    }
    if (resetDiscardFlag) {
      discardResetTimeoutRef.current = setTimeout(() => {
        isDiscardingRef.current = false;
        discardResetTimeoutRef.current = null;
      }, 100);
    }
  };

  const discardRecording = (reasonCode = 'user_discarded') => {
    cancelRecording({
      discardReasonCode: reasonCode,
      emitDiscarded: true
    });
  };

  const cancelRecordingForFailure = () => {
    cancelRecording({ clearContent: false });
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecordingRef.current) {
      mediaRecorderRef.current.pause();
      signalHealthMonitorRef.current?.pause();
      emitTelemetry('capture.paused', {
        provider: 'media_recorder'
      });
      setIsPaused(true);
      isPausedRef.current = true;
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && isPausedRef.current) {
      mediaRecorderRef.current.resume();
      signalHealthMonitorRef.current?.resume();
      emitTelemetry('capture.resumed', {
        provider: 'media_recorder'
      });
      setIsPaused(false);
      isPausedRef.current = false;
      startChunkInterval();
    }
  };

  const cleanupRecorder = () => {
    cancelRecording({
      clearContent: false,
      discardReasonCode: 'component_unmounted',
      emitDiscarded: Boolean(recordingJobIdRef.current && !terminalOutcomeRef.current),
      resetDiscardFlag: false,
      updateState: false
    });
  };

  return {
    startRecording,
    stopRecording,
    discardRecording,
    pauseRecording,
    resumeRecording,
    cleanupRecorder,
    cancelRecordingForFailure,
    isRecordingRef,
    isPausedRef
  };
}

export default useMediaRecorderController;
