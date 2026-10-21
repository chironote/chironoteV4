import { captureSnapshot, recordingSettingsSnapshot } from '../../services/patientNotes';
import useNoteGeneration from './useNoteGeneration';
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';
import { uploadData } from 'aws-amplify/storage';
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs"; 
import NoSleep from 'nosleep.js';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';

// Keep abandoned SDK auth reads independent of queue/Blob closures. Amplify
// doesn't expose abort here; callers fence the result with their own deadline.
async function readRecordingAuth(userId, forceRefresh) {
  const mismatch = () => Object.assign(new Error('Recording authorization requires attention'), { blocked: true });
  if ((await getCurrentUser()).userId !== userId) throw mismatch();
  const session = await fetchAuthSession(forceRefresh ? { forceRefresh: true } : undefined);
  if ((await getCurrentUser()).userId !== userId) throw mismatch();
  if (!session.credentials || !session.tokens?.accessToken) throw new Error('Authentication temporarily unavailable');
  return session;
}

function RecordingManager({ onTextStreamUpdate, onTransitionToMainApp, onGenerationStateChange, onGenerationError, onSavedNoteReady }) {
  const [isStarting, setIsStarting] = useState(false);
  const startingRef = useRef(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isFinishingRecording, setIsFinishingRecording] = useState(false);
  const [isPreparingTranscript, setIsPreparingTranscript] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [isTranscriptCompleted, setIsTranscriptCompleted] = useState(false);
  const mediaRecorderRef = useRef(null);
  const recordingIntervalRef = useRef(null);
  const timeStampRef = useRef(null); // Conversation identifier timestamp
  const pathStampRef = useRef(null); // For uniquely identifying file paths
  const filePathRef = useRef(null); // Add a ref to store the file path
  const lastUploadedChunkRef = useRef(0); // Track chunk number for unique paths
  const [generationError, setGenerationError] = useState('');
  const [textStream, setTextStream] = useState('');
  const noSleepRef = useRef(null);
  const noSleepOwnerRef = useRef(null);
  const uploadQueueRef = useRef([]); // Queue for audio uploads
  const isProcessingUploadsRef = useRef(false); // Flag to track if we're currently processing uploads
  const cancelledUploadsRef = useRef(new Set());
  const retryTimerRef = useRef(null);
  const activeAttemptRef = useRef(null);
  const uploadWorkerRef = useRef(null);
  const visibleGenerationRef = useRef(null);
  const [uploadStatus, setUploadStatus] = useState({ pending: 0, blocked: 0 });
  const isRecordingRef = useRef(false);
  const isPausedRef = useRef(false);
  const isDiscardingRef = useRef(false); // Flag to prevent processing when discarding
  const isAppInBackgroundRef = useRef(false); // Track if app is in background
  const isFinalizingRef = useRef(false);
  const isRotatingRef = useRef(false);
  const iosStopRef = useRef(null); // Immutable-at-event-time stop transaction for WebKit.
  const recordingIdentityRef = useRef(null);
  const recordingGenerationRef = useRef(0);
  const finalChunkQueuedRef = useRef(false);
  const isUnmountedRef = useRef(false);
  // Android fix: Detect Android devices for timeslice parameter
  // Recent Android WebView updates cause MediaRecorder to produce audio blobs with duration=0 without timeslice
  // Using 240-second (4-minute) timeslice to match chunk cycle and enable proper transcription
  const isAndroid = useRef(/android/i.test(navigator.userAgent)).current;
  const isIOS = useRef(/iphone|ipad/i.test(navigator.userAgent)).current;

  const { subscribeToNoteCompletion, cleanupNoteGeneration } = useNoteGeneration({
    isCurrentCapture: capture => visibleGenerationRef.current === capture.generation,
    noSleepRef, setTextStream, setIsPreparingTranscript,
    releaseNoSleep: capture => {
      if (noSleepOwnerRef.current === capture.generation) {
        noSleepOwnerRef.current = null;
        noSleepRef.current?.disable();
      }
    },
    setIsGeneratingSummary, setIsTranscriptCompleted, onTextStreamUpdate, onTransitionToMainApp,
    onGenerationStateChange, onSavedNoteReady,
    onBackgroundGenerationError: error => onGenerationError?.(error),
    onGenerationError: error => { setGenerationError(error); onGenerationError?.(error); },
  });

  const clearRecordingInterval = () => {
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
  };

  const startMediaRecorder = (recorder) => {
    if (!recorder || recorder.state !== "inactive") {
      return false;
    }

    // Flush WebKit's MP4 writer regularly, then assemble all emitted pieces
    // into one complete container when this recorder cycle stops.
    if (isIOS) {
      recorder.start(1000);
    } else if (isAndroid) {
      recorder.start(240000);
    } else {
      recorder.start();
    }
    return true;
  };

  const stopTracksAndReleaseRecorder = (recorder) => {
    recorder.stream.getTracks().forEach(track => track.stop());
    if (mediaRecorderRef.current === recorder) {
      mediaRecorderRef.current = null;
    }
  };

  const isCancelled = (generation) => (
    isDiscardingRef.current || isUnmountedRef.current ||
    recordingGenerationRef.current !== generation
  );

  const requestIOSStop = (intent) => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || isCancelled(recordingGenerationRef.current)) {
      return;
    }

    const pendingStop = iosStopRef.current;
    if (pendingStop && pendingStop.recorder === recorder) {
      // Keep the Blob until onstop, so Stop can still promote this transaction
      // after dataavailable without changing an already dispatched identity.
      if (intent === 'final') {
        pendingStop.intent = 'final';
        isFinalizingRef.current = true;
        isRotatingRef.current = false;
      }
      return;
    }

    if (recorder.state !== 'recording' && recorder.state !== 'paused') {
      return;
    }

    const stop = {
      recorder,
      generation: recordingGenerationRef.current,
      intent,
    };
    iosStopRef.current = stop;
    isRotatingRef.current = intent === 'rotation';
    isFinalizingRef.current = intent === 'final';

    if (recorder.state === 'paused') {
      recorder.resume();
      // WebKit may dispatch resume later, but state is normally updated now.
      if (recorder.state !== 'recording') {
        return;
      }
    }
    recorder.stop();
  };

  const rotateIOSRecordingChunk = () => {
    const recorder = mediaRecorderRef.current;

    if (!isIOS || isFinalizingRef.current || !isRecordingRef.current ||
        isPausedRef.current || !recorder || recorder.state !== "recording") {
      return;
    }

    // Safari/WKWebView delivers dataavailable asynchronously after stop().
    // Do not call start() until its stop event has fired; otherwise the next
    // four-minute segment can race the previous segment's final media bytes.
    requestIOSStop('rotation');
  };

  const scheduleRecordingInterval = () => {
    clearRecordingInterval();
    recordingIntervalRef.current = setInterval(() => {
      if (isIOS) {
        rotateIOSRecordingChunk();
        return;
      }

      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
        // Preserve the existing Android/non-iOS rotation behavior.
        if (isAndroid) {
          mediaRecorderRef.current.start(240000);
        } else {
          mediaRecorderRef.current.start();
        }
      }
    }, 240000);
  };

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    noSleepRef.current = new NoSleep();
    return () => {
      if (noSleepRef.current) {
        noSleepRef.current.disable();
      }
    };
  }, []);

  // Background detection: Stop chunking when app is backgrounded to prevent audio loss
  useEffect(() => {
    let appStateListener;

    if (Capacitor.isNativePlatform && Capacitor.isNativePlatform()) {
      console.log('[RecordingManager] Setting up background detection for native platform');
      
      appStateListener = CapacitorApp.addListener('appStateChange', ({ isActive }) => {
        console.log(`[RecordingManager] App state changed: ${isActive ? 'FOREGROUND' : 'BACKGROUND'}`);
        
        isAppInBackgroundRef.current = !isActive;
        
        if (!isActive && isRecordingRef.current && !isPausedRef.current) {
          // App went to background during active recording
          console.log('[RecordingManager] ⚠️ App backgrounded during recording - STOPPING chunking interval');
          console.log('[RecordingManager] Recording will continue without interruption until user returns');
          
          // Stop the chunking interval to prevent stop/start cycles
          if (recordingIntervalRef.current) {
            clearInterval(recordingIntervalRef.current);
            recordingIntervalRef.current = null;
            console.log('[RecordingManager] ✓ Chunking interval cleared - continuous recording active');
          }
        } 
        else if (isActive && isRecordingRef.current && !isPausedRef.current && !recordingIntervalRef.current) {
          // App returned to foreground during active recording
          console.log('[RecordingManager] ✓ App foregrounded during recording - RESUMING chunking interval');
          
          // First, trigger a chunk save for the background recording period
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
            console.log('[RecordingManager] Saving background recording chunk...');
            if (isIOS) {
              rotateIOSRecordingChunk();
            } else {
              mediaRecorderRef.current.stop();
              if (isAndroid) {
                mediaRecorderRef.current.start(240000);
              } else {
                mediaRecorderRef.current.start();
              }
            }
          }

          // Restart the chunking interval
          scheduleRecordingInterval();
          
          console.log('[RecordingManager] ✓ Chunking interval restarted');
        }
      });
    }

    return () => {
      if (appStateListener) {
        appStateListener.remove();
        console.log('[RecordingManager] Background detection listener removed');
      }
    };
  }, []);

  // Queue ownership outlives microphone ownership. Only explicit discard or
  // unmount cancels retained work; starting the next recording never does.
  const uploadCancelled = item => isUnmountedRef.current || cancelledUploadsRef.current.has(item.generation);
  const updateUploadStatus = () => {
    if (!isUnmountedRef.current) setUploadStatus({
      pending: uploadQueueRef.current.length,
      blocked: uploadQueueRef.current.filter(item => item.blocked).length,
    });
  };
  const persistentFailure = error => {
    const name = `${error?.name || ''} ${error?.code || ''}`;
    // SQS can report throttling and expired credentials as HTTP 400. Refresh
    // and back off rather than misclassifying these as invalid input.
    if (/Throttl|TooManyRequests|RequestLimitExceeded|SlowDown|RequestTimeout|TimeoutError|ExpiredToken|TokenExpired|RequestExpired/i.test(name)) return false;
    return error?.blocked ||
      /AccessDenied|NotAuthorized|Unauthorized|Forbidden|Validation|InvalidParameter|NoSuchBucket|InvalidAccessKey|SignatureDoesNotMatch|UserUnAuthenticated|InvalidGrant|UserNotFound/i.test(name) ||
      [400, 401, 403, 404].includes(error?.$metadata?.httpStatusCode);
  };

  const uploadS3 = async item => {
    if (item.stage === 'acknowledged' || uploadCancelled(item)) return;
    const { audioBlob, filePath, identity } = item;
    const { timestamp, userId } = identity;
    const checkOwner = async () => {
      let timer;
      try {
        // Amplify auth has no abort handle. Race only the read: a late result
        // is observed by Promise.race but cannot upload, dispatch or mutate an
        // item after this attempt timed out. Token refresh stays SDK-owned.
        return await Promise.race([
          readRecordingAuth(userId, item.failures > 0),
          new Promise((resolve, reject) => {
            timer = setTimeout(() => reject(new Error('Recording authentication timed out')), 60000);
          }),
        ]);
      } finally { clearTimeout(timer); }
    };
    if (item.stage === 'upload-pending') {
      await checkOwner();
      if (uploadCancelled(item)) return;
      let timer;
      let transferred = 0;
      let stalled = false;
      let settled = false;
      let task;
      const armWatchdog = () => {
        clearTimeout(timer);
        timer = setTimeout(() => { stalled = true; task.cancel(); }, 120000);
      };
      task = uploadData({
        path: filePath, data: audioBlob,
        options: {
          // Preserve the existing MP4 Blob / WebM-labelled backend contract.
          contentType: 'audio/webm',
          metadata: { timestamp: timestamp.toString(), userId },
          onProgress: progress => {
            if (!settled && !stalled && !uploadCancelled(item)) {
              if (progress.transferredBytes > transferred) armWatchdog();
              // SDK part retries can lower the aggregate. Measure advancement
              // from the last event, so real retry progress isn't a stall.
              transferred = progress.transferredBytes;
            }
          },
        },
      });
      activeAttemptRef.current = { item, cancel: () => task.cancel() };
      armWatchdog();
      try {
        // Await settlement after cancel. A late result cannot overlap a new
        // attempt or dispatch a recording that was explicitly discarded.
        await task.result;
        // A cancel can race a fulfilled SDK result. Fulfilment confirms S3;
        // don't recreate the object if a later SQS response is ambiguous.
        if (uploadCancelled(item)) return;
        item.stage = 'dispatch-pending';
      } finally { settled = true; clearTimeout(timer); }
    }
    if (uploadCancelled(item)) return;
    // Get dispatch credentials/token after the potentially long S3 upload.
    const session = await checkOwner();
    if (uploadCancelled(item)) return;
    const sqsClient = new SQSClient({ region: 'us-east-2', credentials: session.credentials });
    const lastPart = filePath.split('/').pop();
    const command = new SendMessageCommand({
      QueueUrl: 'https://sqs.us-east-2.amazonaws.com/026090532772/AudioTranscriptionQueue.fifo',
      MessageBody: JSON.stringify({
        userId, timestamp, path: filePath, language: 'auto',
        isFinalAudio: filePath.includes('_final_'),
        accessToken: session.tokens.accessToken.toString(),
        noteSettings: identity.noteSettings,
        ...(identity.visitMetadata ? { visitMetadata: identity.visitMetadata } : {}),
      }),
      MessageGroupId: userId,
      MessageDeduplicationId: `${userId.substring(0, 8)}-${timestamp}-${lastPart}`.replace(/[^a-zA-Z0-9\-_]/g, ''),
    });
    const controller = new AbortController();
    activeAttemptRef.current = { item, cancel: () => controller.abort() };
    const timer = setTimeout(() => controller.abort(), 60000);
    try {
      await sqsClient.send(command, { abortSignal: controller.signal });
      if (uploadCancelled(item)) return;
      item.stage = 'acknowledged';
      if (filePath.includes('_final_')) subscribeToNoteCompletion(userId, timestamp, identity);
    } finally {
      clearTimeout(timer);
      sqsClient.destroy?.();
    }
  };

  const processUploadQueue = async () => {
    if (isProcessingUploadsRef.current || isUnmountedRef.current) return;
    clearTimeout(retryTimerRef.current);
    isProcessingUploadsRef.current = true;
    try {
      while (!isUnmountedRef.current) {
        // Only the first known item of each recording is eligible. A failed
        // regular chunk holds its own final, without newer chunks starving A.
        const heads = uploadQueueRef.current.filter((item, index, queue) =>
          !queue.slice(0, index).some(earlier => earlier.generation === item.generation));
        const item = heads.find(entry => !entry.blocked && entry.retryAt <= Date.now());
        if (!item) break;
        try {
          await uploadS3(item);
          if (item.stage === 'acknowledged' || uploadCancelled(item)) {
            uploadQueueRef.current = uploadQueueRef.current.filter(entry => entry !== item);
          }
        } catch (error) {
          if (!uploadCancelled(item)) {
            item.failures++;
            item.blocked = Boolean(persistentFailure(error));
            // Full jitter with a small floor prevents a zero-delay spin.
            item.retryAt = Date.now() + Math.max(250, Math.random() * Math.min(60000, 1000 * 2 ** Math.min(item.failures - 1, 6)));
          }
        } finally { activeAttemptRef.current = null; updateUploadStatus(); }
      }
    } finally {
      isProcessingUploadsRef.current = false;
      const heads = uploadQueueRef.current.filter((item, index, queue) => !item.blocked &&
        !queue.slice(0, index).some(earlier => earlier.generation === item.generation));
      if (heads.length && !isUnmountedRef.current) {
        retryTimerRef.current = setTimeout(processUploadQueue, Math.max(0, Math.min(...heads.map(item => item.retryAt)) - Date.now()));
      }
    }
  };

  const queueUpload = (audioBlob, filePath, identity, generation) => {
    if (isCancelled(generation)) return;
    uploadQueueRef.current.push({ audioBlob, filePath, identity, generation,
      stage: 'upload-pending', failures: 0, retryAt: 0, blocked: false });
    updateUploadStatus(); processUploadQueue();
  };
  const retryUploads = () => {
    uploadQueueRef.current.forEach(item => { item.blocked = false; item.retryAt = 0; });
    updateUploadStatus(); processUploadQueue();
  };
  uploadWorkerRef.current = processUploadQueue;
  useEffect(() => {
    // Connectivity is a hint. Timers also recover switches without an online
    // event. Repeated events cannot start a second worker.
    const online = () => uploadWorkerRef.current();
    window.addEventListener('online', online);
    return () => { window.removeEventListener('online', online); clearTimeout(retryTimerRef.current); };
  }, []);
  const prepareNextRecording = () => {
    visibleGenerationRef.current = null;
    setIsPreparingTranscript(false); setIsGeneratingSummary(false);
    onGenerationStateChange?.(false);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      const recorder = mediaRecorderRef.current;

      if (isIOS) {
        if (isFinalizingRef.current) {
          return;
        }

        clearRecordingInterval();
        setIsRecording(false);
        isRecordingRef.current = false;
        setIsPaused(false);
        isPausedRef.current = false;
        setIsFinishingRecording(true);
        setIsPreparingTranscript(true);
        setIsTranscriptCompleted(false);
        requestIOSStop('final');
        return;
      }

      setIsRecording(false);
      isRecordingRef.current = false;
      setIsPaused(false);
      isPausedRef.current = false;
      isFinalizingRef.current = true;
      setIsFinishingRecording(true);
      recorder.stop();
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      recorder.stream.getTracks().forEach(track => track.stop());
      mediaRecorderRef.current = null;
      setIsPreparingTranscript(true);
      setIsTranscriptCompleted(false);
    }
  };

  const discardRecording = (expectedSession = recordingGenerationRef.current, { creditCheckFailed = false } = {}) => {
    if (expectedSession !== recordingGenerationRef.current) {
      if (cancelledUploadsRef.current.has(expectedSession)) return;
      cancelledUploadsRef.current.add(expectedSession);
      if (activeAttemptRef.current?.item.generation === expectedSession) activeAttemptRef.current.cancel();
      uploadQueueRef.current = uploadQueueRef.current.filter(item => item.generation !== expectedSession);
      updateUploadStatus();
      cleanupNoteGeneration(expectedSession);
      if (noSleepOwnerRef.current === expectedSession) {
        noSleepOwnerRef.current = null;
        noSleepRef.current?.disable();
      }
      if (creditCheckFailed) {
        const message = 'An earlier recording failed its credit check. Its remaining work was cancelled; your current recording is unaffected.';
        setGenerationError(message); onGenerationError?.(message);
      }
      return;
    }
    startingRef.current = false; if (!isUnmountedRef.current) setIsStarting(false);
    // Set flag to prevent any data processing
    isDiscardingRef.current = true;
    const discardedGeneration = recordingGenerationRef.current;
    cancelledUploadsRef.current.add(discardedGeneration);
    recordingGenerationRef.current += 1;
    const attempt = activeAttemptRef.current;
    if (attempt?.item.generation === discardedGeneration) attempt.cancel();
    clearRecordingInterval();
    
    // Immediately stop recording and clean up without processing
    if (mediaRecorderRef.current) {
      setIsRecording(false);
      isRecordingRef.current = false;
      setIsPaused(false);
      isPausedRef.current = false;
      
      const recorder = mediaRecorderRef.current;
      // ondataavailable/onstop observe the cancelled generation and cannot
      // upload or restart. Tracks can be released immediately on discard.
      if (recorder.state !== 'inactive') {
        recorder.stop();
      }
      
      // Stop all media tracks
      stopTracksAndReleaseRecorder(recorder);
    }
    
    uploadQueueRef.current = uploadQueueRef.current.filter(item => item.generation !== discardedGeneration);
    updateUploadStatus();
    isFinalizingRef.current = false;
    setIsFinishingRecording(false);
    isRotatingRef.current = false;
    iosStopRef.current = null;
    
    // Reset all states immediately
    setIsPreparingTranscript(false);
    setIsGeneratingSummary(false);
    setIsTranscriptCompleted(false);
    setTextStream('');
    
    // Clear all refs
    timeStampRef.current = null;
    pathStampRef.current = null;
    filePathRef.current = null;
    lastUploadedChunkRef.current = 0;
    
    // Disable NoSleep
    if (noSleepRef.current && noSleepOwnerRef.current === discardedGeneration) {
      noSleepOwnerRef.current = null;
      noSleepRef.current.disable();
    }
    
    // Cancel any active subscriptions
    cleanupNoteGeneration(discardedGeneration);
    
  };

  const requestMicrophonePermission = () => {
    // Check if user has already seen the permission rationale
    const hasSeenPermissionRationale = localStorage.getItem('chironote_mic_permission_rationale_shown');
    
    if (!hasSeenPermissionRationale) {
      // Show permission rationale dialog only on first time
      const userConsent = window.confirm(
        "ChiroNote needs microphone access to record and transcribe your clinical notes. Your audio is processed securely and not stored permanently. Do you want to continue?"
      );
      
      if (!userConsent) {
        console.log('[RecordingManager] User denied microphone permission rationale');
        return false;
      }
      
      // Mark that user has seen the rationale
      localStorage.setItem('chironote_mic_permission_rationale_shown', 'true');
    }
    
    return true;
  };

  const setupRecorder = async (microphonePromise, generation) => {
    try {
      setTextStream('');
      
      const stream = await microphonePromise;
      if (isCancelled(generation)) { stream.getTracks().forEach(track => track.stop()); return; }
      console.log('[RecordingManager] Microphone access granted successfully');
  
      const uaString = navigator.userAgent.toLowerCase();
      let options = {};
      
      // iOS devices need mp4
      if (/iphone|ipad/i.test(uaString)) {
        options = { mimeType: "video/mp4" };
      } 
      // Firefox doesn't support PCM codec
      else if (/firefox/i.test(uaString)) {
        options = { mimeType: "audio/webm" };
      }
      // Default for Chrome and others
      else if (MediaRecorder.isTypeSupported("audio/webm; codecs=\"pcm\"")) {
        options = { mimeType: "audio/webm; codecs=\"pcm\"" };
      }

      mediaRecorderRef.current = new MediaRecorder(stream, options);
      const recorder = mediaRecorderRef.current;
      const recorderIdentity = recordingIdentityRef.current;
      const recorderGeneration = recordingGenerationRef.current;
      let iosAudioParts = [];
      const queueRecorderBlob = (blob, isFinal) => {
        if (isCancelled(recorderGeneration) || !recorderIdentity || !blob?.size) return;
        if (isFinal && finalChunkQueuedRef.current) return;
        const kind = isFinal ? 'final' : 'chunk';
        const filePath = `protected/${recorderIdentity.userId}/${recorderIdentity.timestamp}_recording_${kind}_${recorderIdentity.pathstamp}_${lastUploadedChunkRef.current++}.webm`;
        if (isFinal) finalChunkQueuedRef.current = true;
        queueUpload(blob, filePath, recorderIdentity, recorderGeneration);
      };

      if (isIOS) {
        recorder.onstop = () => {
          const parts = iosAudioParts;
          iosAudioParts = [];
          const audioBlob = parts.length
            ? new Blob(parts, { type: recorder.mimeType || parts[0].type || 'video/mp4' })
            : null;
          const stop = iosStopRef.current;
          if (!stop || stop.recorder !== recorder) {
            // Preserve an unsolicited stop's audio as a regular segment.
            queueRecorderBlob(audioBlob, false);
            return;
          }
          iosStopRef.current = null;

          if (isCancelled(stop.generation)) {
            stopTracksAndReleaseRecorder(recorder);
            isFinalizingRef.current = false;
            return;
          }

          // All periodic and final data events belong to this complete MP4.
          // Stop may still promote a rotation to final between the last data
          // event and onstop; use the transaction's current intent.
          queueRecorderBlob(audioBlob, stop.intent === 'final');

          if (stop.intent === 'final') {
            // WebKit guarantees dataavailable before onstop. The final event
            // was classified from this stop transaction, then tracks are safe
            // to release only after this completed lifecycle.
            stopTracksAndReleaseRecorder(recorder);
            isFinalizingRef.current = false;
            setIsFinishingRecording(false);
            isRotatingRef.current = false;
            return;
          }

          if (stop.intent === 'rotation' && isRecordingRef.current && !isPausedRef.current) {
            isRotatingRef.current = false;
            startMediaRecorder(recorder);
          }
        };
      } else {
        // Preserve non-iOS recording while ensuring a new capture cannot
        // invalidate the old asynchronous final data event in this client.
        recorder.onstop = () => {
          if (!isCancelled(recorderGeneration) && isFinalizingRef.current && !isRecordingRef.current) {
            isFinalizingRef.current = false;
            setIsFinishingRecording(false);
          }
        };
      }
  
      recorder.ondataavailable = (event) => {
        const generation = recorderGeneration;
        if (isCancelled(generation) || !recorderIdentity || event.data.size === 0) {
          return;
        }
        if (isIOS) {
          // Timeslices can be dependent fragments. Never upload them alone.
          iosAudioParts.push(event.data);
          return;
        }
        queueRecorderBlob(event.data, !isIOS && !isRecordingRef.current);
      };
    } catch (error) {
      console.error('[RecordingManager] Error accessing microphone:', error);
      
      // Provide more specific error messages for mobile
      let errorMessage = 'Failed to start recording.';
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Microphone permission denied. Please enable microphone access in your device settings and try again.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No microphone found. Please ensure your device has a microphone and try again.';
      } else if (error.name === 'NotSupportedError') {
        errorMessage = 'Microphone not supported on this device.';
      } else if (Capacitor.isNativePlatform()) {
        errorMessage = 'Failed to access microphone. Please check app permissions in device settings.';
      } else {
        errorMessage = 'Failed to start recording. Check microphone permissions.';
      }
      
      alert(errorMessage);
      throw error; // Re-throw to prevent recording from starting
    }
  };

  const startRecording = async (metadata) => {
    if (startingRef.current || isRecordingRef.current || isFinalizingRef.current) return;
    startingRef.current = true; setIsStarting(true);
    setIsPreparingTranscript(false); setIsGeneratingSummary(false);
    onGenerationStateChange?.(false);
    const capture = Object.freeze({ visitMetadata: captureSnapshot(metadata), noteSettings: recordingSettingsSnapshot() });
    let microphonePromise;
    const generation = ++recordingGenerationRef.current;
    visibleGenerationRef.current = generation;
    try {
      isDiscardingRef.current = false;
      isUnmountedRef.current = false;

      if (!requestMicrophonePermission()) return;
      // Start media acquisition in the gesture, before authentication/network.
      microphonePromise = navigator.mediaDevices.getUserMedia({ audio: {
        channelCount: 1, echoCancellation: false, noiseSuppression: false, autoGainControl: false
      } });
      microphonePromise.catch(() => {});
      // Reset the chunk counter when starting a new recording
      lastUploadedChunkRef.current = 0;
      finalChunkQueuedRef.current = false;
      isFinalizingRef.current = false;
      isRotatingRef.current = false;
      iosStopRef.current = null;
      
      // Set the conversation timestamp (identifies the conversation)
      timeStampRef.current = Date.now();
      
      // Set a unique path identifier (for ensuring unique file paths)
      pathStampRef.current = Date.now() + '_' + Math.random().toString(36).substring(2, 9);
      const userId = await getUserId();
      if (!userId) {
        throw new Error('User not authenticated for recording');
      }
      if (isCancelled(generation)) { microphonePromise.then(stream => stream.getTracks().forEach(track => track.stop())).catch(() => {}); return; }
      recordingIdentityRef.current = Object.freeze({
        ...capture,
        generation,
        userId,
        timestamp: timeStampRef.current,
        pathstamp: pathStampRef.current,
      });
      
      await setupRecorder(microphonePromise, generation);
      if (isCancelled(generation)) return;
      if (mediaRecorderRef.current) {
        setIsRecording(true);
        isRecordingRef.current = true;
        setIsPaused(false);
        isPausedRef.current = false;
        
        // Android fix: Use timeslice parameter to ensure proper audio duration metadata
        // Without timeslice, Android produces blobs with size > 0 but duration = 0
        // Using 240-second timeslice to match chunk cycle and enable proper transcription
        startMediaRecorder(mediaRecorderRef.current);
        
        if (noSleepRef.current) {
          noSleepOwnerRef.current = generation;
          noSleepRef.current.enable();
        }

        scheduleRecordingInterval();
      }
    } catch (error) {
      microphonePromise?.then(stream => stream.getTracks().forEach(track => track.stop())).catch(() => {});
      // Error already handled in setupRecorder with user-friendly message
      console.error('[RecordingManager] Failed to start recording');
      if (!isCancelled(generation)) { setIsRecording(false); isRecordingRef.current = false; }
    } finally {
      if (recordingGenerationRef.current === generation) {
        startingRef.current = false;
        if (!isUnmountedRef.current) setIsStarting(false);
      }
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecordingRef.current &&
        mediaRecorderRef.current.state === "recording" && !isRotatingRef.current) {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      isPausedRef.current = true;
      clearRecordingInterval();
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && isPausedRef.current &&
        mediaRecorderRef.current.state === "paused") {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      isPausedRef.current = false;
      scheduleRecordingInterval();
    }
  };

  async function getUserId() {
    try {
      const userId = (await getCurrentUser()).userId;
      console.log('[RecordingManager] User ID retrieved');
      return userId;
    } catch (err) {
      console.log(err);
      return null;
    }
  }

  useEffect(() => {
    return () => {
      // Unmount is cancellation, never a request to finalize and upload PHI.
      isUnmountedRef.current = true;
      discardRecording();
      // Clean up subscription when component unmounts
      cleanupNoteGeneration();
      clearTimeout(retryTimerRef.current);
      activeAttemptRef.current?.cancel();
      uploadQueueRef.current = [];
    };
  }, []);

  return {
    generationError,
    getCaptureSession: () => recordingGenerationRef.current,
    uploadStatus, retryUploads, prepareNextRecording,
    isStarting,
    isFinishingRecording,
    isRecording,
    isPaused,
    isPreparingTranscript,
    isGeneratingSummary,
    startRecording,
    stopRecording,
    discardRecording,
    pauseRecording,
    resumeRecording,
    textStream
  };
}

export default RecordingManager;
