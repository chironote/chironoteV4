import React, { useState, useRef, useCallback, useEffect } from 'react';
import { getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';
import { uploadData } from 'aws-amplify/storage';
import NoSleep from 'nosleep.js';
import RecordRTC from 'recordrtc';

function RecordingManager({ onTextStreamUpdate, onTransitionToMainApp }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isPreparingTranscript, setIsPreparingTranscript] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const mediaRecorderRef = useRef(null);
  const recordingIntervalRef = useRef(null);
  const timeStampRef = useRef(null); // Conversation identifier timestamp
  const pathStampRef = useRef(null); // For uniquely identifying file paths
  const filePathRef = useRef(null); // Add a ref to store the file path
  const lastUploadedChunkRef = useRef(0); // Track chunk number for unique paths
  const [textStream, setTextStream] = useState('');
  const noSleepRef = useRef(null);
  const isRecordingRef = useRef(false);
  const isPausedRef = useRef(false);
  const currentBlobRef = useRef(null); // Add a ref to store the current blob

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

  const uploadS3 = async (audioBlob, filePath) => {
    // Use provided filePath instead of generating it here to prevent race conditions
    const timestamp = timeStampRef.current; // Conversation identifier
    const pathstamp = pathStampRef.current; // Unique path identifier
    const userId = await getUserId();

    // If path isn't provided, create one with pathstamp and chunk number
    const filename = filePath || `public/${userId}/${timestamp}_recording_${pathstamp}_${lastUploadedChunkRef.current++}.webm`;

    // Store the last used path in the ref
    filePathRef.current = filename;

    try {
      // First upload to S3
      const uploadResult = await uploadData({
        path: filename,
        data: audioBlob,
        options: {
          contentType: 'audio/webm',
          metadata: {
            timestamp: timestamp.toString(),
            userId: userId
          }
        }
      }).result;

      console.log(`Successfully uploaded to: ${filename}`, uploadResult);

      // Then notify Lambda about the upload
      const selectedLanguage = localStorage.getItem('selectedLanguage');
      const url = new URL('https://qush6yocc25lxrp4s7vexgd7ra0qdylu.lambda-url.us-east-2.on.aws');
      const response = await fetch(url.toString(), {
        method: 'POST',
        body: JSON.stringify({
          userId,
          timestamp,
          path: filename,
          language: selectedLanguage === 'null' ? null : selectedLanguage
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error notifying Lambda about S3 upload:', errorData.message);
      } else {
        const data = await response.json();
        console.log('Lambda notification response:', data);
      }

      return uploadResult;
    } catch (error) {
      console.error('Error uploading audio to S3:', error);
      throw error;
    }
  };

  const streamResponse = async () => {
    setIsGeneratingSummary(true);
    setIsPreparingTranscript(false);
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
      setIsGeneratingSummary(false);
      if (noSleepRef.current) {
        noSleepRef.current.disable();
      }
      
      // Call the callback to transition back to the main app
      if (onTransitionToMainApp) {
        onTransitionToMainApp();
      }
    }
  };

  const setupRecorder = async () => {
    try {
      setTextStream('');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1, // Mono instead of stereo
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        }
      });

      const uaString = navigator.userAgent.toLowerCase();
      let mimeType;
      if (/iphone|ipad/i.test(uaString)) {
        mimeType = "video/mp4"; // iPhone friendly mime type
      } else {
        mimeType = "audio/webm;codecs=pcm"; // webm and specify codec
      }

      // Create RecordRTC instance
      const recorder = new RecordRTC(stream, {
        type: 'audio',
        mimeType: mimeType,
        recorderType: RecordRTC.StereoAudioRecorder,
        numberOfAudioChannels: 1, // Mono instead of stereo
        desiredSampRate: 16000,
        disableLogs: false,
      });
      
      // Store the original stream on the recorder for later cleanup
      recorder.stream = stream;
      
      mediaRecorderRef.current = recorder;
    } catch (error) {
      console.error('Error accessing microphone', error);
    }
  };

  const startRecording = async () => {
    // Reset the chunk counter when starting a new recording
    currentBlobRef.current = null;
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

      // Start RecordRTC recording
      mediaRecorderRef.current.startRecording();

      if (noSleepRef.current) {
        noSleepRef.current.enable();
      }

      // Use the same interval to periodically stop and restart recording
      // This creates chunks of audio similar to the MediaRecorder implementation
      recordingIntervalRef.current = setInterval(() => {
        if (mediaRecorderRef.current && isRecordingRef.current && !isPausedRef.current) {
          // Stop the current recording
          const currentRecorder = mediaRecorderRef.current;

          currentRecorder.stopRecording(() => {
            // Get the blob and verify it's a valid blob
            const rawBlob = currentRecorder.getBlob();
            console.log('Raw blob type:', typeof rawBlob, 'Size:', rawBlob.size, 'MIME:', rawBlob.type);
            
            // Force the correct type and create a new blob
            currentBlobRef.current = new Blob([rawBlob], { type: 'audio/webm' });
            console.log('New blob size:', currentBlobRef.current.size, 'MIME:', currentBlobRef.current.type);

            // Process the intermediate chunk
            if (currentBlobRef.current && currentBlobRef.current.size > 0) {
              // This is handled like a non-final ondataavailable event
              (async () => {
                const userId = await getUserId();
                const timestamp = timeStampRef.current;
                const pathstamp = pathStampRef.current;
                const chunkPath = `public/${userId}/${timestamp}_recording_chunk_${pathstamp}_${lastUploadedChunkRef.current++}.webm`;

                // Upload the chunk using the stored blob
                uploadS3(currentBlobRef.current, chunkPath);
              })();
            }

            // Start a new recording session if we're still recording
            if (isRecordingRef.current && !isPausedRef.current) {
              // Create a new recorder with the same stream to avoid issues
              const stream = currentRecorder.stream;
              
              // Create a new RecordRTC instance with the existing stream
              const newRecorder = new RecordRTC(stream, {
                type: 'audio',
                mimeType: 'audio/webm;codecs=pcm',
                recorderType: RecordRTC.StereoAudioRecorder,
                numberOfAudioChannels: 1, // Mono instead of stereo
                desiredSampRate: 16000,
                disableLogs: false,
              });
              
              // Store the stream reference
              newRecorder.stream = stream;
              
              // Replace the old recorder
              mediaRecorderRef.current = newRecorder;
              
              // Start the new recorder
              mediaRecorderRef.current.startRecording();
            }
          });
        }
      }, 300000); // 5 min
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecordingRef.current) {
      mediaRecorderRef.current.pauseRecording();
      setIsPaused(true);
      isPausedRef.current = true;
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && isPausedRef.current) {
      // Get the existing stream
      const stream = mediaRecorderRef.current.stream;
      
      // Create a new RecordRTC instance with the existing stream
      const newRecorder = new RecordRTC(stream, {
        type: 'audio',
        mimeType: 'audio/webm;codecs=pcm', // Force webm format
        recorderType: RecordRTC.StereoAudioRecorder,
        numberOfAudioChannels: 1,
        desiredSampRate: 16000,
        disableLogs: false,
      });
      
      // Store the stream reference
      newRecorder.stream = stream;
      
      // Replace the old recorder
      mediaRecorderRef.current = newRecorder;
      
      // Start the new recorder
      mediaRecorderRef.current.startRecording();
      
      setIsPaused(false);
      isPausedRef.current = false;

      recordingIntervalRef.current = setInterval(() => {
        if (mediaRecorderRef.current && isRecordingRef.current && !isPausedRef.current) {
          // Stop the current recording
          const currentRecorder = mediaRecorderRef.current;

          currentRecorder.stopRecording(() => {
            // Get the blob and verify it's a valid blob
            const rawBlob = currentRecorder.getBlob();
            console.log('Resume - Raw blob type:', typeof rawBlob, 'Size:', rawBlob.size, 'MIME:', rawBlob.type);
            
            // Force the correct type and create a new blob
            currentBlobRef.current = new Blob([rawBlob], { type: 'audio/webm' });
            console.log('Resume - New blob size:', currentBlobRef.current.size, 'MIME:', currentBlobRef.current.type);

            // Process the intermediate chunk
            if (currentBlobRef.current && currentBlobRef.current.size > 0) {
              // This is handled like a non-final ondataavailable event
              (async () => {
                const userId = await getUserId();
                const timestamp = timeStampRef.current;
                const pathstamp = pathStampRef.current;
                const chunkPath = `public/${userId}/${timestamp}_recording_chunk_${pathstamp}_${lastUploadedChunkRef.current++}.webm`;

                // Upload the chunk using the stored blob
                await uploadS3(currentBlobRef.current, chunkPath);
              })();
            }

            // Start a new recording session if we're still recording
            if (isRecordingRef.current && !isPausedRef.current) {
              // Create a new recorder with the same stream to avoid issues
              const stream = currentRecorder.stream;
              
              // Create a new RecordRTC instance with the existing stream
              const newRecorder = new RecordRTC(stream, {
                type: 'audio',
                mimeType: 'audio/webm;codecs=pcm',
                recorderType: RecordRTC.StereoAudioRecorder,
                numberOfAudioChannels: 1,
                desiredSampRate: 16000,
                disableLogs: false,
              });
              
              // Store the stream reference
              newRecorder.stream = stream;
              
              // Replace the old recorder
              mediaRecorderRef.current = newRecorder;
              
              // Start the new recorder
              mediaRecorderRef.current.startRecording();
            }
          });
        }
      }, 300000);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      // Set recording states to false BEFORE stopping to signal this is the final chunk
      setIsRecording(false);
      isRecordingRef.current = false;
      setIsPaused(false);
      isPausedRef.current = false;
      
      // Set isPreparingTranscript to true BEFORE clearing the interval
      // This ensures the UI shows the preparing state immediately
      setIsPreparingTranscript(true);

      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }

      // Stop recording and process final blob
      mediaRecorderRef.current.stopRecording(async () => {
        // Get the blob and verify it's a valid blob
        const rawBlob = mediaRecorderRef.current.getBlob();
        console.log('Stop - Raw blob type:', typeof rawBlob, 'Size:', rawBlob.size, 'MIME:', rawBlob.type);
        
        // Force the correct type and create a new blob
        currentBlobRef.current = new Blob([rawBlob], { type: 'audio/webm' });
        console.log('Stop - New blob size:', currentBlobRef.current.size, 'MIME:', currentBlobRef.current.type);

        if (currentBlobRef.current && currentBlobRef.current.size > 0) {
          // This is the final chunk when recording stops
          const userId = await getUserId();
          const timestamp = timeStampRef.current;
          const pathstamp = pathStampRef.current;
          const finalPath = `public/${userId}/${timestamp}_recording_final_${pathstamp}_${lastUploadedChunkRef.current++}.webm`;

          // AWAIT the final upload to prevent race conditions
          await uploadS3(currentBlobRef.current, finalPath);

          // Clean up stream tracks
          if (mediaRecorderRef.current && mediaRecorderRef.current.stream) {
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
          }

          mediaRecorderRef.current = null;
          
          // We already set isPreparingTranscript to true above, so we don't need to set it again here

          // Now that the final upload is complete, call streamResponse
          streamResponse();
        }
      });
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
    };
  }, []);

  return {
    isRecording,
    isPaused,
    isPreparingTranscript,
    isGeneratingSummary,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    textStream,
    isProcessing: isRecording || isPreparingTranscript || isGeneratingSummary
  };
}

export default RecordingManager;
