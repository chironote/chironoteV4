import React, { useState, useEffect, useRef } from 'react';
import './Recording.css';
import dictateIcon from '../../assets/mic.svg';
import { getCurrentUser } from 'aws-amplify/auth';

function Recording({ toggleRecordingPopup, recordingType }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const mediaRecorderRef = useRef(null);
  const recordingIntervalRef = useRef(null);
  const timeStampRef = useRef(null);
  const [textStream, settextStream] = useState('')

  // Upload audio chunk to Lambda
  const uploadAudioChunk = async (audioBlob) => {
    try {
      const userId = await getUserId();

      if (!userId) {
        console.error('User not authenticated');
        return;
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
        return;
      }

      const data = await response.json();
      console.log('Lambda response:', data);
    } catch (error) {
      console.error('Error sending audio to Lambda:', error);
    }
  };

  const handleOuterClick = () => {
    if (!isRecording) {
      toggleRecordingPopup();
    }
  };

  // Stream response from Lambda
  const streamResponse = async () => {
    try {
      const userId = await getUserId();
      if (!userId) {
        console.error('User not authenticated');
        return;
      }

      const response = await fetch("https://xx3olxpcoay5sicmny45g7c5ay0ugvtm.lambda-url.us-east-2.on.aws", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: userId,
          timeStamp: timeStampRef.current
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
        console.log('Stream:', formattedText);        
        settextStream((prev) => prev + formattedText);

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
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      mediaRecorderRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, []);

  const setupRecorder = async () => {
    try {
      settextStream('');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);

      mediaRecorderRef.current.ondataavailable = async (event) => {
        if (event.data.size > 0 && !isRecording) {
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
      mediaRecorderRef.current.start();
      setIsRecording(true);
      setIsPaused(false);

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
      console.log(userId);
      return userId;
    } catch (err) {
      console.log(err);
      return null;
    }
  }

  

  return (
    <div className="create-note-popup" onClick={handleOuterClick}>
      <div className="popup-content" onClick={(e) => e.stopPropagation()}>
        {!isRecording ? (
          <>
            <h2>Create New Note</h2>
            <button className="start-recording-btn" onClick={startRecording}>
              <img src={dictateIcon} alt="Start Recording" />
              Start Recording
            </button>

            <label htmlFor="language-select">Language:</label>
            <select id="language-select" className="language-select">
              <option value="auto">Auto</option>
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="zh">Chinese (Simplified)</option>
              <option value="sk">Korean</option>
              <option value="vi">Vietnamese</option>
              <option value="ru">Russian</option>
            </select>

            <div className="settings-options">
              <div className="checkbox-grid">
                <div className="checkbox-group">
                  <input type="checkbox" id="exam-layout-popup" name="layout" value="exam" />
                  <label htmlFor="exam-layout-popup">Exam Layout</label>
                </div>
                <div className="checkbox-group">
                  <input type="checkbox" id="bulleted-layout-popup" name="layout" value="bulleted" />
                  <label htmlFor="bulleted-layout-popup">Bulleted Layout</label>
                </div>
                <div className="checkbox-group">
                  <input type="checkbox" id="mva-intro-popup" name="layout" value="mva" />
                  <label htmlFor="mva-intro-popup">MVA Intro</label>
                </div>
                <div className="checkbox-group">
                  <input type="checkbox" id="pi-friendly-popup" name="layout" value="pi" />
                  <label htmlFor="pi-friendly-popup">PI Friendly Mode</label>
                </div>
              </div>
            </div>
            <button className="close-btn" onClick={() => toggleRecordingPopup()}>Close</button>
          </>
        ) : (
          <div className="recording-content">
            <div className="recording-container">
              {[...Array(5)].map((_, index) => (
                <div key={index}
                  style={{ 'animation-delay': `${index * 0.2}s` }}
                  className={`sound-bar ${isPaused ? 'paused' : ''}`}
                ></div>
              ))}
            </div>
            <div className="recording-controls">
              <button onClick={stopRecording}>Stop Recording</button>
              <button onClick={isPaused ? resumeRecording : pauseRecording}>
                {isPaused ? 'Resume' : 'Pause'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Recording;