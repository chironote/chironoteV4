import React, { useState, useRef, useCallback, useEffect } from 'react';
import { getCurrentUser,fetchAuthSession } from 'aws-amplify/auth';

function RecordingManager({ onTextStreamUpdate }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const mediaRecorderRef = useRef(null);
  const recordingIntervalRef = useRef(null);
  const timeStampRef = useRef(null);
  const [textStream, setTextStream] = useState('');

  const isRecordingRef = useRef(false);
  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

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
      console.log(timeStampRef.current);

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
        }),
      });
      
      if (!response.ok) {
        console.error(`HTTP error! status: ${response.status}`);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let chunk;
      while (true) {
        chunk = await reader.read();
        const text = decoder.decode(chunk.value, { stream: !chunk.done });
        const formattedText = text.replace(/\n/g, '<br>');
        setTextStream((prev) => {
          const newText = prev + formattedText;
          onTextStreamUpdate(newText);
          return newText;
        }); 

        if (chunk.done) {
          break;
        } 
      }
    } catch (error) {
      console.error("Streaming error:", error);
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
    }
  };
// The 2nd highest level recorder function
  const setupRecorder = async () => {
    try {
      setTextStream('');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);

      mediaRecorderRef.current.ondataavailable = async (event) => {
        console.log("=============== isRecording", isRecording);
        console.log("=============== isRecordingRef", isRecordingRef.current);
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

      recordingIntervalRef.current = setInterval(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
          mediaRecorderRef.current.stop();
          mediaRecorderRef.current.start();
        }
      }, 5000);
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
      }, 5000);
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

  //function to get access token
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
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    textStream
  };
}

export default RecordingManager;