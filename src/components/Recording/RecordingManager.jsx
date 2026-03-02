import { useState, useRef, useEffect } from 'react';
import { getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';
import { uploadData } from 'aws-amplify/storage';
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs"; 
import NoSleep from 'nosleep.js';
import { generateClient } from 'aws-amplify/api';
import * as subscriptions from '../../graphql/subscriptions';

const client = generateClient();
const NOTE_GENERATION_RETRY_MESSAGE = 'Your note could not be generated, the system will retry in 5 min. Sorry for the inconvenience';
const TRANSCRIPT_WAIT_TIMEOUT_MS = 30000;
const NOTE_GENERATION_TIMEOUT_MS = 120000;
const NOTE_GENERATION_TIMEOUT_AFTER_TRANSCRIPT_FALLBACK_MS = 45000;
const NOTE_GENERATION_STREAM_ERROR_SENTINEL = '\u0000ERROR:';

const parseLambdaErrorPayload = (payload) => {
  if (typeof payload !== 'string') {
    return null;
  }

  const sentinelIndex = payload.indexOf(NOTE_GENERATION_STREAM_ERROR_SENTINEL);
  if (sentinelIndex >= 0) {
    const sentinelPayload = payload
      .slice(sentinelIndex + NOTE_GENERATION_STREAM_ERROR_SENTINEL.length)
      .trim();
    if (!sentinelPayload) {
      return { message: 'Unknown note generation error' };
    }
    try {
      const parsedSentinelPayload = JSON.parse(sentinelPayload);
      if (parsedSentinelPayload && typeof parsedSentinelPayload === 'object') {
        return parsedSentinelPayload;
      }
      return { message: sentinelPayload };
    } catch (error) {
      return { message: sentinelPayload };
    }
  }

  const trimmedPayload = payload.trim();
  if (!trimmedPayload.startsWith('{') || !trimmedPayload.endsWith('}')) {
    return null;
  }
  try {
    const parsedPayload = JSON.parse(trimmedPayload);
    if (
      parsedPayload &&
      typeof parsedPayload === 'object' &&
      (
        typeof parsedPayload.errorType === 'string' ||
        typeof parsedPayload.errorMessage === 'string' ||
        typeof parsedPayload.message === 'string'
      )
    ) {
      return parsedPayload;
    }
  } catch (error) {
    return null;
  }

  return null;
};

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
  const isFinalizingRecordingRef = useRef(false);
  const transcriptFallbackTimeoutRef = useRef(null);
  const hasStartedStreamingRef = useRef(false);
  const hasHandledNoteGenerationFailureRef = useRef(false);
  const generateAbortControllerRef = useRef(null);
  const isDiscardingRef = useRef(false); // Flag to prevent processing when discarding
  const streamRef = useRef(null); // Persist media stream for Safari permission

  // Android device detection for audio duration fix
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

      console.log(`Successfully uploaded to: ${filePath}`, uploadResult);
      
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
      console.log('Deduplication ID:', deduplicationId);

      const command = new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: messageBody,
        MessageGroupId: userId, 
        MessageDeduplicationId: deduplicationId 
      });

      try {
        const data = await sqsClient.send(command);
        console.log("Successfully sent message to SQS:", data.MessageId);
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

    // Set up timeout to automatically move on after the transcript wait window
    const timeoutId = setTimeout(() => {
      console.log(`Subscription wait timeout (${TRANSCRIPT_WAIT_TIMEOUT_MS / 1000} seconds) - moving on automatically`);
      // Make sure to unsubscribe before moving on
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
      setIsTranscriptCompleted(true);
      streamResponse({ fromTranscriptFallback: true });
    }, TRANSCRIPT_WAIT_TIMEOUT_MS);

    // Set up new subscription
    subscriptionRef.current = client.graphql({
      query: subscriptions.onUpdateNotesByOwner,
      variables: { owner: userId }
    }).subscribe({
      next: ({ data }) => {
        console.log('Received data from notes subscription:', data);
        const updatedNote = data.onUpdateNotesByOwner;
        
        // Check if this is the note we're waiting for
        if (updatedNote.timestamp && updatedNote.timestamp.toString() === timestamp.toString()) {
          console.log('Found matching note:', updatedNote);
          
          const transcriptError = parseLambdaErrorPayload(updatedNote.transcript || '');
          if (transcriptError) {
            console.warn('Transcript update contains backend error payload, moving on to note generation fallback path');
            clearTimeout(timeoutId);
            setIsTranscriptCompleted(true);
            if (subscriptionRef.current) {
              subscriptionRef.current.unsubscribe();
              subscriptionRef.current = null;
            }
            streamResponse({ fromTranscriptFallback: true });
            return;
          }

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
        streamResponse({ fromTranscriptFallback: true });
      }
    });
  };

  const streamResponse = async ({ fromTranscriptFallback = false } = {}) => {
    if (hasStartedStreamingRef.current) {
      console.log('streamResponse already started, skipping duplicate trigger');
      return;
    }

    const handleNoteGenerationFailure = (reason, error = null) => {
      if (hasHandledNoteGenerationFailureRef.current || isDiscardingRef.current) {
        return;
      }

      hasHandledNoteGenerationFailureRef.current = true;
      console.error(`Note generation failed: ${reason}`, error);
      if (generateAbortControllerRef.current) {
        generateAbortControllerRef.current.abort();
        generateAbortControllerRef.current = null;
      }
      setTextStream(NOTE_GENERATION_RETRY_MESSAGE);
      onTextStreamUpdate(NOTE_GENERATION_RETRY_MESSAGE);
      setIsGeneratingSummary(false);
      setIsPreparingTranscript(false);
      onTransitionToMainApp();
      if (generateTimeoutRef.current) {
        clearTimeout(generateTimeoutRef.current);
        generateTimeoutRef.current = null;
      }
      if (noSleepRef.current) {
        noSleepRef.current.disable();
      }
    };

    hasStartedStreamingRef.current = true;
    hasHandledNoteGenerationFailureRef.current = false;
    if (transcriptFallbackTimeoutRef.current) {
      clearTimeout(transcriptFallbackTimeoutRef.current);
      transcriptFallbackTimeoutRef.current = null;
    }

    setIsGeneratingSummary(true);
    setIsPreparingTranscript(false);
    
    // Clear any existing clipboard content before streaming new note
    // This prevents old notes from briefly appearing when popup closes
    onTextStreamUpdate('');

    if (generateAbortControllerRef.current) {
      generateAbortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    generateAbortControllerRef.current = abortController;

    const generationTimeoutMs = fromTranscriptFallback
      ? NOTE_GENERATION_TIMEOUT_AFTER_TRANSCRIPT_FALLBACK_MS
      : NOTE_GENERATION_TIMEOUT_MS;
    
    // Safety timeout: auto-exit "Generating Note" after 2 minutes if generation stalls
    generateTimeoutRef.current = setTimeout(() => {
      console.warn(`Generating Note timeout (${generationTimeoutMs / 1000} seconds) - closing spinner and returning to main app`);
      handleNoteGenerationFailure('timeout');
    }, generationTimeoutMs);
    try {
      const userId = await getUserId();
      if (!userId) {
        handleNoteGenerationFailure('user_not_authenticated');
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
        signal: abortController.signal,
      });
      
      if (!response.ok) {
        handleNoteGenerationFailure(`http_${response.status}`);
        return;
      }

      const contentType = (response.headers.get('content-type') || '').toLowerCase();
      if (contentType.includes('application/json')) {
        const responseBody = await response.text();
        const lambdaError = parseLambdaErrorPayload(responseBody);
        if (lambdaError) {
          handleNoteGenerationFailure('lambda_json_error_response', lambdaError);
          return;
        }
      }

      if (!response.body) {
        handleNoteGenerationFailure('missing_stream_body');
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let chunk;
      let isFirstChunk = true;
      let streamControlBuffer = '';
      
      // Hide the "Generating Note" window as soon as streaming starts
      setIsGeneratingSummary(false);
      
      // Close the recording popup so user can see the streaming text
      onTransitionToMainApp();
      
      while (true) {
        if (hasHandledNoteGenerationFailureRef.current || isDiscardingRef.current) {
          try {
            await reader.cancel();
          } catch (cancelError) {
            console.warn('Error cancelling note generation stream reader:', cancelError);
          }
          break;
        }

        chunk = await reader.read();
        if (chunk.done) {
          if (generateTimeoutRef.current) {
            clearTimeout(generateTimeoutRef.current);
            generateTimeoutRef.current = null;
          }
          break;
        }

        const text = decoder.decode(chunk.value, { stream: !chunk.done });
        const chunkForErrorDetection = streamControlBuffer + text;
        const lambdaChunkError = parseLambdaErrorPayload(chunkForErrorDetection);
        if (lambdaChunkError) {
          handleNoteGenerationFailure('lambda_stream_chunk_error', lambdaChunkError);
          try {
            await reader.cancel();
          } catch (cancelError) {
            console.warn('Error cancelling note generation stream reader after chunk error:', cancelError);
          }
          break;
        }

        // Keep a small tail so sentinel-based errors split across chunks are still detected.
        const sentinelTailLength = NOTE_GENERATION_STREAM_ERROR_SENTINEL.length - 1;
        streamControlBuffer = chunkForErrorDetection.slice(-sentinelTailLength);

        if (hasHandledNoteGenerationFailureRef.current || isDiscardingRef.current) {
          break;
        }

        setTextStream((prev) => {
          const newText = prev + text;
          onTextStreamUpdate(newText);
          if (isFirstChunk) {
            isFirstChunk = false;
          }
          return newText;
        }); 
      }
    } catch (error) {
      if (error?.name !== 'AbortError') {
        handleNoteGenerationFailure('streaming_exception', error);
      }
    } finally {
      setIsGeneratingSummary(false);
      setIsPreparingTranscript(false);
      if (generateTimeoutRef.current) {
        clearTimeout(generateTimeoutRef.current);
        generateTimeoutRef.current = null;
      }
      if (generateAbortControllerRef.current === abortController) {
        generateAbortControllerRef.current = null;
      }
      if (noSleepRef.current) {
        noSleepRef.current.disable();
      }
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

      if (transcriptFallbackTimeoutRef.current) {
        clearTimeout(transcriptFallbackTimeoutRef.current);
      }
      transcriptFallbackTimeoutRef.current = setTimeout(() => {
        if (!hasStartedStreamingRef.current) {
          console.warn('Transcript fallback timeout reached - starting summary generation directly');
          streamResponse({ fromTranscriptFallback: true });
        }
      }, TRANSCRIPT_WAIT_TIMEOUT_MS);
    }
  };

  const discardRecording = () => {
    // Set flag to prevent any data processing
    isDiscardingRef.current = true;
    
    // Immediately stop recording and clean up without processing
    if (mediaRecorderRef.current) {
      isFinalizingRecordingRef.current = true;
      setIsRecording(false);
      setIsPaused(false);
      isPausedRef.current = false;
      
      // Stop the media recorder
      mediaRecorderRef.current.stop();
      
      // Clear the recording interval
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
    }
    
    // Clear all upload queues and processing flags
    uploadQueueRef.current = [];
    isProcessingUploadsRef.current = false;
    finalChunkRef.current = null;
    
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
    hasStartedStreamingRef.current = false;
    hasHandledNoteGenerationFailureRef.current = false;
    
    // Disable NoSleep
    if (noSleepRef.current) {
      noSleepRef.current.disable();
    }

    if (transcriptFallbackTimeoutRef.current) {
      clearTimeout(transcriptFallbackTimeoutRef.current);
      transcriptFallbackTimeoutRef.current = null;
    }
    if (generateTimeoutRef.current) {
      clearTimeout(generateTimeoutRef.current);
      generateTimeoutRef.current = null;
    }
    if (generateAbortControllerRef.current) {
      generateAbortControllerRef.current.abort();
      generateAbortControllerRef.current = null;
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

  const setupRecorder = async () => {
    try {
      setTextStream('');
      
      // Reuse existing stream if available (Safari permission persistence)
      let stream = streamRef.current;
      if (!stream || !stream.active) {
        console.log('[RecordingManager] Creating new media stream');
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1, // Mono
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          }
        });
        streamRef.current = stream;
      } else {
        console.log('[RecordingManager] Reusing existing media stream');
      }
  
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
  
      // Minimum blob size to filter out header-only blobs that contain no audio frames.
      // A WebM container header alone is ~200-500 bytes; real audio chunks are much larger.
      const MIN_AUDIO_BLOB_SIZE = 1000;

      mediaRecorderRef.current.ondataavailable = async (event) => {
        if (isDiscardingRef.current) {
          return;
        }
        
        const isRecorderInactive = event.target?.state === 'inactive';
        if (event.data.size >= MIN_AUDIO_BLOB_SIZE && isFinalizingRecordingRef.current && isRecorderInactive) {
          // This is the final chunk when recording stops
          const userId = await getUserId();
          const timestamp = timeStampRef.current; // Conversation identifier
          const pathstamp = pathStampRef.current; // Unique path identifier
          const finalPath = `protected/${userId}/${timestamp}_recording_final_${pathstamp}_${lastUploadedChunkRef.current++}.webm`;
          
          // Queue the final chunk instead of uploading directly
          queueUpload(event.data, finalPath);
        } else if (event.data.size >= MIN_AUDIO_BLOB_SIZE) {
          // This is an intermediate chunk during recording
          const userId = await getUserId();
          const timestamp = timeStampRef.current; // Conversation identifier
          const pathstamp = pathStampRef.current; // Unique path identifier
          const chunkPath = `protected/${userId}/${timestamp}_recording_chunk_${pathstamp}_${lastUploadedChunkRef.current++}.webm`;
          
          // Queue the chunk instead of uploading directly
          queueUpload(event.data, chunkPath);
        } else if (event.data.size > 0) {
          console.warn(`[RecordingManager] Skipping small audio blob (${event.data.size} bytes) - likely header-only, no audio frames`);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        if (isFinalizingRecordingRef.current) {
          // Final stop (user pressed Stop Recording) — clean up
          isRecordingRef.current = false;
          isFinalizingRecordingRef.current = false;
          mediaRecorderRef.current = null;
        } else if (
          isRecordingRef.current &&
          mediaRecorderRef.current &&
          mediaRecorderRef.current.state === 'inactive' &&
          !isPausedRef.current &&
          !isDiscardingRef.current
        ) {
          // Interval-triggered stop completed — safe to restart recording now.
          // This avoids the race condition of calling .start() immediately after .stop()
          // in the setInterval callback, which could produce header-only blobs.
          // Guards: check recorder is truly inactive, not finalizing, not paused, not discarding.
          if (isAndroid) {
            mediaRecorderRef.current.start(240000); // 4 minute timeslice for Android
          } else {
            mediaRecorderRef.current.start(); // No timeslice for other platforms
          }
        }
      };
    } catch (error) {
      console.error('Error accessing microphone', error);
    }
  };

  const startRecording = async () => {
    // Reset the chunk counter when starting a new recording
    lastUploadedChunkRef.current = 0;
    isFinalizingRecordingRef.current = false;
    hasStartedStreamingRef.current = false;
    hasHandledNoteGenerationFailureRef.current = false;
    if (transcriptFallbackTimeoutRef.current) {
      clearTimeout(transcriptFallbackTimeoutRef.current);
      transcriptFallbackTimeoutRef.current = null;
    }
    if (generateTimeoutRef.current) {
      clearTimeout(generateTimeoutRef.current);
      generateTimeoutRef.current = null;
    }
    if (generateAbortControllerRef.current) {
      generateAbortControllerRef.current.abort();
      generateAbortControllerRef.current = null;
    }
    
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
      
      // CRITICAL ANDROID FIX: Use timeslice on Android to ensure proper audio blob duration metadata
      // Recent Android updates cause MediaRecorder to produce blobs with duration=0 without timeslice
      // Timeslice forces regular ondataavailable events with proper metadata
      // Using 4 minute timeslice for Android only to prevent zero-duration crashes
      if (isAndroid) {
        mediaRecorderRef.current.start(240000); // 4 minute timeslice for Android
      } else {
        mediaRecorderRef.current.start(); // No timeslice for other platforms
      }
      
      if (noSleepRef.current) {
        noSleepRef.current.enable();
      }

      recordingIntervalRef.current = setInterval(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
          // Only stop here — the onstop handler will call .start() once the recorder
          // has fully flushed its data, preventing header-only blob race conditions.
          mediaRecorderRef.current.stop();
        }
      }, 240000); // 240 seconds
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
          // Only stop here — the onstop handler will call .start() once the recorder
          // has fully flushed its data, preventing header-only blob race conditions.
          mediaRecorderRef.current.stop();
        }
      }, 240000);
    }
  };

  async function getUserId() {
    try {
      const userId = (await getCurrentUser()).userId;
      console.log('Current session ID:' + userId);
      return userId;
    } catch (err) {
      console.log(err);
      return null;
    }
  }

  async function generateToken() {
    const session = await fetchAuthSession();
    const accessToken = session.tokens.accessToken.toString();
    console.log(accessToken);
    return accessToken;
  }

  useEffect(() => {
    return () => {
      stopRecording();
      if (transcriptFallbackTimeoutRef.current) {
        clearTimeout(transcriptFallbackTimeoutRef.current);
        transcriptFallbackTimeoutRef.current = null;
      }
      if (generateTimeoutRef.current) {
        clearTimeout(generateTimeoutRef.current);
        generateTimeoutRef.current = null;
      }
      if (generateAbortControllerRef.current) {
        generateAbortControllerRef.current.abort();
        generateAbortControllerRef.current = null;
      }
      // Clean up subscription when component unmounts
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
      // Stop media stream on unmount (full cleanup)
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
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
