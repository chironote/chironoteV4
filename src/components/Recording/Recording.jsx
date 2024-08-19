import React, { useState, useEffect } from 'react';
import './Recording.css';
import dictateIcon from '../../assets/mic.svg';

function Recording({ toggleRecordingPopup, recordingType }) {
  const [isRecording, setIsRecording] = useState(recordingType === 'dictation_recording');
  const [isPaused, setIsPaused] = useState(false);

  // Sync recording state with recordingType prop
  useEffect(() => {
    setIsRecording(recordingType === 'dictation_recording');
  }, [recordingType]);

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
            <button className="start-recording-btn" onClick={() => setIsRecording(true)}>
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
              <button onClick={() => toggleRecordingPopup()}>Stop Recording</button>
              <button onClick={() => setIsPaused(!isPaused)}>
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