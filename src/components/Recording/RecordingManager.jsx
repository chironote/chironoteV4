import React, { useState, useRef, useCallback, useEffect } from 'react';
import { getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';
import { uploadData } from 'aws-amplify/storage';
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs"; 
import NoSleep from 'nosleep.js';
import { generateClient } from 'aws-amplify/api';
import * as subscriptions from '../../graphql/subscriptions';

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
  const streamRef = useRef(null); // Persist media stream for Safari permission

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
        console.log('Received data from notes subscription:', data);
        const updatedNote = data.onUpdateNotesByOwner;
        
        // Check if this is the note we're waiting for
        if (updatedNote.timestamp && updatedNote.timestamp.toString() === timestamp.toString()) {
          console.log('Found matching note:', updatedNote);
          
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
    
    // Clear any existing clipboard content before streaming new note
    // This prevents old notes from briefly appearing when popup closes
    onTextStreamUpdate('');
    
    // Safety timeout: auto-exit "Generating Note" after 4 minutes if streaming doesn't start
    generateTimeoutRef.current = setTimeout(() => {
      console.warn('Generating Note timeout (2 minutes) - closing spinner and returning to main app');
      setIsGeneratingSummary(false);
      setIsPreparingTranscript(false);
      onTransitionToMainApp();
      if (noSleepRef.current) {
        noSleepRef.current.disable();
      }
    }, 120000);
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
      setIsRecording(false);
      isRecordingRef.current = false;
      setIsPaused(false);
      isPausedRef.current = false;
      mediaRecorderRef.current.stop();
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      // Don't stop stream tracks - keep alive for Safari permission persistence
      // mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
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
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
      
      // Don't stop stream tracks - keep alive for Safari permission persistence
      // mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      mediaRecorderRef.current = null;
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
  
      mediaRecorderRef.current.ondataavailable = async (event) => {
        if (isDiscardingRef.current) {
          return;
        }
        
        if (event.data.size > 0 && !isRecordingRef.current) {
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
      console.error('Error accessing microphone', error);
    }
  };

  const startRecording = async () => {
    // Reset the chunk counter when starting a new recording
    lastUploadedChunkRef.current = 0;
    
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
      
      mediaRecorderRef.current.start();
      
      if (noSleepRef.current) {
        noSleepRef.current.enable();
      }

      recordingIntervalRef.current = setInterval(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
          mediaRecorderRef.current.stop();
          mediaRecorderRef.current.start();
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
          mediaRecorderRef.current.stop();
          mediaRecorderRef.current.start();
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