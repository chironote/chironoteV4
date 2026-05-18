import { useRef } from 'react';
import {
  AUDIO_CHUNK_INTERVAL_MS,
  MIN_AUDIO_BLOB_SIZE
} from './recordingConstants';
import { getUserId } from './recordingAuth';

function useMediaRecorderController({
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
}) {
  const mediaRecorderRef = useRef(null);
  const recordingIntervalRef = useRef(null);
  const lastUploadedChunkRef = useRef(0);
  const isRecordingRef = useRef(false);
  const isPausedRef = useRef(false);
  const isFinalizingRecordingRef = useRef(false);
  const streamRef = useRef(null);
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

      mediaRecorderRef.current = new MediaRecorder(stream, options);

      mediaRecorderRef.current.ondataavailable = async (event) => {
        if (isDiscardingRef.current) {
          return;
        }

        const isRecorderInactive = event.target?.state === 'inactive';
        if (event.data.size >= MIN_AUDIO_BLOB_SIZE && isFinalizingRecordingRef.current && isRecorderInactive) {
          const userId = await getUserId();
          const timestamp = timeStampRef.current;
          const pathstamp = pathStampRef.current;
          const finalPath = `protected/${userId}/${timestamp}_recording_final_${pathstamp}_${lastUploadedChunkRef.current++}.webm`;
          queueUpload(event.data, finalPath);
        } else if (event.data.size >= MIN_AUDIO_BLOB_SIZE) {
          const userId = await getUserId();
          const timestamp = timeStampRef.current;
          const pathstamp = pathStampRef.current;
          const chunkPath = `protected/${userId}/${timestamp}_recording_chunk_${pathstamp}_${lastUploadedChunkRef.current++}.webm`;
          queueUpload(event.data, chunkPath);
        } else if (event.data.size > 0) {
          console.warn(`[RecordingManager] Skipping small audio blob (${event.data.size} bytes) - likely header-only, no audio frames`);
        }
      };

      mediaRecorderRef.current.onstop = () => {
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
    lastUploadedChunkRef.current = 0;
    isFinalizingRecordingRef.current = false;
    resetNoteGenerationState();
    cleanupNoteGeneration();

    timeStampRef.current = Date.now();
    pathStampRef.current = Date.now() + '_' + Math.random().toString(36).substring(2, 9);

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

  const discardRecording = () => {
    isDiscardingRef.current = true;

    if (mediaRecorderRef.current) {
      isFinalizingRecordingRef.current = true;
      setIsRecording(false);
      setIsPaused(false);
      isPausedRef.current = false;
      mediaRecorderRef.current.stop();

      if (!isSafari && streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
    }

    clearUploadQueue();

    setIsPreparingTranscript(false);
    setIsGeneratingSummary(false);
    setIsTranscriptCompleted(false);
    setTextStream('');

    timeStampRef.current = null;
    pathStampRef.current = null;
    filePathRef.current = null;
    lastUploadedChunkRef.current = 0;
    resetNoteGenerationState();

    if (noSleepRef.current) {
      noSleepRef.current.disable();
    }

    cleanupNoteGeneration();

    setTimeout(() => {
      isDiscardingRef.current = false;
    }, 100);
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
    stopRecording();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  return {
    startRecording,
    stopRecording,
    discardRecording,
    pauseRecording,
    resumeRecording,
    cleanupRecorder,
    isRecordingRef,
    isPausedRef
  };
}

export default useMediaRecorderController;
