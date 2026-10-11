import React, { useState, useEffect } from 'react';
import './Recording.css';
import { generateClient } from 'aws-amplify/api';
import { getCurrentUser, fetchAuthSession  } from 'aws-amplify/auth';
import * as queries from '../../graphql/queries';
import CreditPopup from './CreditLimit';
import PatientCapturePicker from '../Patients/PatientCapturePicker';
import { patientCaptureEnabled, localDate } from '../../services/patientNotes';
import ConfirmationPopup from './ConfirmationPopup';
import { trackRecordingStart } from '../../utils/analytics';

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
  discardRecording,
  pauseRecording, 
  resumeRecording,
}) {
  const [userSubscription, setUserSubscription] = useState(null);
  const [visitMetadata, setVisitMetadata] = useState({ dateOfService: localDate(), visitType: null, contextMode: 'patient' });
  const [showCreditPopup, setShowCreditPopup] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const [noteSettings, setNoteSettings] = useState(() => {
    const storedSettings = localStorage.getItem('noteSettings');
    return storedSettings ? JSON.parse(storedSettings) : {
      examLayout: false,
      PILayout: false
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
      await fetchAuthSession({ forceRefresh: true });
    } catch (err) {
      console.log(err);
    }
  };

  const handleStartRecording = async () => {
    try {
      // Track the start recording action
      trackRecordingStart();
      
      // CRITICAL: Start recording FIRST (synchronously in user gesture)
      // Safari blocks getUserMedia() if called after async operations
      if (patientCaptureEnabled) {
        // RecordingManager snapshots these settings synchronously at capture start.
        const examLayout = Boolean(visitMetadata.patientName) || visitMetadata.visitType === 'reExam';
        localStorage.setItem('noteSettings', JSON.stringify({ ...noteSettings, examLayout }));
      }
      startRecording(patientCaptureEnabled ? { ...visitMetadata, contextMode: 'patient' } : undefined);
      
      // Check user subscription AFTER starting (async is OK now)
      const subscription = await fetchUserSubscription();
      
      if (!subscription || subscription.hoursleft <= 0) {
        console.error('User has no remaining hours');
        // Cancel without uploading the recording we just started.
        discardRecording();
        setShowCreditPopup(true);
        return;
      }
    } catch (error) {
      console.error("Error in handleStartRecording:", error);
      // Cancel without uploading when subscription validation fails.
      discardRecording();
    }
  };

  // Function for refreshing the auth session
  useEffect(() => {
    currentSession();
  }, []);


  useEffect(() => {
    localStorage.setItem('noteSettings', JSON.stringify(noteSettings));
    console.log('Note settings changed. localStorage noteSettings:', localStorage.getItem('noteSettings'));
  }, [noteSettings]);

  // Keyboard event listener for Esc key during active recording
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && isRecording) {
        event.preventDefault();
        setShowConfirmation(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isRecording]);

  const handleCancelRecording = () => {
    setShowConfirmation(true);
  };

  const handleOuterClick = () => {
    // Remove previous cancellation logic - only close if not in any active state
    if (!isRecording && !isPreparingTranscript && !isGeneratingSummary) {
      toggleRecordingPopup();
    }
  };

  const handleConfirmDiscard = () => {
    setShowConfirmation(false);
    if (isRecording) {
      discardRecording();
    }
    toggleRecordingPopup();
  };

  const handleCancelDiscard = () => {
    setShowConfirmation(false);
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
      <div className="recording-dialog" role="dialog" aria-modal="true" aria-label="Recording" onClick={(e) => e.stopPropagation()}>
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
            <h2>Recording Settings</h2>
            <div className="settings-container">
              {patientCaptureEnabled ? <PatientCapturePicker value={visitMetadata} onChange={setVisitMetadata} /> : <p>Language is detected automatically.</p>}

              <div className="settings-options">
                <label className="options-label">Options:</label>
                <div className="checkbox-grid">
                  {!patientCaptureEnabled && <div className="checkbox-group">
                    <input 
                      type="checkbox" 
                      id="exam-layout-popup" 
                      name="examLayout" 
                      checked={noteSettings.examLayout}
                      onChange={handleCheckboxChange}
                    />
                    <label htmlFor="exam-layout-popup">Exam Layout</label>
                  </div>}
                  {patientCaptureEnabled && visitMetadata.patientId && !visitMetadata.patientName && <div className="checkbox-group">
                    <input type="checkbox" id="re-exam-popup" checked={visitMetadata.visitType === 'reExam'}
                      onChange={event => setVisitMetadata(current => ({ ...current, visitType: event.target.checked ? 'reExam' : 'followUp' }))} />
                    <label htmlFor="re-exam-popup">Re-Exam</label>
                  </div>}
                  <div className="checkbox-group">
                    <input 
                      type="checkbox" 
                      id="pi-layout-popup" 
                      name="PILayout" 
                      checked={noteSettings.PILayout}
                      onChange={handleCheckboxChange}
                    />
                    <label htmlFor="pi-layout-popup">
                      <span className="desktop-label">Personal Injury Case</span>
                      <span className="mobile-label">PI Case</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="button-container">
              <button 
                className="recording-start-button"
                onClick={handleStartRecording}
              >
                Start Recording
              </button>
              <button 
                className="close-button"
                onClick={() => toggleRecordingPopup()}
              >
                Back
              </button>
            </div>
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
            <button 
              className="close-x-button"
              onClick={handleCancelRecording}
              aria-label="Cancel recording"
            >
              ×
            </button>
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
