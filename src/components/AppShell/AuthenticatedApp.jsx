import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { fetchUserAttributes } from 'aws-amplify/auth';
import { Helmet } from 'react-helmet-async';
import Account from '../Account/Account';
import Feedback from '../Feedback/Feedback';
import Navbar from '../Navbar/Navbar';
import PriceTable from '../Account/PriceTable';
import IntroTour from '../IntroTour/IntroTour';
import ErrorBanner from './ErrorBanner';
import Dictation from '../Recording/Dictation';
import RecordingManager from '../Recording/RecordingManager';
import MainWorkspace from './MainWorkspace';
import useNotesHistory from './useNotesHistory';
import useUserAnalytics from './useUserAnalytics';
import * as mutations from '../../graphql/mutations';
import { getAmplifyClient } from '../../services/amplifyClient';
import { isNativePlatform, writeClipboardText } from '../../services/nativePlatform';
import { trackRecordingCompleted } from '../../utils/analytics';
import { applyDictationText, createDictationInsertion } from '../../utils/dictationInsertion';
import { extractPlainText } from '../../utils/historyGrouping';
import { stripMarkdown } from '../../utils/markdownStripper';

function AuthenticatedApp({ signOut, user }) {
  const isNative = isNativePlatform();
  const [showNotes, setShowNotes] = useState(true);
  const [showEditPanel, setShowEditPanel] = useState(false);
  const [showRecordingPopup, setShowRecordingPopup] = useState(false);
  const [recordingType, setRecordingType] = useState('');
  const [showDictationPopup, setShowDictationPopup] = useState(false);
  const [showContentPopup, setShowContentPopup] = useState(false);
  const [selectedContent, setSelectedContent] = useState('');
  const [selectedTimestamp, setSelectedTimestamp] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showPopupMenu, setShowPopupMenu] = useState(false);
  const [clipboardContent, setClipboardContent] = useState('');
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

  useUserAnalytics(user.username);

  const notesHistory = useNotesHistory(user.username, setIsWebSocketConnecting);

  const handleTextStreamUpdate = useCallback(async (newText) => {
    const cleanedText = stripMarkdown(newText);
    setStreamingText(cleanedText);
    setClipboardContent(cleanedText);

    if (newText && newText.length > 50) {
      try {
        const userAttributes = await fetchUserAttributes();
        const userId = userAttributes.sub;
        await trackRecordingCompleted(userId);
      } catch (error) {
        console.error('Error tracking recording completion:', error);
      }
    }
  }, []);

  const handleTransitionToMainApp = useCallback(() => {
    setShowRecordingPopup(false);
  }, []);

  const recordingManager = RecordingManager({
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
    const screenWidth = window.innerWidth;

    if (screenWidth >= 780 && screenWidth < 1200 && !showEditPanel) {
      setIsCollapsed(true);
    }

    setShowEditPanel(prev => !prev);
    if (!showEditPanel) setEditContent('');
  };

  const toggleRecordingPopup = (type) => {
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

  const toggleContentPopup = (item) => {
    setSelectedItem(item);
    setShowNotes(true);
    setSelectedContent(item.note || '');
    setSelectedTimestamp(item.timestamp);
    setShowContentPopup(prev => !prev);
    setShowPopupMenu(false);
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

  const handleSendToClipboard = () => {
    const plainText = extractPlainText(selectedContent);
    setClipboardContent(plainText);
    setShowPopupMenu(false);
    setShowContentPopup(false);
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
              ? { ...note, noteLabel: newLabel }
              : note
          )
        );
      }

      if (selectedItem.transcript && selectedItem.transcript.trim() !== '') {
        notesHistory.setTranscripts(prevTranscripts =>
          prevTranscripts.map(transcript =>
            (transcript.owner + transcript.timestamp) === uniqueId
              ? { ...transcript, noteLabel: newLabel }
              : transcript
          )
        );
      }

      setSelectedItem(prev => ({ ...prev, noteLabel: newLabel }));
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
      if (event.ctrlKey && event.key === 'b') {
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
        setClipboardContent('');
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
    const droppedText = event.dataTransfer.getData('text/plain');
    if (droppedText) {
      setClipboardContent(droppedText);
      setIsCollapsed(true);
    }
  };

  return (
    <div className={`app ${recordingManager.isProcessing ? 'processing-active' : ''}`}>
      <Helmet>
        <title>ChiroNote | AI-Powered Clinical Documentation</title>
        <meta name="description" content="Your AI-powered clinical documentation workspace. Create SOAP notes in minutes with voice recording and intelligent transcription." />
        <meta name="robots" content="noindex, nofollow" />
        <meta property="og:title" content="ChiroNote | Clinical Documentation App" />
        <meta property="og:description" content="AI-powered clinical documentation workspace for healthcare professionals." />
      </Helmet>
      <IntroTour />
      <Navbar
        username={user.username}
        onSignOut={signOut}
      />
      <ErrorBanner isVisible={showErrorBanner} />

      <Routes>
        <Route path="/" element={
          <MainWorkspace
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
              streamingText,
              setShowCopyMessage,
              showCopyMessage,
              handleCopy,
              handleTextStreamUpdate
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
              onOpen: toggleContentPopup
            }}
          />
        } />
        <Route path="/account" element={<Account />} />
        <Route path="/feedback" element={<Feedback />} />
        <Route path="/pricingplans" element={isNative ? <Navigate to="/account" replace /> : <PriceTable />} />
      </Routes>
    </div>
  );
}

export default AuthenticatedApp;
