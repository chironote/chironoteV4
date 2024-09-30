import React, { useState, useEffect } from 'react';
import './Recording.css';
import dictateIcon from '../../assets/mic.svg';

function Recording({ 
  toggleRecordingPopup, 
  recordingType, 
  isRecording, 
  isPaused,
  isPreparingTranscript,
  isGeneratingSummary,
  startRecording, 
  stopRecording, 
  pauseRecording, 
  resumeRecording,
}) {
  const [selectedLanguage, setSelectedLanguage] = useState('auto');

  const [noteSettings, setNoteSettings] = useState(() => {
    const storedSettings = localStorage.getItem('noteSettings');
    return storedSettings ? JSON.parse(storedSettings) : {
      examLayout: false,
      bulletedLayout: false
    };
  });

  useEffect(() => {
    // Read the current value from the scroll menu and set it in localStorage
    const languageSelect = document.getElementById('language-select');
    if (languageSelect) {
      const currentLanguage = languageSelect.value;
      setSelectedLanguage(currentLanguage);
      localStorage.setItem('selectedLanguage', currentLanguage);
      console.log('Language set on load:', currentLanguage);
    }
  }, []); // Empty dependency array ensures this runs only once on component mount

  useEffect(() => {
    localStorage.setItem('noteSettings', JSON.stringify(noteSettings));
    console.log('Note settings changed. localStorage noteSettings:', localStorage.getItem('noteSettings'));
  }, [noteSettings]);

  const handleOuterClick = () => {
    if (!isRecording && !isPreparingTranscript && !isGeneratingSummary) {
      toggleRecordingPopup();
    }
  };

  const handleLanguageChange = (event) => {
    const newLanguage = event.target.value;
    setSelectedLanguage(newLanguage);
    localStorage.setItem('selectedLanguage', newLanguage);
    console.log('Language changed. localStorage selectedLanguage:', localStorage.getItem('selectedLanguage'));
  };

  const handleCheckboxChange = (event) => {
    const { name, checked } = event.target;
    setNoteSettings(prevSettings => ({
      ...prevSettings,
      [name]: checked
    }));
  };

  const handleStopRecording = () => {
    stopRecording();
  };

  return (
    <div className="create-note-popup" onClick={handleOuterClick}>
      <div className="popup-content" onClick={(e) => e.stopPropagation()}>
        {!isRecording && !isPreparingTranscript && !isGeneratingSummary ? (
          <>
            <h2>Create New Note</h2>
            <button className="start-recording-btn" onClick={startRecording}>
              <img src={dictateIcon} alt="Start Recording" />
              Start Recording
            </button>

            <label htmlFor="language-select">Language:</label>
            <select 
              id="language-select" 
              className="language-select" 
              value={selectedLanguage}
              onChange={handleLanguageChange}
            >
              <option value="auto">Auto</option>
              <option value="en_us">English</option>
              <option value="es">Spanish</option>
              <option value="zh">Chinese (Simplified)</option>
              <option value="sk">Korean</option>
              <option value="vi">Vietnamese</option>
              <option value="ru">Russian</option>
            </select>

            <div className="settings-options">
              <div className="checkbox-grid">
                <div className="checkbox-group">
                  <input 
                    type="checkbox" 
                    id="exam-layout-popup" 
                    name="examLayout" 
                    checked={noteSettings.examLayout}
                    onChange={handleCheckboxChange}
                  />
                  <label htmlFor="exam-layout-popup">Exam Layout</label>
                </div>
                <div className="checkbox-group">
                  <input 
                    type="checkbox" 
                    id="bulleted-layout-popup" 
                    name="bulletedLayout" 
                    checked={noteSettings.bulletedLayout}
                    onChange={handleCheckboxChange}
                  />
                  <label htmlFor="bulleted-layout-popup">Bulleted Layout</label>
                </div>
              </div>
            </div>
            <button className="start-recording-btn" onClick={() => toggleRecordingPopup()}>Close</button>
          </>
        ) : isPreparingTranscript ? (
          <div className="preparing-transcript">
            <h2>Preparing Transcript</h2>
            <div className="loading-spinner"></div>
          </div>
        ) : isGeneratingSummary ? (
          <div className="preparing-transcript">
            <h2>Generating Note</h2>
            <div className="loading-spinner"></div>
          </div>
        ) : (
          <div className="recording-content">
            <div className="recording-container">
              {[...Array(5)].map((_, index) => (
                <div key={index}
                  style={{ 'animationDelay': `${index * 0.2}s` }}
                  className={`sound-bar ${isPaused ? 'paused' : ''}`}
                ></div>
              ))}
            </div>
            <div className="recording-controls">
              <button onClick={handleStopRecording}>Stop Recording</button>
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