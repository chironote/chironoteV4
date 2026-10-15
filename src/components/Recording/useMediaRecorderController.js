import { captureSnapshot, recordingSettingsSnapshot } from '../../services/patientNotes';
import { useEffect, useRef, useState } from 'react';
import {
  AUDIO_CHUNK_INTERVAL_MS,
  MIN_AUDIO_BLOB_SIZE,
  RECORDING_PROTOCOL_VERSION
} from './recordingConstants';
import { getUserId } from './recordingAuth';
import { addNativeAppStateListener } from '../../services/nativePlatform';
import {
  classifyAudioChunk,
  getFinalizationAction,
  getPauseAction,
  getResumeAction,
  shouldRestartRecorder,
  shouldUseExternalChunkRotation
} from './recordingLifecycle';

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
  const [isStarting, setIsStarting] = useState(false);
  const generationRef = useRef(0);
  const startingRef = useRef(false);
  const mediaRecorderRef = useRef(null);
  const captureRef = useRef(null);
  const sessionRef = useRef(null);
  const lastTimestampRef = useRef(0);
  const recordingIntervalRef = useRef(null);
  const isRecordingRef = useRef(false);
  const isPausedRef = useRef(false);
  const isFinalizingRecordingRef = useRef(false);
  const isPauseBoundaryRef = useRef(false);
  const streamRef = useRef(null);
  const isAndroid = useRef(/android/i.test(navigator.userAgent)).current;
  const isSafari = useRef(/^((?!chrome|android).)*safari/i.test(navigator.userAgent)).current;

  useEffect(() => () => {
    generationRef.current++; startingRef.current = false; isDiscardingRef.current = true;
    if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') recorder.stop();
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const startChunkInterval = () => {
    if (!shouldUseExternalChunkRotation(isAndroid)) {
      return;
    }

    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
    }
    recordingIntervalRef.current = setInterval(() => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    }, AUDIO_CHUNK_INTERVAL_MS);
  };

  useEffect(() => {
    if (!shouldUseExternalChunkRotation(isAndroid)) {
      return undefined;
    }

    let listenerHandle = null;
    let disposed = false;

    addNativeAppStateListener(({ isActive }) => {
      if (!isActive && isRecordingRef.current && !isPausedRef.current) {
        if (recordingIntervalRef.current) {
          clearInterval(recordingIntervalRef.current);
          recordingIntervalRef.current = null;
        }
        return;
      }

      if (
        isActive &&
        isRecordingRef.current &&
        !isPausedRef.current &&
        !recordingIntervalRef.current
      ) {
        if (mediaRecorderRef.current?.state === 'recording') {
          mediaRecorderRef.current.stop();
        }

        recordingIntervalRef.current = setInterval(() => {
          if (mediaRecorderRef.current?.state === 'recording') {
            mediaRecorderRef.current.stop();
          }
        }, AUDIO_CHUNK_INTERVAL_MS);
      }
    }).then((handle) => {
      if (disposed) {
        handle?.remove();
      } else {
        listenerHandle = handle;
      }
    }).catch((error) => {
      console.warn('Unable to register recording app-state listener:', error);
    });

    return () => {
      disposed = true;
      listenerHandle?.remove();
    };
  }, [isAndroid]);

  const startRecorder = () => {
    mediaRecorderRef.current.start();
  };

  const setupRecorder = async (generation) => {
    const session = sessionRef.current;
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
        if (generation !== generationRef.current || isDiscardingRef.current) {
          stream.getTracks().forEach(track => track.stop()); return;
        }
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

      const handleDataAvailable = async (audioBlob, eventState) => {
        if (session.discarded || eventState.isDiscarding) return;
        const chunkType = classifyAudioChunk({
          blobSize: audioBlob.size,
          minimumBlobSize: MIN_AUDIO_BLOB_SIZE,
          isDiscarding: eventState.isDiscarding,
          isFinalizing: eventState.isFinalizing,
          isRecorderInactive: eventState.isRecorderInactive,
          hasQueuedFinalChunk: session.hasFinal
        });

        if (chunkType === 'final') {
          session.hasFinal = true;
          const userId = eventState.capture.userId;
          const timestamp = eventState.timestamp;
          const pathstamp = eventState.pathstamp;
          const finalPath = `protected/${userId}/${timestamp}_recording_final_${pathstamp}_${session.nextChunk++}.webm`;
          queueUpload(audioBlob, finalPath, { ...eventState.capture, timestamp, userId });
        } else if (chunkType === 'regular') {
          const userId = eventState.capture.userId;
          const timestamp = eventState.timestamp;
          const pathstamp = eventState.pathstamp;
          const chunkPath = `protected/${userId}/${timestamp}_recording_chunk_${pathstamp}_${session.nextChunk++}.webm`;
          queueUpload(audioBlob, chunkPath, { ...eventState.capture, timestamp, userId });
        } else if (audioBlob.size > 0 && !eventState.isDiscarding) {
          console.warn(`[RecordingManager] Skipping small audio blob (${audioBlob.size} bytes) - likely header-only, no audio frames`);
        }
      };

      mediaRecorderRef.current.ondataavailable = (event) => {
        // Snapshot lifecycle state synchronously. A queued earlier chunk may still
        // be resolving auth when MediaRecorder dispatches the final stop event.
        const eventState = {
          capture: session.capture,
          timestamp: session.timestamp,
          pathstamp: session.pathstamp,
          isDiscarding: session.discarded,
          isFinalizing: session.finalizing,
          isRecorderInactive: event.target?.state === 'inactive'
        };

        session.events = session.events
          .then(() => handleDataAvailable(event.data, eventState))
          .catch((error) => {
            console.error('Error queuing recorded audio chunk:', error);
          });
      };

      mediaRecorderRef.current.onstop = () => {
        if (generation !== generationRef.current) return;
        if (isFinalizingRecordingRef.current) {
          isRecordingRef.current = false;
          isFinalizingRecordingRef.current = false;
          mediaRecorderRef.current = null;
          if (!isSafari && streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
          }
        } else if (isPauseBoundaryRef.current) {
          isPauseBoundaryRef.current = false;
        } else if (shouldRestartRecorder({
          isFinalizing: isFinalizingRecordingRef.current,
          isRecording: isRecordingRef.current,
          isPaused: isPausedRef.current,
          capture: captureRef.current,
          timestamp: timeStampRef.current,
          pathstamp: pathStampRef.current,
          isDiscarding: isDiscardingRef.current,
          recorderState: mediaRecorderRef.current?.state
        })) {
          startRecorder();
        }
      };
    } catch (error) {
      throw error;
    }
  };

  const startRecording = async (metadata) => {
    if (startingRef.current || isRecordingRef.current) return;
    startingRef.current = true; setIsStarting(true);
    const generation = ++generationRef.current;
    captureRef.current = Object.freeze({ visitMetadata: captureSnapshot(metadata), noteSettings: recordingSettingsSnapshot() });
    isFinalizingRecordingRef.current = false;
    isPauseBoundaryRef.current = false;
    isDiscardingRef.current = false;
    resetNoteGenerationState();

    // Timestamp is also the backend Notes key and local ownership key. Allocate
    // it once, uniquely even if starts share a clock tick or the clock moves back.
    timeStampRef.current = Math.max(Date.now(), lastTimestampRef.current + 1);
    lastTimestampRef.current = timeStampRef.current;
    pathStampRef.current = [
      timeStampRef.current,
      Math.random().toString(36).substring(2, 9),
      RECORDING_PROTOCOL_VERSION
    ].join('_');
    sessionRef.current = {
      timestamp: timeStampRef.current, pathstamp: pathStampRef.current,
      capture: captureRef.current, discarded: false, finalizing: false,
      hasFinal: false, nextChunk: 0, events: Promise.resolve()
    };

    try {
    const setup = setupRecorder(generation); // calls getUserMedia before network work
    const identity = getUserId();
    const [, userId] = await Promise.all([setup, identity]);
    if (generation !== generationRef.current || isDiscardingRef.current) return;
    if (!userId) throw new Error('Sign in again before recording.');
    captureRef.current = Object.freeze({ ...captureRef.current, userId });
    sessionRef.current.capture = captureRef.current;
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
    } catch (error) {
      if (generation === generationRef.current) { discardRecording(); console.warn('Microphone startup failed.'); }
    } finally {
      if (generation === generationRef.current) { startingRef.current = false; setIsStarting(false); }
    }
  };

  const finalizeRecorder = ({ discard = false, prepareTranscript = true } = {}) => {
    const recorder = mediaRecorderRef.current;
    const finalizationAction = getFinalizationAction({
      isAndroid,
      isPaused: isPausedRef.current,
      recorderState: recorder?.state
    });

    if (recorder && finalizationAction !== 'none') {
      isFinalizingRecordingRef.current = true;
      sessionRef.current.finalizing = true;
      setIsRecording(false);
      setIsPaused(false);
      isPausedRef.current = false;

      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }

      if (finalizationAction === 'resume-and-stop') {
        recorder.resume();
      } else if (finalizationAction === 'start-and-stop') {
        startRecorder();
      }
      recorder.stop();
      // stop() makes the recorder inactive synchronously; its data/onstop events
      // may arrive later. Session-owned handlers keep that audio with A while
      // permitting B to start, and the generation fence protects B's recorder.
      isRecordingRef.current = false;

      if (prepareTranscript && !discard) {
        setIsPreparingTranscript(true);
        setIsTranscriptCompleted(false);
      }
    }
  };

  const stopRecording = () => finalizeRecorder();

  const discardRecording = () => {
    const timestamp = sessionRef.current?.timestamp;
    if (sessionRef.current) sessionRef.current.discarded = true;
    generationRef.current++; startingRef.current = false; setIsStarting(false);
    isDiscardingRef.current = true;

    finalizeRecorder({ discard: true, prepareTranscript: false });

    if (!isSafari && streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (timestamp !== undefined) clearUploadQueue(timestamp);
    isRecordingRef.current = false;
    isPausedRef.current = false;
    mediaRecorderRef.current = null;

    setIsPreparingTranscript(false);
    setIsGeneratingSummary(false);
    setIsTranscriptCompleted(false);
    setTextStream('');

    timeStampRef.current = null;
    pathStampRef.current = null;
    filePathRef.current = null;
    resetNoteGenerationState();

    if (noSleepRef.current) {
      noSleepRef.current.disable();
    }

    if (timestamp !== undefined) cleanupNoteGeneration(timestamp);


  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecordingRef.current) {
      const pauseAction = getPauseAction({
        isAndroid,
        recorderState: mediaRecorderRef.current.state
      });
      if (pauseAction === 'none') {
        return;
      }

      setIsPaused(true);
      isPausedRef.current = true;
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }

      if (pauseAction === 'stop') {
        isPauseBoundaryRef.current = true;
        mediaRecorderRef.current.stop();
      } else {
        mediaRecorderRef.current.pause();
      }
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && isPausedRef.current) {
      const resumeAction = getResumeAction({
        isAndroid,
        recorderState: mediaRecorderRef.current.state
      });
      if (resumeAction === 'none') {
        return;
      }

      if (resumeAction === 'start') {
        isPauseBoundaryRef.current = false;
        startRecorder();
      } else {
        mediaRecorderRef.current.resume();
      }
      setIsPaused(false);
      isPausedRef.current = false;
      startChunkInterval();
    }
  };

  const cleanupRecorder = () => {
    if (sessionRef.current) sessionRef.current.discarded = true;
    generationRef.current++; startingRef.current = false;
    isDiscardingRef.current = true;
    finalizeRecorder({ discard: true, prepareTranscript: false });
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  return {
    isStarting,
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
