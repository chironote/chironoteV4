import React, { useState, useEffect, useRef } from 'react';
import './Recording.css';
import { generateClient } from 'aws-amplify/api';
import { getCurrentUser, fetchAuthSession  } from 'aws-amplify/auth';
import * as queries from '../../graphql/queries';
import CreditPopup from './CreditLimit';
import PatientCapturePicker from '../Patients/PatientCapturePicker';
import PatientDialog from '../Patients/PatientDialog';
import { patientCaptureEnabled, localDate } from '../../services/patientNotes';
import ConfirmationPopup from './ConfirmationPopup';
import { trackRecordingStart } from '../../utils/analytics';

const client = generateClient();

function Recording({
  toggleRecordingPopup,
  recordingType,
  isRecording,
  isStarting,
  isFinishingRecording,
  isPaused,
  isPreparingTranscript,
  isGeneratingSummary,
  startRecording,
  stopRecording,
  discardRecording,
  pauseRecording,
  resumeRecording,
  prepareNextRecording,
  uploadStatus,
  retryUploads,
  getCaptureSession,
}) {
  const [userSubscription, setUserSubscription] = useState(null);
  const [visitMetadata, setVisitMetadata] = useState({ dateOfService: localDate(), visitType: null, contextMode: 'patient' });
  const [showCreditPopup, setShowCreditPopup] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const patientPickerRef = useRef(null);
  const preparingPatientRef = useRef(false);
  const creditRequestRef = useRef(0);
  useEffect(() => () => { creditRequestRef.current++; }, []);
  const [patientDraft, setPatientDraft] = useState('');
  const [pendingPatient, setPendingPatient] = useState(null);
  const [checkingPatient, setCheckingPatient] = useState(false);

  const [noteSettings, setNoteSettings] = useState(() => {
    const storedSettings = localStorage.getItem('noteSettings');
    const settings = storedSettings ? JSON.parse(storedSettings) : { examLayout: false, PILayout: false };
    const manualExam = localStorage.getItem('unassignedExamLayout');
    return patientCaptureEnabled && manualExam !== null
      ? { ...settings, examLayout: manualExam === 'true' } : settings;
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

  const beginRecording = async (metadata = visitMetadata) => {
    const request = creditRequestRef.current + 1;
    let captureSession;
    const current = () => request === creditRequestRef.current &&
      (!getCaptureSession || getCaptureSession() === captureSession);
    try {
      // Track the start recording action
      trackRecordingStart();

      // CRITICAL: Start recording FIRST (synchronously in user gesture)
      // Safari blocks getUserMedia() if called after async operations
      if (patientCaptureEnabled) {
        // RecordingManager snapshots these settings synchronously at capture start.
        const examLayout = metadata.patientName ? true
          : metadata.patientId ? metadata.visitType === 'reExam' : noteSettings.examLayout;
        localStorage.setItem('noteSettings', JSON.stringify({ ...noteSettings, examLayout }));
      }
      const previousSession = getCaptureSession?.();
      startRecording(patientCaptureEnabled ? { ...metadata, contextMode: 'patient' } : undefined);
      captureSession = getCaptureSession?.();
      // A guarded/no-op Start didn't create a capture. Its credit check must
      // never discard the recording that already owns the microphone.
      if (getCaptureSession && captureSession === previousSession) return;
      creditRequestRef.current = request;

      // Check user subscription AFTER starting (async is OK now)
      const subscription = await fetchUserSubscription();
      if (!subscription || subscription.hoursleft <= 0) {
        const ownsPresentation = current();
        console.error('User has no remaining hours');
        // Preserve credit denial for A, but only cancel A's remaining work.
        // A late result must neither cancel B nor open a popup over B.
        if (captureSession !== undefined || ownsPresentation) discardRecording(captureSession, { creditCheckFailed: true });
        if (ownsPresentation) setShowCreditPopup(true);
        return;
      }
    } catch (error) {
      if (!current()) return;
      console.error("Error in handleStartRecording:", error);
      // Cancel without uploading when subscription validation fails.
      discardRecording(captureSession);
    }
  };

  const handleStartRecording = async () => {
    if (preparingPatientRef.current) return;
    if (patientCaptureEnabled && !visitMetadata.patientId && patientDraft) {
      preparingPatientRef.current = true;
      setCheckingPatient(true);
      try {
        const patient = await patientPickerRef.current?.prepareNewPatient();
        if (patient) setPendingPatient(patient);
      } finally {
        preparingPatientRef.current = false;
        setCheckingPatient(false);
      }
      return;
    }
    beginRecording();
  };

  const confirmNewPatient = () => {
    setVisitMetadata(pendingPatient);
    setPendingPatient(null);
    // Start microphone access directly from this confirmation click (Safari).
    beginRecording(pendingPatient);
  };

  const startUnassigned = () => {
    const metadata = { ...visitMetadata, patientId: null, patientName: undefined, displayName: '', dateOfInjury: null, visitType: null, initialExam: false, contextMode: 'patient' };
    setVisitMetadata(metadata);
    setPendingPatient(null);
    beginRecording(metadata);
  };

  // Function for refreshing the auth session
  useEffect(() => {
    currentSession();
  }, []);


  useEffect(() => {
    localStorage.setItem('noteSettings', JSON.stringify(noteSettings));
    // Preserve manual intent across remounts even when capture writes forced settings.
    if (patientCaptureEnabled) localStorage.setItem('unassignedExamLayout', String(noteSettings.examLayout));
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
      if (!pendingPatient && !checkingPatient) toggleRecordingPopup();
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
        {uploadStatus?.blocked > 0 && <p role="alert">
          An audio submission needs attention. Check your connection and recording account, then retry. Keep the app open.
          {' '}<button type="button" onClick={retryUploads}>Retry audio submission</button>
        </p>}
        {showConfirmation && (
          <ConfirmationPopup
            onConfirm={handleConfirmDiscard}
            onCancel={handleCancelDiscard}
          />
        )}
        {pendingPatient && <PatientDialog title="Create new patient?" className="recording-patient-confirmation" onClose={() => setPendingPatient(null)}
          footer={<><button type="button" className="recording-unassigned-button" onClick={startUnassigned}>Record without a patient</button><button type="button" className="recording-start-button" onClick={confirmNewPatient}>Create patient & record</button></>}>
          <p className="recording-patient-prompt"><strong>{pendingPatient.patientName}</strong></p>
          <p className="recording-patient-explanation">Create a new patient with this name, or record without linking it to a patient.</p>
        </PatientDialog>}
        {showCreditPopup ? (
          <CreditPopup onClose={handleCloseCreditPopup} />
        ) : !isRecording && !isPreparingTranscript && !isGeneratingSummary ? (
          <>
            <h2>Recording Settings</h2>
            <div className="settings-container">
              {patientCaptureEnabled ? <PatientCapturePicker ref={patientPickerRef} value={visitMetadata} onChange={setVisitMetadata} onDraftChange={setPatientDraft} /> : <p>Language is detected automatically.</p>}

              <div className="settings-options">
                <label className="options-label">Options:</label>
                <div className="checkbox-grid">
                  {(!patientCaptureEnabled || !visitMetadata.patientId || visitMetadata.patientName) && <div className={`checkbox-group${patientCaptureEnabled && visitMetadata.patientName ? ' checkbox-group-disabled' : ''}`}>
                    <input
                      type="checkbox"
                      id="exam-layout-popup"
                      name="examLayout"
                      checked={patientCaptureEnabled && visitMetadata.patientName ? true : noteSettings.examLayout}
                      disabled={patientCaptureEnabled && Boolean(visitMetadata.patientName)}
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
                disabled={checkingPatient || isStarting || isFinishingRecording}
              >
                {checkingPatient ? 'Checking patient…' : isFinishingRecording ? 'Finishing previous recording…' : isStarting ? 'Starting recording…' : 'Start Recording'}
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
            <button type="button" onClick={prepareNextRecording}>Record next appointment</button>
          </div>
        ) : isGeneratingSummary ? (
          <div className="preparing-transcript">
            <h2>Generating Note</h2>
            <div className="loading-spinner" aria-label="Generating SOAP chiropractic note"></div>
            <button type="button" onClick={prepareNextRecording}>Record next appointment</button>
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
