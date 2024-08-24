import React, { useState, useEffect, useRef } from 'react';
import './Recording.css';
import dictateIcon from '../../assets/mic.svg';
import { getCurrentUser } from 'aws-amplify/auth'; // Add this import

function Recording({ toggleRecordingPopup, recordingType }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const mediaRecorderRef = useRef(null);
  const recordingIntervalRef = useRef(null);

  useEffect(() => {
    const setupRecorder = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream);


        mediaRecorderRef.current.ondataavailable = (event) => {
          if (event.data.size > 0) {
            
            uploadAudioChunk(event.data);
  
          }
        };
      } catch (error) {
        console.error('Error accessing microphone', error);
      }
    };

    setupRecorder();

    return () => {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, []);

  const startRecording = () => {
    if (mediaRecorderRef.current) {
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

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsPaused(true);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && isPaused) {
      mediaRecorderRef.current.start();
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

  const uploadAudioChunk = async (audioBlob) => {
    try {
      const userId = await getUserId();

      if (!userId) {
        throw new Error('User not authenticated');
      }

      const url = new URL('https://b3zbyutddodkryfsulofjlkwzi0zyqxq.lambda-url.us-west-2.on.aws');
      url.searchParams.append('userId', userId);

      const response = await fetch(url.toString(), {
        method: 'POST',
        body: audioBlob,
        headers: {
          'Content-Type': 'audio/webm',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Lambda response:', data);
    } catch (error) {
      console.error('Error sending audio to Lambda:', error);
    }
  };

  // Close popup when clicking outside if not recording
  const handleOuterClick = () => {
    if (!isRecording) {
      toggleRecordingPopup();
    }
  };

  return (
    <div className="create-note-popup" onClick={handleOuterClick}>
      <div className="popup-content" onClick={(e) => e.stopPropagation()}>
        {!isRecording ? (
          <>
            {/* Header and recording start button */}
            <h2>Create New Note</h2>
            <button className="start-recording-btn" onClick={startRecording}>
              <img src={dictateIcon} alt="Start Recording" />
              Start Recording
            </button>

            {/* Language selection */}
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

            {/* Settings options */}
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

            {/* Close button */}
            <button className="close-btn" onClick={() => toggleRecordingPopup()}>Close</button>
          </>
        ) : (
          <div className="recording-content">
            <div className="recording-container">
              {/* Sound bar visualization */}
              {[...Array(5)].map((_, index) => (
                <div key={index}
                  style={{ 'animation-delay': `${index * 0.2}s` }}
                  className={`sound-bar ${isPaused ? 'paused' : ''}`}
                ></div>
              ))}
            </div>
            <div className="recording-controls">
              {/* Stop and pause/resume recording buttons */}
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