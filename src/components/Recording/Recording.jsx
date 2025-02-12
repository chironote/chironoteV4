import React, { useState, useEffect } from 'react';
import './Recording.css';
import dictateIcon from '../../assets/mic.svg';
import { generateClient } from 'aws-amplify/api';
import { getCurrentUser, fetchAuthSession  } from 'aws-amplify/auth';
import * as queries from '../../graphql/queries';
import CreditPopup from './CreditLimit';
import ConfirmationPopup from './ConfirmationPopup';

const client = generateClient();

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
  const [userSubscription, setUserSubscription] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState('auto');
  const [showCreditPopup, setShowCreditPopup] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const [noteSettings, setNoteSettings] = useState(() => {
    const storedSettings = localStorage.getItem('noteSettings');
    return storedSettings ? JSON.parse(storedSettings) : {
      examLayout: false,
      bulletedLayout: false
    };
  });

  const fetchUserSubscription = async () => {
    try {
      const user = await getCurrentUser();
      const subscriptionData = await client.graphql({
        query: queries.getUserSubscription,
        variables: { owner: user.username }
      });
      setUserSubscription(subscriptionData.data.getUserSubscription);
      return subscriptionData.data.getUserSubscription;
    } catch (error) {
      console.error("Error fetching user subscription:", error);
      return null;
    }
  };

  // Function for refreshing the auth session
  const currentSession = async () => {
    try {
      const { tokens } = await fetchAuthSession({ forceRefresh: true });
      console.log(tokens);
    } catch (err) {
      console.log(err);
    }
  };

  const handleStartRecording = async () => {
    const subscription = await fetchUserSubscription();
    if (!subscription || subscription.hoursleft <= 0) {
      console.error('User has no remaining hours');
      setShowCreditPopup(true);
    } else {
      startRecording();
    }
  };

  // Function for refreshing the auth session
  useEffect(() => {
    currentSession();
  }, []);

  useEffect(() => {
    const languageSelect = document.getElementById('language-select');
    if (languageSelect) {
      const currentLanguage = languageSelect.value;
      setSelectedLanguage(currentLanguage);
      localStorage.setItem('selectedLanguage', currentLanguage);
      console.log('Language set on load:', currentLanguage);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('noteSettings', JSON.stringify(noteSettings));
    console.log('Note settings changed. localStorage noteSettings:', localStorage.getItem('noteSettings'));
  }, [noteSettings]);

  useEffect(() => {
    if (isRecording || isPreparingTranscript) {
      // Push a new state to prevent direct back navigation
      window.history.pushState({ recording: true }, '');
    }
  }, [isRecording, isPreparingTranscript]);

  useEffect(() => {
    const handleBackButton = (event) => {
      if ((isRecording || isPreparingTranscript) && !showConfirmation) {
        event.preventDefault();
        // Push state again to prevent back navigation
        window.history.pushState({ recording: true }, '');
        setShowConfirmation(true);
      }
    };

    const handleBeforeUnload = (event) => {
      if (isRecording || isPreparingTranscript) {
        event.preventDefault();
        event.returnValue = '';
        return '';
      }
    };

    window.addEventListener('popstate', handleBackButton);
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('popstate', handleBackButton);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isRecording, isPreparingTranscript, showConfirmation]);

  const handleOuterClick = () => {
    if (!isRecording && !isPreparingTranscript && !isGeneratingSummary) {
      toggleRecordingPopup();
    } else if (isRecording && !isPreparingTranscript) {
      setShowConfirmation(true);
    }
  };

  const handleConfirmDiscard = () => {
    setShowConfirmation(false);
    if (isRecording) {
      stopRecording();
    }
    toggleRecordingPopup();
  };

  const handleCancelDiscard = () => {
    setShowConfirmation(false);
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

  const handleCloseCreditPopup = () => {
    setShowCreditPopup(false);
    toggleRecordingPopup();
  };

  return (
    <div className="create-note-popup" onClick={handleOuterClick}>
      <div className="popup-content" onClick={(e) => e.stopPropagation()}>
        {showConfirmation && (
          <ConfirmationPopup
            onConfirm={handleConfirmDiscard}
            onCancel={handleCancelDiscard}
          />
        )}
        {showCreditPopup ? (
          <CreditPopup onClose={handleCloseCreditPopup} />
        ) : !isRecording && !isPreparingTranscript && !isGeneratingSummary ? (
          <>
            <h2>Create New Note</h2>
            <button className="start-recording-btn" onClick={handleStartRecording} aria-label="Start recording SOAP chiropractic note">
              <img src={dictateIcon} alt="Start Recording" />
              Start Recording
            </button>

            <label htmlFor="language-select">Language:</label>
            <select 
              id="language-select" 
              className="language-select" 
              value={selectedLanguage}
              onChange={handleLanguageChange}
              aria-label="Select language for SOAP chiropractic note"
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
                    aria-label="Use exam layout for SOAP chiropractic note"
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
                    aria-label="Use bulleted layout for SOAP chiropractic note"
                  />
                  <label htmlFor="bulleted-layout-popup">Bulleted Layout</label>
                </div>
              </div>
            </div>
            <button className="start-recording-btn" onClick={() => toggleRecordingPopup()} aria-label="Close SOAP note recording popup">Close</button>
          </>
        ) : isPreparingTranscript ? (
          <div className="preparing-transcript">
            <h2>Preparing Transcript</h2>
            <div className="loading-spinner" aria-label="Preparing SOAP note transcript"></div>
          </div>
        ) : isGeneratingSummary ? (
          <div className="preparing-transcript">
            <h2>Generating Note</h2>
            <div className="loading-spinner" aria-label="Generating SOAP chiropractic note"></div>
          </div>
        ) : (
          <div className="recording-content">
            <div className="recording-container" aria-label="Audio visualization for SOAP note recording">
              {[...Array(5)].map((_, index) => (
                <div key={index}
                  style={{ 'animationDelay': `${index * 0.2}s` }}
                  className={`sound-bar ${isPaused ? 'paused' : ''}`}
                ></div>
              ))}
            </div>
            <div className="recording-controls">
              <button onClick={handleStopRecording} aria-label="Stop recording SOAP chiropractic note">Stop Recording</button>
              <button onClick={isPaused ? resumeRecording : pauseRecording} aria-label={isPaused ? "Resume recording SOAP chiropractic note" : "Pause recording SOAP chiropractic note"}>
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
