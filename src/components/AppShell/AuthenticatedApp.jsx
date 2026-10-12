import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import Account from '../Account/Account';
import Feedback from '../Feedback/Feedback';
import Navbar from '../Navbar/Navbar';
import Settings from '../Settings/Settings';
import PatientsPage from '../Patients/PatientsPage';
import ClipboardSaveReview from '../Patients/ClipboardSaveReview';
import useDraftGuard from '../Patients/useDraftGuard';
import { leaveDrafts } from '../Patients/draftNavigation';
import useDesktopSave from '../Patients/useDesktopSave';
import useClipboardSave from '../Patients/useClipboardSave';
import { patientNotesEnabled, patientRequest } from '../../services/patientNotes';
import IntroTour from '../IntroTour/IntroTour';
import ErrorBanner from './ErrorBanner';
import Dictation from '../Recording/Dictation';
import RecordingManager from '../Recording/RecordingManager';
import MainWorkspace from './MainWorkspace';
import useNotesHistory from './useNotesHistory';
import usePhoneLayout, { isPhoneLayout } from '../../hooks/usePhoneLayout';
import * as mutations from '../../graphql/mutations';
import { getAmplifyClient } from '../../services/amplifyClient';
import { isNativePlatform, writeClipboardText } from '../../services/nativePlatform';
import { applyDictationText, createDictationInsertion } from '../../utils/dictationInsertion';
import { extractPlainText } from '../../utils/historyGrouping';
import { stripMarkdown } from '../../utils/markdownStripper';
import { SAVED_NOTE_DRAG_TYPE } from '../../utils/savedNoteDrag';

function ClinicalWorkspace({ signOut, user }) {
  const phoneLayout = usePhoneLayout();
  const nativeLayout = isNativePlatform();
  const smartEditorAvailable = !nativeLayout && !phoneLayout;
  const desktopSave = useDesktopSave();
  const navigate = useNavigate();
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [showNotes, setShowNotes] = useState(true);
  const [showEditPanel, setShowEditPanel] = useState(false);
  useEffect(() => {
    if (!smartEditorAvailable) setShowEditPanel(false);
  }, [smartEditorAvailable]);
  const [showRecordingPopup, setShowRecordingPopup] = useState(false);
  const [recordingType, setRecordingType] = useState('');
  const [showDictationPopup, setShowDictationPopup] = useState(false);
  const [showContentPopup, setShowContentPopup] = useState(false);
  const [selectedContent, setSelectedContent] = useState('');
  const [selectedTimestamp, setSelectedTimestamp] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showPopupMenu, setShowPopupMenu] = useState(false);
  const [clipboardContent, setClipboardContent] = useState('');
  const [clipboardTarget, setClipboardTarget] = useState(null);
  const [generationError, setGenerationError] = useState('');
  const [noteStreamActive, setNoteStreamActive] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [showCopyMessage, setShowCopyMessage] = useState(false);
  const [showPopupCopyMessage, setShowPopupCopyMessage] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(window.innerWidth <= 768);
  const [isWebSocketConnecting, setIsWebSocketConnecting] = useState(false);
  const [showErrorBanner] = useState(false);
  const [isMobileOverlayDragOver, setIsMobileOverlayDragOver] = useState(false);
  const [isDictationLoading, setIsDictationLoading] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const clipboardTextareaRef = useRef(null);
  const editTextareaRef = useRef(null);
  const clipboardDictationInsertionRef = useRef(null);
  const editDictationInsertionRef = useRef(null);
  const copyMessageTimeoutRef = useRef(null);
  const mobileOverlayRef = useRef(null);
  const feedbackTriggerRef = useRef(null);
  const savedNoteDropRequestRef = useRef(0);
  useEffect(() => () => { savedNoteDropRequestRef.current += 1; }, []);

  const openFeedback = useCallback((event) => {
    feedbackTriggerRef.current = event?.currentTarget || document.activeElement;
    setIsFeedbackOpen(true);
  }, []);


  const notesHistory = useNotesHistory(user.username, setIsWebSocketConnecting);
  const clipboardDirty = Boolean(clipboardTarget && clipboardContent !== clipboardTarget.note);
  const { setNotes: setHistoryNotes, setTranscripts: setHistoryTranscripts, refreshNotes: refreshSavedHistory } = notesHistory;
  useEffect(() => {
    const deleted = event => {
      const patientId = event.detail?.patientId;
      if (!patientId) return;
      setHistoryNotes(items => items.filter(item => item.patientId !== patientId));
      setHistoryTranscripts(items => items.filter(item => item.patientId !== patientId));
      if (clipboardTarget?.patientId === patientId) {
        setClipboardTarget(null); setClipboardContent(''); setStreamingText(''); setShowEditPanel(false);
      }
      if (selectedItem?.patientId === patientId) {
        setSelectedItem(null); setSelectedContent(''); setShowContentPopup(false);
      }
      refreshSavedHistory();
    };
    window.addEventListener('patient-deleted', deleted);
    return () => window.removeEventListener('patient-deleted', deleted);
  }, [clipboardTarget?.patientId, selectedItem?.patientId, setHistoryNotes, setHistoryTranscripts, refreshSavedHistory]);
  const clipboardSave = useClipboardSave({
    note: clipboardTarget, draft: clipboardContent,
    onSaved: note => { setClipboardTarget(note); setClipboardContent(note.note); setGenerationError(''); notesHistory.refreshNotes(); clipboardGuard.saved(); },
    onCancelReview: () => clipboardGuard.cancel(),
    onError: setGenerationError,
  });
  const clipboardGuard = useDraftGuard({
    dirty: patientNotesEnabled && desktopSave && clipboardDirty,
    busy: clipboardSave.busy,
    save: () => clipboardSave.save(),
    discard: () => setClipboardContent(clipboardTarget?.note || ''),
  });

  const openPatientNote = (note, isCurrent = () => true) => leaveDrafts(() => {
    if (!isCurrent()) return;
    savedNoteDropRequestRef.current += 1;
    setClipboardTarget(note); setClipboardContent(note.note || ''); setGenerationError('');
    setShowContentPopup(false); setShowEditPanel(false); setStreamingText('');
    navigate('/app');
    requestAnimationFrame(() => clipboardTextareaRef.current?.focus());
  });

  const handleSavedNoteDrop = async timestamp => {
    if (clipboardSave.busy || noteStreamActive || isDictationLoading || isTranscribing) return;
    const request = ++savedNoteDropRequestRef.current;
    const isCurrent = () => request === savedNoteDropRequestRef.current;
    try {
      const { note } = await patientRequest('getSavedNote', { timestamp });
      if (!isCurrent()) return;
      if (!note || String(note.timestamp) !== timestamp || typeof note.note !== 'string') throw new Error('Unavailable saved note');
      return await openPatientNote(note, isCurrent);
    } catch {
      if (isCurrent()) setGenerationError('The saved note could not be opened for editing. Please retry.');
    }
  };

  const handleClipboardTextDrop = text => {
    savedNoteDropRequestRef.current += 1;
    setClipboardContent(text);
  };

  const handleTextStreamUpdate = useCallback(async (newText) => {
    const cleanedText = stripMarkdown(newText);
    setStreamingText(cleanedText);
    setClipboardContent(cleanedText);

  }, []);

  const handleTransitionToMainApp = useCallback(() => {
    setShowRecordingPopup(false);
  }, []);

  const recordingManager = RecordingManager({
    onGenerationStateChange: setNoteStreamActive,
    onGenerationError: setGenerationError,
    onSavedNoteReady: (note) => { setClipboardTarget(note); },
    onTextStreamUpdate: handleTextStreamUpdate,
    onTransitionToMainApp: handleTransitionToMainApp
  });

  const captureDictationInsertion = useCallback((textareaRef, insertionRef, content) => {
    const textarea = textareaRef.current;
    const currentText = textarea?.value ?? content;

    insertionRef.current = createDictationInsertion(
      currentText,
      textarea?.selectionStart,
      textarea?.selectionEnd
    );
  }, []);

  const insertDictationText = useCallback((textareaRef, insertionRef, setText, dictatedText) => {
    const textarea = textareaRef.current;
    const insertion = insertionRef.current || createDictationInsertion(
      textarea?.value || '',
      textarea?.value.length,
      textarea?.value.length
    );
    const update = applyDictationText(insertion, dictatedText);

    setText(update.text);

    requestAnimationFrame(() => {
      const currentTextarea = textareaRef.current;
      if (!currentTextarea) return;
      currentTextarea.focus({ preventScroll: true });
      currentTextarea.selectionStart = update.cursor;
      currentTextarea.selectionEnd = update.cursor;
    });
  }, []);

  const resetDictationInsertion = useCallback((insertionRef) => {
    insertionRef.current = null;
  }, []);

  const dictation = Dictation({
    onTextStreamUpdate: handleTextStreamUpdate,
    setClipboardContent,
    onDictationStart: () => captureDictationInsertion(
      clipboardTextareaRef,
      clipboardDictationInsertionRef,
      clipboardContent
    ),
    onDictationTextUpdate: (newText) => insertDictationText(
      clipboardTextareaRef,
      clipboardDictationInsertionRef,
      setClipboardContent,
      newText
    ),
    onDictationStop: () => resetDictationInsertion(clipboardDictationInsertionRef),
    username: user.username,
    instanceName: 'Clipboard'
  });

  const editDictation = Dictation({
    onTextStreamUpdate: (newText) => setEditContent(newText),
    setClipboardContent: setEditContent,
    onDictationStart: () => captureDictationInsertion(
      editTextareaRef,
      editDictationInsertionRef,
      editContent
    ),
    onDictationTextUpdate: (newText) => insertDictationText(
      editTextareaRef,
      editDictationInsertionRef,
      setEditContent,
      newText
    ),
    onDictationStop: () => resetDictationInsertion(editDictationInsertionRef),
    username: user.username,
    instanceName: 'EditPanel'
  });

  useEffect(() => {
    setIsDictationLoading(dictation.isDictationLoading);
    setIsTranscribing(dictation.isTranscribing);
    setIsWebSocketConnecting(dictation.isWebSocketConnecting);
  }, [
    dictation.isDictationLoading,
    dictation.isTranscribing,
    dictation.isWebSocketConnecting
  ]);

  const toggleEditPanel = () => {
    if (isNativePlatform() || isPhoneLayout()) return;
    const screenWidth = window.innerWidth;

    if (screenWidth >= 780 && screenWidth < 1200 && !showEditPanel) {
      setIsCollapsed(true);
    }

    setShowEditPanel(prev => !prev);
    if (!showEditPanel) setEditContent('');
  };

  const toggleRecordingPopup = async (type) => {
    if (!await leaveDrafts()) return;
    if (!recordingManager.isRecording) setClipboardTarget(null);
    if (recordingManager.isRecording) {
      recordingManager.discardRecording();
    } else {
      setRecordingType(type);
      setShowRecordingPopup(prev => !prev);
    }
  };

  const toggleDictationPopup = () => {
    setShowDictationPopup(prev => !prev);
  };

  const toggleContentPopup = async (item) => {
    if (!await leaveDrafts()) return;
    setSelectedItem(item);
    setShowNotes(true);
    setSelectedContent(item.note || '');
    setSelectedTimestamp(item.timestamp);
    setShowContentPopup(prev => !prev);
    setShowPopupMenu(false);
  };

  const handlePatientAssigned = note => {
    setSelectedItem(item => ({ ...item, ...note }));
    if (showNotes) setSelectedContent(note.note || '');
    const replaceNote = items => items.map(item => item.timestamp === note.timestamp ? { ...item, ...note } : item);
    notesHistory.setNotes(replaceNote);
    notesHistory.setTranscripts(replaceNote);
    if (clipboardTarget?.timestamp === note.timestamp && !clipboardDirty) {
      setClipboardTarget(note);
      setClipboardContent(note.note || '');
    }
    notesHistory.refreshNotes();
  };

  const togglePopupMenu = (event) => {
    event.stopPropagation();
    setShowPopupMenu(prev => !prev);
  };

  const handlePopupViewModeChange = (viewMode) => {
    if (!selectedItem) return;

    const isNoteView = viewMode === 'note';
    setShowNotes(isNoteView);
    setSelectedContent(isNoteView ? (selectedItem.note || '') : (selectedItem.transcript || ''));
    setShowPopupMenu(false);
  };

  const togglePanel = () => {
    const screenWidth = window.innerWidth;

    if (screenWidth >= 780 && screenWidth < 1200 && isCollapsed) {
      setShowEditPanel(false);
    }

    setIsCollapsed(!isCollapsed);
  };

  const handleCopy = (isPopupMenu = false) => {
    const contentToCopy = isPopupMenu
      ? selectedContent || clipboardContent
      : clipboardTextareaRef.current?.value || '';
    const plainText = extractPlainText(contentToCopy);

    writeClipboardText(plainText)
      .then(() => {
        setShowPopupMenu(false);
        const setCopyMessage = isPopupMenu ? setShowPopupCopyMessage : setShowCopyMessage;
        setCopyMessage(true);
        if (copyMessageTimeoutRef.current) clearTimeout(copyMessageTimeoutRef.current);
        copyMessageTimeoutRef.current = setTimeout(() => setCopyMessage(false), 1000);
      })
      .catch(() => alert('Failed to copy!'));
  };

  const handleSendToClipboard = async () => {
    if (patientNotesEnabled && showNotes && selectedItem?.timestamp) {
      await handleSavedNoteDrop(String(selectedItem.timestamp));
      return;
    }
    await leaveDrafts(() => {
      savedNoteDropRequestRef.current += 1;
      setClipboardTarget(null); setClipboardContent(extractPlainText(selectedContent));
      setShowPopupMenu(false); setShowContentPopup(false);
    });
  };

  const handleLabelUpdate = async (newLabel) => {
    if (!selectedItem) {
      console.warn('handleLabelUpdate: No selectedItem found');
      return;
    }

    const uniqueId = selectedItem.owner + selectedItem.timestamp;
    const updateLocalLabel = () => {
      if (selectedItem.note && selectedItem.note.trim() !== '') {
        notesHistory.setNotes(prevNotes =>
          prevNotes.map(note =>
            (note.owner + note.timestamp) === uniqueId
              ? { ...note, noteLabel: newLabel, visitLabel: null }
              : note
          )
        );
      }

      if (selectedItem.transcript && selectedItem.transcript.trim() !== '') {
        notesHistory.setTranscripts(prevTranscripts =>
          prevTranscripts.map(transcript =>
            (transcript.owner + transcript.timestamp) === uniqueId
              ? { ...transcript, noteLabel: newLabel, visitLabel: null }
              : transcript
          )
        );
      }

      setSelectedItem(prev => ({ ...prev, noteLabel: newLabel, visitLabel: null }));
    };

    try {
      const client = getAmplifyClient();
      await client.graphql({
        query: mutations.updateNotes,
        variables: {
          input: {
            owner: selectedItem.owner,
            timestamp: selectedItem.timestamp,
            noteLabel: newLabel
          }
        }
      });

      updateLocalLabel();
    } catch (error) {
      console.error('Error updating note label:', error);
      updateLocalLabel();
      alert('Failed to save label to database. Changes are visible locally but may not persist.');
    }
  };

  useEffect(() => {
    return () => {
      if (copyMessageTimeoutRef.current) clearTimeout(copyMessageTimeoutRef.current);
    };
  }, []);

  const handleKeyDown = useCallback((event) => {
    if (event.key === 'Escape') setShowContentPopup(false);

    if (window.innerWidth > 768) {
      if (!isNativePlatform() && !isPhoneLayout() && event.ctrlKey && event.key === 'b') {
        event.preventDefault();
        const screenWidth = window.innerWidth;

        if (screenWidth >= 780 && screenWidth < 1200 && !showEditPanel) {
          setIsCollapsed(true);
        }

        setShowEditPanel(prev => !prev);
        if (!showEditPanel) {
          setTimeout(() => {
            const editTextarea = document.querySelector('.edit-textarea');
            if (editTextarea) editTextarea.focus();
          }, 100);
        }
      }

      if (event.ctrlKey && event.key === 'Backspace') {
        event.preventDefault();
        leaveDrafts(() => { setClipboardContent(''); setClipboardTarget(null); });
      }

      if (event.ctrlKey && event.key === '`') {
        event.preventDefault();
        if (!(showRecordingPopup ||
          recordingManager.isRecording ||
          recordingManager.isPreparingTranscript ||
          recordingManager.isGeneratingSummary)) {
          const screenWidth = window.innerWidth;

          if (screenWidth >= 780 && screenWidth < 1200 && isCollapsed) {
            setShowEditPanel(false);
          }

          setIsCollapsed(prev => !prev);
        }
      }
    }
  }, [
    showEditPanel,
    showRecordingPopup,
    recordingManager.isRecording,
    recordingManager.isPreparingTranscript,
    recordingManager.isGeneratingSummary,
    isCollapsed
  ]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    const overlay = mobileOverlayRef.current;
    if (!overlay) return;

    const preventTouchMove = (event) => {
      if (!isCollapsed) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    overlay.addEventListener('touchstart', preventTouchMove, { passive: false });
    overlay.addEventListener('touchmove', preventTouchMove, { passive: false });
    overlay.addEventListener('touchend', preventTouchMove, { passive: false });

    return () => {
      overlay.removeEventListener('touchstart', preventTouchMove);
      overlay.removeEventListener('touchmove', preventTouchMove);
      overlay.removeEventListener('touchend', preventTouchMove);
    };
  }, [isCollapsed]);

  const handleMobileOverlayDragOver = (event) => {
    event.preventDefault();
    setIsMobileOverlayDragOver(true);
  };

  const handleMobileOverlayDragLeave = (event) => {
    event.preventDefault();
    setIsMobileOverlayDragOver(false);
  };

  const handleMobileOverlayDrop = (event) => {
    event.preventDefault();
    setIsMobileOverlayDragOver(false);
    if (clipboardSave.busy || noteStreamActive || isDictationLoading || isTranscribing) return;
    const timestamp = event.dataTransfer.getData(SAVED_NOTE_DRAG_TYPE);
    if (patientNotesEnabled && timestamp) {
      handleSavedNoteDrop(timestamp).then(opened => { if (opened) setIsCollapsed(true); });
      return;
    }
    savedNoteDropRequestRef.current += 1;
    const droppedText = event.dataTransfer.getData('text/plain');
    if (droppedText) {
      leaveDrafts(() => { setClipboardTarget(null); setClipboardContent(droppedText); setIsCollapsed(true); });
    }
  };

  return (
    <div className={`app ${nativeLayout ? 'clipboard-native-layout' : ''} ${phoneLayout ? 'clipboard-phone-layout' : ''} ${recordingManager.isProcessing ? 'processing-active' : ''}`}>

      {clipboardGuard.dialog}
      <IntroTour />
      <Navbar
        username={user.username}
        onSignOut={() => leaveDrafts(signOut)}
        onFeedback={openFeedback}
      />
      {generationError && <p className="patient-confirmation" role="alert">{generationError}</p>}
      <ErrorBanner isVisible={showErrorBanner} />

      <Routes>
        <Route path="/" element={
          <MainWorkspace
            phoneLayout={phoneLayout}
            nativeLayout={nativeLayout}
            smartEditorAvailable={smartEditorAvailable}
            user={user}
            notesHistory={notesHistory}
            sidebar={{
              isCollapsed,
              isMobileOverlayDragOver,
              mobileOverlayRef,
              close: () => setIsCollapsed(true),
              togglePanel,
              onMobileOverlayDragOver: handleMobileOverlayDragOver,
              onMobileOverlayDragLeave: handleMobileOverlayDragLeave,
              onMobileOverlayDrop: handleMobileOverlayDrop
            }}
            clipboard={{
              clipboardTextareaRef,
              clipboardContent,
              setClipboardContent,
              noteStreamActive,
              target: patientNotesEnabled ? clipboardTarget : null,
              onSavedNoteDrop: patientNotesEnabled ? handleSavedNoteDrop : undefined,
              onTextDrop: handleClipboardTextDrop,
              review: clipboardSave.review && <ClipboardSaveReview review={clipboardSave.review} busy={clipboardSave.busy} onConfirm={clipboardSave.confirm} onCancel={clipboardSave.cancelReview} />,
              streamingText,
              setShowCopyMessage,
              showCopyMessage,
              handleCopy,
              handleTextStreamUpdate,
              save: {
                visible: patientNotesEnabled && desktopSave && Boolean(clipboardTarget),
                dirty: clipboardDirty, busy: clipboardSave.busy,
                disabled: (!clipboardDirty && !clipboardTarget?.diagnosisReviewRequired && !clipboardTarget?.needsContextReview) || !clipboardContent.trim() || noteStreamActive || isTranscribing || isDictationLoading || Boolean(clipboardSave.review),
                onSave: clipboardSave.save,
                message: clipboardDirty ? 'Unsaved note changes' : clipboardTarget?.diagnosisReviewRequired || clipboardTarget?.needsContextReview ? 'Note needs review' : 'Note saved',
              }
            }}
            editPanel={{
              showEditPanel,
              editContent,
              editTextareaRef,
              setEditContent,
              toggleEditPanel
            }}
            recording={{
              manager: recordingManager,
              showRecordingPopup,
              recordingType,
              toggleRecordingPopup
            }}
            dictation={{
              main: dictation,
              edit: editDictation,
              showDictationPopup,
              toggleDictationPopup,
              isDictationLoading,
              isTranscribing,
              isWebSocketConnecting
            }}
            contentPopup={{
              showContentPopup,
              setShowContentPopup,
              setShowPopupMenu,
              showNotes,
              showPopupMenu,
              togglePopupMenu,
              handleSendToClipboard,
              selectedContent,
              showPopupCopyMessage,
              selectedTimestamp,
              selectedItem,
              handleLabelUpdate,
              handlePopupViewModeChange,
              onPatientAssigned: handlePatientAssigned,
              onOpen: toggleContentPopup
            }}
          />
        } />
        <Route path="/billing" element={<Account />} />
        <Route path="/settings" element={<Settings />} />
        {patientNotesEnabled && <Route path="/patients" element={<PatientsPage desktopSave={desktopSave} allowExport onOpenNote={openPatientNote} />} />}
        <Route path="/account" element={<Navigate to="/app/billing" replace />} />
        <Route path="/feedback" element={<LegacyFeedbackRoute onOpen={openFeedback} />} />
        <Route path="/pricingplans" element={<Navigate to="/app/billing" replace />} />
      </Routes>
      <Feedback
        isOpen={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
        returnFocusRef={feedbackTriggerRef}
      />
    </div>
  );
}

function LegacyFeedbackRoute({ onOpen }) {
  useEffect(() => { onOpen(); }, [onOpen]);
  return <Navigate to="/app" replace />;
}

function AuthenticatedApp(props) {
  return <ClinicalWorkspace key={props.user?.userId || props.user?.username || 'signed-out'} {...props} />;
}
export default AuthenticatedApp;
