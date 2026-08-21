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
  const isFinalizingRef = useRef(false); // iOS final stop is complete only after dataavailable/stop
  const isRotatingRef = useRef(false); // iOS chunk rotation waits for the stop event before restart
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

  const rotateIOSRecordingChunk = () => {
    const recorder = mediaRecorderRef.current;

    if (!isIOS || isFinalizingRef.current || !isRecordingRef.current ||
        isPausedRef.current || !recorder || recorder.state !== "recording") {
      return;
    }

    // Safari/WKWebView delivers dataavailable asynchronously after stop().
    // Do not call start() until its stop event has fired; otherwise the next
    // four-minute segment can race the previous segment's final media bytes.
    isRotatingRef.current = true;
    recorder.stop();
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
        await uploadS3(item.audioBlob, item.filePath);
        // Remove this item from the queue
        uploadQueueRef.current = uploadQueueRef.current.filter(
          queueItem => queueItem !== item
        );
      }

      // Then process the final chunk if it exists
      const finalChunk = uploadQueueRef.current.find(item => item.filePath.includes('_final_'));
      if (finalChunk) {
        await uploadS3(finalChunk.audioBlob, finalChunk.filePath);
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
  const queueUpload = (audioBlob, filePath) => {
    uploadQueueRef.current.push({ audioBlob, filePath });
    processUploadQueue();
  };

  const uploadS3 = async (audioBlob, filePath) => {
    // Use provided filePath instead of generating it here to prevent race conditions
    const timestamp = timeStampRef.current; // Conversation identifier
    const pathstamp = pathStampRef.current; // Unique path identifier
    const userId = await getUserId();
    
    if (!userId) {
      console.error('User not authenticated for S3 upload');
      return null; 
    }

    // Store the last used path in the ref
    filePathRef.current = filePath;
    
    try {
      // Fetch credentials first
      const session = await fetchAuthSession(); // Get fresh session/credentials
      const credentials = session.credentials; 
      if (!credentials) {
        console.error("AWS Credentials not found in session");
        return null; // Or throw an error
      }

      // Generate access token
      const accessToken = await generateToken();

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
        const wasRotating = isRotatingRef.current;
        isRotatingRef.current = false;
        isFinalizingRef.current = true;
        setIsRecording(false);
        isRecordingRef.current = false;
        setIsPaused(false);
        isPausedRef.current = false;
        setIsPreparingTranscript(true);
        setIsTranscriptCompleted(false);

        // A stop can land during the asynchronous four-minute rotation. The
        // rotation's stop event already contains the complete media up to the
        // user's stop request, so let that event finalize instead of calling
        // stop() a second time.
        if (wasRotating) {
          return;
        }

        const stopAfterResume = () => {
          if (recorder.state === "recording") {
            recorder.stop();
          } else if (recorder.state === "inactive") {
            // A recorder that became inactive without a stop event still
            // needs the same cleanup path, but has no final bytes to emit.
            recorder.stream.getTracks().forEach(track => track.stop());
            if (mediaRecorderRef.current === recorder) {
              mediaRecorderRef.current = null;
            }
            isFinalizingRef.current = false;
          }
        };

        if (recorder.state === "paused") {
          const previousOnResume = recorder.onresume;
          recorder.onresume = (...args) => {
            if (typeof previousOnResume === "function") {
              previousOnResume(...args);
            }
            stopAfterResume();
          };
          recorder.resume();
          // Some WebKit versions update state synchronously but dispatch the
          // event later; cover both behaviors without stopping while paused.
          stopAfterResume();
        } else {
          stopAfterResume();
        }
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
    
    // Immediately stop recording and clean up without processing
    if (mediaRecorderRef.current) {
      setIsRecording(false);
      isRecordingRef.current = false;
      setIsPaused(false);
      isPausedRef.current = false;
      
      // Stop the media recorder
      mediaRecorderRef.current.stop();
      
      // Clear the recording interval
      clearRecordingInterval();
      
      // Stop all media tracks
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      mediaRecorderRef.current = null;
    }
    
    // Clear all upload queues and processing flags
    uploadQueueRef.current = [];
    isProcessingUploadsRef.current = false;
    finalChunkRef.current = null;
    isFinalizingRef.current = false;
    isRotatingRef.current = false;
    
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
    
    // Reset the discarding flag after cleanup
    setTimeout(() => {
      isDiscardingRef.current = false;
    }, 100);
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

      if (isIOS) {
        const recorder = mediaRecorderRef.current;
        recorder.onstop = () => {
          if (isDiscardingRef.current) {
            return;
          }

          if (isFinalizingRef.current) {
            // dataavailable is delivered before stop. Only now is it safe to
            // stop the microphone tracks and release the recorder reference.
            recorder.stream.getTracks().forEach(track => track.stop());
            if (mediaRecorderRef.current === recorder) {
              mediaRecorderRef.current = null;
            }
            isFinalizingRef.current = false;
            return;
          }

          if (isRotatingRef.current && isRecordingRef.current && !isPausedRef.current) {
            isRotatingRef.current = false;
            startMediaRecorder(recorder);
          }
        };
      }
  
      mediaRecorderRef.current.ondataavailable = async (event) => {
        if (isDiscardingRef.current) {
          return;
        }
        
        // The explicit finalization flag is required on iOS because the
        // final dataavailable event is asynchronous relative to stop().
        if (event.data.size > 0 && (isFinalizingRef.current || !isRecordingRef.current)) {
          // This is the final chunk when recording stops
          const userId = await getUserId();
          const timestamp = timeStampRef.current; // Conversation identifier
          const pathstamp = pathStampRef.current; // Unique path identifier
          const finalPath = `protected/${userId}/${timestamp}_recording_final_${pathstamp}_${lastUploadedChunkRef.current++}.webm`;
          
          // Queue the final chunk instead of uploading directly
          queueUpload(event.data, finalPath);
        } else if (event.data.size > 0) {
          // This is an intermediate chunk during recording
          const userId = await getUserId();
          const timestamp = timeStampRef.current; // Conversation identifier
          const pathstamp = pathStampRef.current; // Unique path identifier
          const chunkPath = `protected/${userId}/${timestamp}_recording_chunk_${pathstamp}_${lastUploadedChunkRef.current++}.webm`;
          
          // Queue the chunk instead of uploading directly
          queueUpload(event.data, chunkPath);
        }
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
      // Reset the chunk counter when starting a new recording
      lastUploadedChunkRef.current = 0;
      isFinalizingRef.current = false;
      isRotatingRef.current = false;
      
      // Set the conversation timestamp (identifies the conversation)
      timeStampRef.current = Date.now();
      
      // Set a unique path identifier (for ensuring unique file paths)
      pathStampRef.current = Date.now() + '_' + Math.random().toString(36).substring(2, 9);
      
      await setupRecorder();
      if (mediaRecorderRef.current) {
        setIsRecording(true);
        isRecordingRef.current = true;
        setIsPaused(false);
        isPausedRef.current = false;
        
        // Android fix: Use timeslice parameter to ensure proper audio duration metadata
        // Without timeslice, Android produces blobs with size > 0 but duration = 0
        // Using 240-second timeslice to match chunk cycle and enable proper transcription
        if (isAndroid) {
          mediaRecorderRef.current.start(240000); // 240-second (4-minute) timeslice for Android
        } else {
          mediaRecorderRef.current.start(); // No timeslice for other platforms
        }
        
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
      stopRecording();
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
