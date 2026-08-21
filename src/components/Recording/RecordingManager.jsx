import React, { useState, useRef, useCallback, useEffect } from 'react';
import { getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';
import { uploadData } from 'aws-amplify/storage';
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs"; 
import NoSleep from 'nosleep.js';
import { generateClient } from 'aws-amplify/api';
import * as subscriptions from '../../graphql/subscriptions';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';

const client = generateClient();

function RecordingManager({ onTextStreamUpdate, onTransitionToMainApp }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isPreparingTranscript, setIsPreparingTranscript] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [isTranscriptCompleted, setIsTranscriptCompleted] = useState(false);
  const mediaRecorderRef = useRef(null);
  const recordingIntervalRef = useRef(null);
  const timeStampRef = useRef(null); // Conversation identifier timestamp
  const pathStampRef = useRef(null); // For uniquely identifying file paths
  const filePathRef = useRef(null); // Add a ref to store the file path
  const lastUploadedChunkRef = useRef(0); // Track chunk number for unique paths
  const [textStream, setTextStream] = useState('');
  const noSleepRef = useRef(null);
  const subscriptionRef = useRef(null);
  const generateTimeoutRef = useRef(null);
  const uploadQueueRef = useRef([]); // Queue for audio uploads
  const isProcessingUploadsRef = useRef(false); // Flag to track if we're currently processing uploads
  const finalChunkRef = useRef(null); // Reference to store the final chunk
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

    // Keep the Android timeslice behavior unchanged. iOS intentionally uses
    // the existing no-timeslice MP4 recording path.
    if (isAndroid) {
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
      // A user stop before WebKit's delayed data event promotes this one
      // pending segment to final. Once dataavailable has run, its captured
      // classification is intentionally never changed.
      if (intent === 'final' && !pendingStop.dataHandled) {
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
      dataHandled: false,
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

  // Process uploads from the queue one at a time
  const processUploadQueue = async () => {
    if (isProcessingUploadsRef.current || uploadQueueRef.current.length === 0) {
      return;
    }

    isProcessingUploadsRef.current = true;

    try {
      // Process all regular chunks first
      const regularChunks = uploadQueueRef.current.filter(item => !item.filePath.includes('_final_'));
      for (const item of regularChunks) {
        await uploadS3(item);
        // Remove this item from the queue
        uploadQueueRef.current = uploadQueueRef.current.filter(
          queueItem => queueItem !== item
        );
      }

      // Then process the final chunk if it exists
      const finalChunk = uploadQueueRef.current.find(item => item.filePath.includes('_final_'));
      if (finalChunk) {
        await uploadS3(finalChunk);
        // Remove the final chunk from the queue
        uploadQueueRef.current = uploadQueueRef.current.filter(
          queueItem => queueItem !== finalChunk
        );
      }
    } catch (error) {
      console.error('Error processing upload queue:', error);
    } finally {
      isProcessingUploadsRef.current = false;
      
      // If there are more items in the queue, process them
      if (uploadQueueRef.current.length > 0) {
        processUploadQueue();
      }
    }
  };

  // Add to upload queue instead of uploading directly
  const queueUpload = (audioBlob, filePath, identity, generation) => {
    if (isCancelled(generation)) {
      return;
    }
    uploadQueueRef.current.push({ audioBlob, filePath, identity, generation });
    processUploadQueue();
  };

  const uploadS3 = async ({ audioBlob, filePath, identity, generation }) => {
    // Every queue item carries the identity captured with its media event so a
    // later recording cannot relabel an earlier upload.
    if (isCancelled(generation)) {
      return null; 
    }
    const { timestamp, userId } = identity;

    // Store the last used path in the ref
    filePathRef.current = filePath;
    
    try {
      // Fetch credentials first
      const session = await fetchAuthSession(); // Get fresh session/credentials
      if (isCancelled(generation)) {
        return null;
      }
      const credentials = session.credentials; 
      if (!credentials) {
        console.error("AWS Credentials not found in session");
        return null; // Or throw an error
      }

      // Generate access token
      const accessToken = await generateToken();
      if (isCancelled(generation)) {
        return null;
      }

      // Initialize SQS Client here with fetched credentials
      const sqsClient = new SQSClient({ 
        region: "us-east-2", 
        credentials 
      });

      // First upload to S3 (Amplify Storage handles its own credentials)
      const uploadResult = await uploadData({
        path: filePath,
        data: audioBlob,
        options: {
          // Keep the established browser-to-backend contract unchanged. The
          // iPhone recorder's Blob is MP4, but backend ingestion currently
          // expects WebM-labelled objects and must be migrated separately.
          contentType: 'audio/webm',
          metadata: {
            timestamp: timestamp.toString(),
            userId: userId
          }
        }
      }).result;

      console.log('[RecordingManager] Successfully uploaded audio chunk');
      
      // Then send a message to SQS to trigger transcription Lambda
      const selectedLanguage = localStorage.getItem('selectedLanguage');
      const queueUrl = "https://sqs.us-east-2.amazonaws.com/026090532772/AudioTranscriptionQueue.fifo"; 
      const messageBody = JSON.stringify({
        userId,
        timestamp,
        path: filePath,
        language: selectedLanguage === 'null' ? null : selectedLanguage,
        isFinalAudio: filePath.includes('_final_'),
        accessToken: accessToken,
        noteSettings: localStorage.getItem('noteSettings')
      });
      // Create a shorter, valid deduplication ID (max 128 chars, alphanumeric, hyphens, underscores only)
      // Use the last part of the filename which should be unique enough
      const filenameParts = filePath.split('/');
      const lastPart = filenameParts[filenameParts.length - 1];
      const deduplicationId = `${userId.substring(0, 8)}-${timestamp}-${lastPart}`.replace(/[^a-zA-Z0-9\-_]/g, '');
      console.log('[RecordingManager] Generated deduplication ID');

      const command = new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: messageBody,
        MessageGroupId: userId, 
        MessageDeduplicationId: deduplicationId 
      });

      try {
        const data = await sqsClient.send(command);
        console.log('[RecordingManager] Successfully sent message to SQS');
        console.log(`Queue notified of new audio segment. Is final? ${filePath.includes('_final_') ? 'True' : 'False'}`);
        
        // Set up subscription to monitor when transcript processing completes
        if (filePath.includes('_final_')) {
          console.log("Final recording uploaded, waiting for transcript completion...");
          setIsTranscriptCompleted(false);
          subscribeToNoteCompletion(userId, timestamp);
        }
      } catch (error) {
        console.error("Error sending message to SQS:", error);
        // Decide if you want to throw the error or handle it (e.g., retry logic)
      }

      return uploadResult;
    } catch (error) {
      console.error('Error uploading audio to S3:', error);
      throw error; 
    }
  };

  const subscribeToNoteCompletion = async (userId, timestamp) => {
    // Clean up previous subscription if it exists
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
    }

    // Set up timeout to automatically move on after 80 seconds
    const timeoutId = setTimeout(() => {
      console.log('Subscription wait timeout (40 seconds) - moving on automatically');
      // Make sure to unsubscribe before moving on
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
      setIsTranscriptCompleted(true);
      streamResponse();
    }, 80000); // 80 seconds

    // Set up new subscription
    subscriptionRef.current = client.graphql({
      query: subscriptions.onUpdateNotesByOwner,
      variables: { owner: userId }
    }).subscribe({
      next: ({ data }) => {
        console.log('[RecordingManager] Received subscription update');
        const updatedNote = data.onUpdateNotesByOwner;
        
        // Check if this is the note we're waiting for
        if (updatedNote.timestamp && updatedNote.timestamp.toString() === timestamp.toString()) {
          console.log('[RecordingManager] Found matching note');
          
          // Check if the note processing is completed
          if (updatedNote.isCompleted === true) {
            console.log('Transcript processing completed!');
            // Clear the timeout since we got a response
            clearTimeout(timeoutId);
            setIsTranscriptCompleted(true);
            // Unsubscribe since we found our match
            if (subscriptionRef.current) {
              subscriptionRef.current.unsubscribe();
              subscriptionRef.current = null;
            }
            // Proceed to stream response
            streamResponse();
          }
        }
      },
      error: (error) => {
        console.error('Subscription error:', error);
        // Clear the timeout since we're handling the error
        clearTimeout(timeoutId);
        // If there's an error with subscription, proceed anyway to avoid blocking
        setIsTranscriptCompleted(true);
        streamResponse();
      }
    });
  };

  const streamResponse = async () => {
    setIsGeneratingSummary(true);
    setIsPreparingTranscript(false);
    // Safety timeout: auto-exit "Generating Note" after 4 minutes if streaming doesn't start
    generateTimeoutRef.current = setTimeout(() => {
      console.warn('Generating Note timeout (4 minutes) - closing spinner and returning to main app');
      setIsGeneratingSummary(false);
      setIsPreparingTranscript(false);
      onTransitionToMainApp();
      if (noSleepRef.current) {
        noSleepRef.current.disable();
      }
    }, 240000);
    try {
      const userId = await getUserId();
      if (!userId) {
        console.error('User not authenticated');
        return;
      }
      const accessToken = await generateToken();

      const response = await fetch("https://xx3olxpcoay5sicmny45g7c5ay0ugvtm.lambda-url.us-east-2.on.aws", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: userId,
          timeStamp: timeStampRef.current,
          accessToken: accessToken,
          noteSettings: localStorage.getItem('noteSettings'),
        }),
      });
      
      if (!response.ok) {
        console.error(`HTTP error! status: ${response.status}`);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let chunk;
      let isFirstChunk = true;
      
      // Hide the "Generating Note" window as soon as streaming starts
      if (generateTimeoutRef.current) {
        clearTimeout(generateTimeoutRef.current);
        generateTimeoutRef.current = null;
      }
      setIsGeneratingSummary(false);
      
      // Close the recording popup so user can see the streaming text
      onTransitionToMainApp();
      
      while (true) {
        chunk = await reader.read();
        const text = decoder.decode(chunk.value, { stream: !chunk.done });
        setTextStream((prev) => {
          const newText = prev + text;
          onTextStreamUpdate(newText);
          if (isFirstChunk) {
            isFirstChunk = false;
          }
          return newText;
        }); 

        if (chunk.done) {
          break;
        } 
      }
    } catch (error) {
      console.error("Streaming error:", error);
    } finally {
      setIsPreparingTranscript(false);
      if (generateTimeoutRef.current) {
        clearTimeout(generateTimeoutRef.current);
        generateTimeoutRef.current = null;
      }
      if (noSleepRef.current) {
        noSleepRef.current.disable();
      }
    }
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
        setIsPreparingTranscript(true);
        setIsTranscriptCompleted(false);
        requestIOSStop('final');
        return;
      }

      setIsRecording(false);
      isRecordingRef.current = false;
      setIsPaused(false);
      isPausedRef.current = false;
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

  const discardRecording = () => {
    // Set flag to prevent any data processing
    isDiscardingRef.current = true;
    recordingGenerationRef.current += 1;
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
    
    // Clear all upload queues and processing flags
    uploadQueueRef.current = [];
    isProcessingUploadsRef.current = false;
    finalChunkRef.current = null;
    isFinalizingRef.current = false;
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
    if (noSleepRef.current) {
      noSleepRef.current.disable();
    }
    
    // Cancel any active subscriptions
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
    }
    
  };

  const requestMicrophonePermission = async () => {
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

  const setupRecorder = async () => {
    try {
      setTextStream('');
      
      // Request microphone permission with disclosure
      const permissionGranted = await requestMicrophonePermission();
      if (!permissionGranted) {
        console.log('[RecordingManager] User denied permission rationale');
        return;
      }
      
      // Add Capacitor permission handling
      if (Capacitor.isNativePlatform()) {
        console.log('[RecordingManager] Running on native platform, requesting microphone access...');
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1, // Mono
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        }
      });
      
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

      if (isIOS) {
        recorder.onstop = () => {
          const stop = iosStopRef.current;
          if (!stop || stop.recorder !== recorder) {
            return;
          }
          iosStopRef.current = null;

          if (isCancelled(stop.generation)) {
            stopTracksAndReleaseRecorder(recorder);
            isFinalizingRef.current = false;
            return;
          }

          if (stop.intent === 'final') {
            // WebKit guarantees dataavailable before onstop. The final event
            // was classified from this stop transaction, then tracks are safe
            // to release only after this completed lifecycle.
            stopTracksAndReleaseRecorder(recorder);
            isFinalizingRef.current = false;
            isRotatingRef.current = false;
            return;
          }

          if (stop.intent === 'rotation' && isRecordingRef.current && !isPausedRef.current) {
            isRotatingRef.current = false;
            startMediaRecorder(recorder);
          }
        };
      }
  
      recorder.ondataavailable = (event) => {
        const stop = isIOS ? iosStopRef.current : null;
        const identity = recorderIdentity;
        const generation = recorderGeneration;
        // Capture the stop intent synchronously. Do not infer it from React
        // state or finalization refs after WebKit has scheduled this event.
        const stopIntent = stop && stop.recorder === recorder
          ? stop.intent
          : null;
        if (stop && stop.recorder === recorder) {
          stop.dataHandled = true;
        }
        if (isCancelled(generation) || !identity || event.data.size === 0) {
          return;
        }

        const isFinal = isIOS ? stopIntent === 'final' : !isRecordingRef.current;
        if (isFinal && finalChunkQueuedRef.current) {
          return;
        }
        const kind = isFinal ? 'final' : 'chunk';
        const filePath = `protected/${identity.userId}/${identity.timestamp}_recording_${kind}_${identity.pathstamp}_${lastUploadedChunkRef.current++}.webm`;
        if (isFinal) {
          finalChunkQueuedRef.current = true;
        }
        queueUpload(event.data, filePath, identity, generation);
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

  const startRecording = async () => {
    try {
      isDiscardingRef.current = false;
      isUnmountedRef.current = false;
      recordingGenerationRef.current += 1;
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
      recordingIdentityRef.current = {
        userId,
        timestamp: timeStampRef.current,
        pathstamp: pathStampRef.current,
      };
      
      await setupRecorder();
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
          noSleepRef.current.enable();
        }

        scheduleRecordingInterval();
      }
    } catch (error) {
      // Error already handled in setupRecorder with user-friendly message
      console.error('[RecordingManager] Failed to start recording:', error);
      // Ensure recording state is reset if setup fails
      setIsRecording(false);
      isRecordingRef.current = false;
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

  async function generateToken() {
    const session = await fetchAuthSession();
    const accessToken = session.tokens.accessToken.toString();
    console.log('[RecordingManager] Access token generated');
    return accessToken;
  }

  useEffect(() => {
    return () => {
      // Unmount is cancellation, never a request to finalize and upload PHI.
      isUnmountedRef.current = true;
      discardRecording();
      // Clean up subscription when component unmounts
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, []);

  return {
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
