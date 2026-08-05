import { useRef } from 'react';
import {
  AUDIO_CHUNK_INTERVAL_MS,
  MIN_AUDIO_BLOB_SIZE
} from './recordingConstants';
import { getUserId } from './recordingAuth';
import { getRecordingMediaDescriptor } from './recordingMedia';

function useMediaRecorderController({
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
  const isAndroid = useRef(/android/i.test(navigator.userAgent)).current;
  const isSafari = useRef(/^((?!chrome|android).)*safari/i.test(navigator.userAgent)).current;

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
          audio: {
            channelCount: 1,
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false
          }
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
      const recorderSessionId = recordingSessionIdRef.current;
      const recorderTimestamp = timeStampRef.current;
      const recorderPathstamp = pathStampRef.current;
      mediaRecorderRef.current = recorder;

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

        if (!sessionId || !timestamp || !pathstamp) {
          return;
        }

        if (audioBlob.size < MIN_AUDIO_BLOB_SIZE) {
          if (audioBlob.size > 0) {
            console.warn(`[RecordingManager] Skipping small audio blob (${audioBlob.size} bytes) - likely header-only, no audio frames`);
          }
          return;
        }

        audioEventChainRef.current = audioEventChainRef.current
          .then(async () => {
            if (isDiscardingRef.current || recordingSessionIdRef.current !== sessionId) {
              return;
            }

            const userId = await getUserId();
            if (!userId || isDiscardingRef.current || recordingSessionIdRef.current !== sessionId) {
              return;
            }

            const chunkType = isFinalAudio ? 'final' : 'chunk';
            const filePath = `protected/${userId}/${timestamp}_recording_${chunkType}_${pathstamp}_${lastUploadedChunkRef.current++}.${mediaDescriptor.extension}`;
            queueUpload(audioBlob, filePath, {
              contentType: mediaDescriptor.contentType,
              sessionId,
              timestamp,
              userId
            });
          })
          .catch((error) => {
            console.error('Unable to queue recorded audio data:', error);
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
      console.error('Error accessing microphone', error);
    }
  };

  const startRecording = async () => {
    if (discardResetTimeoutRef.current) {
      clearTimeout(discardResetTimeoutRef.current);
      discardResetTimeoutRef.current = null;
    }
    isDiscardingRef.current = false;
    lastUploadedChunkRef.current = 0;
    audioEventChainRef.current = Promise.resolve();
    isFinalizingRecordingRef.current = false;
    resetNoteGenerationState();
    cleanupNoteGeneration();

    timeStampRef.current = Date.now();
    pathStampRef.current = Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    recordingSessionIdRef.current = `${timeStampRef.current}_${pathStampRef.current}`;
    startUploadSession(recordingSessionIdRef.current);

    await setupRecorder();
    if (mediaRecorderRef.current) {
      setIsRecording(true);
      isRecordingRef.current = true;
      setIsPaused(false);
      isPausedRef.current = false;

      startRecorder();

      if (noSleepRef.current) {
        noSleepRef.current.enable();
      }

      startChunkInterval();
    } else {
      cancelUploadSession(recordingSessionIdRef.current);
      recordingSessionIdRef.current = null;
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      isFinalizingRecordingRef.current = true;
      setIsRecording(false);
      setIsPaused(false);
      isPausedRef.current = false;
      mediaRecorderRef.current.stop();
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

  const discardRecording = () => {
    cancelRecording();
  };

  const cancelRecordingForFailure = () => {
    cancelRecording({ clearContent: false });
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecordingRef.current) {
      mediaRecorderRef.current.pause();
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
      setIsPaused(false);
      isPausedRef.current = false;
      startChunkInterval();
    }
  };

  const cleanupRecorder = () => {
    cancelRecording({
      clearContent: false,
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
