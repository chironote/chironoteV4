import React, { useState, useRef, useCallback, useEffect } from 'react';
import { getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';
import NoSleep from 'nosleep.js';

function RecordingManager({ onTextStreamUpdate, onTransitionToMainApp }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isPreparingTranscript, setIsPreparingTranscript] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const mediaRecorderRef = useRef(null);
  const recordingIntervalRef = useRef(null);
  const timeStampRef = useRef(null);
  const [textStream, setTextStream] = useState('');
  const noSleepRef = useRef(null);

  const isRecordingRef = useRef(false);
  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

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

      const url = new URL('https://jl6rxdp4o3akmpye3ex3q2qlkq0zfyjf.lambda-url.us-east-2.on.aws');
      url.searchParams.append('userId', userId);
      url.searchParams.append('timeStamp', timeStampRef.current);
      url.searchParams.append('language', localStorage.getItem('selectedLanguage'));

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
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      setIsRecording(false);
      setIsPaused(false);
      mediaRecorderRef.current.stop();
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      mediaRecorderRef.current = null;
      if (noSleepRef.current) {
        noSleepRef.current.disable();
      }
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
      alert(uaString);

  
      let options;
      if (/iphone|ipad/i.test(uaString)) {
        options = { mimeType: "video/mp4" }; // iPhone friendly mime type
      } else {
        options = { mimeType: "audio/webm; codecs=\"opus\"" }; // webm and specify codec
      }

      mediaRecorderRef.current = new MediaRecorder(stream, options);
  
      mediaRecorderRef.current.ondataavailable = async (event) => {
        if (event.data.size > 0 && !isRecordingRef.current) {
          await uploadAudioChunk(event.data);
          streamResponse();
        } else if (event.data.size > 0) {
          uploadAudioChunk(event.data);
        }
      };
    } catch (error) {
      console.error('Error accessing microphone', error);
    }
  };

  const startRecording = async () => {
    await setupRecorder();
    if (mediaRecorderRef.current) {
      timeStampRef.current = Date.now();
      setIsRecording(true);
      setIsPaused(false);
      mediaRecorderRef.current.start();
      if (noSleepRef.current) {
        noSleepRef.current.enable();
      }

      recordingIntervalRef.current = setInterval(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
          mediaRecorderRef.current.stop();
          mediaRecorderRef.current.start();
        }
      }, 50000);
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);

      recordingIntervalRef.current = setInterval(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
          mediaRecorderRef.current.stop();
          mediaRecorderRef.current.start();
        }
      }, 50000);
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
      if (noSleepRef.current) {
        noSleepRef.current.disable();
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
    pauseRecording,
    resumeRecording,
    textStream
  };
}

export default RecordingManager;