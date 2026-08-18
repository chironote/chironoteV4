import React, { useState, useRef, useCallback, useEffect } from 'react';
import { getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';
import { uploadData } from 'aws-amplify/storage';
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs"; 
import NoSleep from 'nosleep.js';
import { generateClient } from 'aws-amplify/api';
import * as subscriptions from '../../graphql/subscriptions';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import {
  NOTE_GENERATION_URL,
  createNoteGenerationRequest,
  readNoteGenerationStream
} from './noteGenerationContract';

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
  const transcriptFallbackTimeoutRef = useRef(null);
  const streamResponseStartedRef = useRef(false);
  const uploadQueueRef = useRef([]); // Queue for audio uploads
  const isProcessingUploadsRef = useRef(false); // Flag to track if we're currently processing uploads
  const finalChunkRef = useRef(null); // Reference to store the final chunk
  const chunkStopReasonQueueRef = useRef([]);
  const stopEventReasonQueueRef = useRef([]);
  const isRecordingRef = useRef(false);
  const isPausedRef = useRef(false);
  const isDiscardingRef = useRef(false); // Flag to prevent processing when discarding
  const isAppInBackgroundRef = useRef(false); // Track if app is in background
  // Android fix: Detect Android devices for timeslice parameter
  // Recent Android WebView updates cause MediaRecorder to produce audio blobs with duration=0 without timeslice
  // Using 240-second (4-minute) timeslice to match chunk cycle and enable proper transcription
  const isAndroid = useRef(/android/i.test(navigator.userAgent)).current;

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
            if (stopRecorderWithReason('chunk')) {
              // Android fix: Apply conditional timeslice (240 seconds)
              if (isAndroid) {
                mediaRecorderRef.current.start(240000);
              } else {
                mediaRecorderRef.current.start();
              }
            }
          }
          
          // Restart the chunking interval
          recordingIntervalRef.current = setInterval(() => {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
              if (stopRecorderWithReason('chunk')) {
                // Android fix: Apply conditional timeslice (240 seconds)
                if (isAndroid) {
                  mediaRecorderRef.current.start(240000);
                } else {
                  mediaRecorderRef.current.start();
                }
              }
            }
          }, 240000); // 4 minutes
          
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

  const clearTranscriptFallbackTimeout = () => {
    if (transcriptFallbackTimeoutRef.current) {
      clearTimeout(transcriptFallbackTimeoutRef.current);
      transcriptFallbackTimeoutRef.current = null;
    }
  };

  const stopRecorderWithReason = useCallback((reason) => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      return false;
    }

    // Chunk rotations should only happen when actively recording.
    if (reason === 'chunk' && recorder.state !== "recording") {
      return false;
    }

    chunkStopReasonQueueRef.current.push(reason);
    stopEventReasonQueueRef.current.push(reason);
    recorder.stop();
    return true;
  }, []);

  const startTranscriptFallbackTimeout = () => {
    clearTranscriptFallbackTimeout();
    transcriptFallbackTimeoutRef.current = setTimeout(() => {
      console.warn('[RecordingManager] Transcript fallback timer reached - starting summary generation');
      streamResponse();
    }, 90000);
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
    if (streamResponseStartedRef.current) {
      return;
    }
    streamResponseStartedRef.current = true;
    clearTranscriptFallbackTimeout();

    setIsGeneratingSummary(true);
    setIsPreparingTranscript(false);
    const abortController = new AbortController();
    const resetGenerateWatchdog = (timeoutMs) => {
      if (generateTimeoutRef.current) {
        clearTimeout(generateTimeoutRef.current);
      }
      generateTimeoutRef.current = setTimeout(() => {
        console.warn('Generating Note timeout - closing spinner and returning to main app');
        abortController.abort();
        setIsGeneratingSummary(false);
        setIsPreparingTranscript(false);
        onTransitionToMainApp();
        if (noSleepRef.current) {
          noSleepRef.current.disable();
        }
      }, timeoutMs);
    };

    // Initial watchdog for cases where streaming never starts.
    resetGenerateWatchdog(240000);

    try {
      const userId = await getUserId();
      if (!userId) {
        console.error('User not authenticated');
        return;
      }
      const accessToken = await generateToken();

      const response = await fetch(NOTE_GENERATION_URL, createNoteGenerationRequest({
        userId,
        timeStamp: timeStampRef.current,
        accessToken,
        noteSettings: localStorage.getItem('noteSettings'),
        signal: abortController.signal
      }));
      
      if (!response.ok) {
        console.error(`HTTP error! status: ${response.status}`);
        return;
      }
      if (!response.body) {
        console.error('Streaming error: response body is missing');
        return;
      }

      let isFirstChunk = true;

      await readNoteGenerationStream(response, (text) => {
        // Once streaming has started, use a shorter stall watchdog.
        resetGenerateWatchdog(30000);

        if (isFirstChunk) {
          isFirstChunk = false;
          setIsGeneratingSummary(false);
          onTransitionToMainApp();
        }

        setTextStream((prev) => {
          const newText = prev + text;
          onTextStreamUpdate(newText);
          return newText;
        });
      });
    } catch (error) {
      if (error.name === 'AbortError') {
        console.warn('Streaming aborted due to watchdog timeout');
      } else {
        console.error("Streaming error:", error);
      }
    } finally {
      setIsGeneratingSummary(false);
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

  const stopRecording = (options = {}) => {
    const { startFallback = true } = options;
    if (mediaRecorderRef.current) {
      const recorder = mediaRecorderRef.current;
      setIsRecording(false);
      setIsPaused(false);
      isPausedRef.current = false;
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
      if (!stopRecorderWithReason('final')) {
        isRecordingRef.current = false;
        recorder.stream.getTracks().forEach(track => track.stop());
        mediaRecorderRef.current = null;
      }
      setIsPreparingTranscript(true);
      setIsTranscriptCompleted(false);
      if (startFallback) {
        startTranscriptFallbackTimeout();
      }
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
      stopRecorderWithReason('discard');
      
      // Clear the recording interval
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
      
      // Stop all media tracks
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      mediaRecorderRef.current = null;
    }
    
    // Clear all upload queues and processing flags
    uploadQueueRef.current = [];
    isProcessingUploadsRef.current = false;
    finalChunkRef.current = null;
    chunkStopReasonQueueRef.current = [];
    stopEventReasonQueueRef.current = [];
    streamResponseStartedRef.current = false;
    clearTranscriptFallbackTimeout();
    if (generateTimeoutRef.current) {
      clearTimeout(generateTimeoutRef.current);
      generateTimeoutRef.current = null;
    }
    
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
  
      mediaRecorderRef.current.ondataavailable = async (event) => {
        if (isDiscardingRef.current) {
          return;
        }
        if (event.data.size <= 0) {
          return;
        }

        const stopReason = chunkStopReasonQueueRef.current.shift() || 'chunk';
        const userId = await getUserId();
        const timestamp = timeStampRef.current; // Conversation identifier
        const pathstamp = pathStampRef.current; // Unique path identifier
        const isFinalChunk = stopReason === 'final';
        const chunkType = isFinalChunk ? 'final' : 'chunk';
        const filePath = `protected/${userId}/${timestamp}_recording_${chunkType}_${pathstamp}_${lastUploadedChunkRef.current++}.webm`;

        // Queue the chunk instead of uploading directly
        queueUpload(event.data, filePath);
      };

      mediaRecorderRef.current.onstop = () => {
        const stopReason = stopEventReasonQueueRef.current.shift() || 'chunk';
        if (stopReason === 'final' || stopReason === 'discard') {
          isRecordingRef.current = false;
          if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            mediaRecorderRef.current = null;
          }
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
      streamResponseStartedRef.current = false;
      clearTranscriptFallbackTimeout();
      if (generateTimeoutRef.current) {
        clearTimeout(generateTimeoutRef.current);
        generateTimeoutRef.current = null;
      }
      chunkStopReasonQueueRef.current = [];
      stopEventReasonQueueRef.current = [];
      
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

      recordingIntervalRef.current = setInterval(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
          if (stopRecorderWithReason('chunk')) {
            // Android fix: Apply same conditional timeslice when restarting (240 seconds)
            if (isAndroid) {
              mediaRecorderRef.current.start(240000); // 240-second (4-minute) timeslice for Android
            } else {
              mediaRecorderRef.current.start(); // No timeslice for other platforms
            }
          }
        }
      }, 240000); // 240 seconds
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

      recordingIntervalRef.current = setInterval(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
          if (stopRecorderWithReason('chunk')) {
            // Android fix: Apply conditional timeslice when resuming (240 seconds)
            if (isAndroid) {
              mediaRecorderRef.current.start(240000); // 240-second (4-minute) timeslice for Android
            } else {
              mediaRecorderRef.current.start(); // No timeslice for other platforms
            }
          }
        }
      }, 240000);
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
      stopRecording({ startFallback: false });
      clearTranscriptFallbackTimeout();
      if (generateTimeoutRef.current) {
        clearTimeout(generateTimeoutRef.current);
        generateTimeoutRef.current = null;
      }
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
