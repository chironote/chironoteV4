import React, { useState, useRef, useCallback, useEffect } from 'react';
import { getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';
import { uploadData } from 'aws-amplify/storage';
import NoSleep from 'nosleep.js';


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

  const uploadAudioChunk = async (audioBlob) => {
    try {
      const userId = await getUserId();

      if (!userId) {
        console.error('User not authenticated');
        return null;
      }
      const selectedLanguage = localStorage.getItem('selectedLanguage');
      const url = new URL('https://jl6rxdp4o3akmpye3ex3q2qlkq0zfyjf.lambda-url.us-east-2.on.aws');
      url.searchParams.append('userId', userId);
      url.searchParams.append('timeStamp', timeStampRef.current);
      url.searchParams.append('language', selectedLanguage === 'null' ? null : selectedLanguage);
      console.log('Selected language:', selectedLanguage);
   
     

      const response = await fetch(url.toString(), {
        method: 'POST',
        body: audioBlob,
        headers: {
          'Content-Type': 'audio/webm',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error uploading audio chunk:', errorData.message);
        return null;
      }

      const data = await response.json();
      console.log('Lambda response:', data);
    } catch (error) {
      console.error('Error sending audio to Lambda:', error);
      return null;
    }
  };

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
      onTransitionToMainApp(); // Add transition to main app after streaming is complete
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
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      mediaRecorderRef.current = null;
      setIsPreparingTranscript(true);
    }
  };

  const setupRecorder = async () => {
    try {
      setTextStream('');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1, // Mono
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        }
      });
  
      const uaString = navigator.userAgent.toLowerCase();
      let options;
      if (/iphone|ipad/i.test(uaString)) {
        options = { mimeType: "video/mp4" }; // iPhone friendly mime type
      } else {
        options = { mimeType: "audio/webm; codecs=\"pcm\"" }; // webm and specify codec
      }

      mediaRecorderRef.current = new MediaRecorder(stream, options);
  
      mediaRecorderRef.current.ondataavailable = async (event) => {
        if (event.data.size > 0 && !isRecordingRef.current) {
          // This is the final chunk when recording stops
          const userId = await getUserId();
          const timestamp = timeStampRef.current; // Conversation identifier
          const pathstamp = pathStampRef.current; // Unique path identifier
          const finalPath = `public/${userId}/${timestamp}_recording_final_${pathstamp}_${lastUploadedChunkRef.current++}.webm`;
          
          // Always await the upload to prevent race conditions
          await uploadS3(event.data, finalPath);
          streamResponse();
        } else if (event.data.size > 0) {
          // This is an intermediate chunk during recording
          const userId = await getUserId();
          const timestamp = timeStampRef.current; // Conversation identifier
          const pathstamp = pathStampRef.current; // Unique path identifier
          const chunkPath = `public/${userId}/${timestamp}_recording_chunk_${pathstamp}_${lastUploadedChunkRef.current++}.webm`;
          
          // Always await to prevent race conditions
          await uploadS3(event.data, chunkPath);
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
      }, 300000); //was 300000
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
      }, 300000);
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
    textStream
  };
}

export default RecordingManager;