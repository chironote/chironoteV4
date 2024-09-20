import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import './App.css';
import Account from './components/Account/Account';
import Feedback from './components/Feedback/Feedback';
import Recording from './components/Recording/Recording';
import Dictation from './components/Recording/Dictation';
import Navbar from './components/Navbar/Navbar';
import TogglePanel from './components/TogglePanel';
import ClipboardButtons from './components/ClipboardButtons';
import EditPanel from './components/EditPanel';
import Clipboard from './components/Clipboard';
import ContentPopup from './components/ContentPopup';
import Header from './components/AuthUI/SignIn';
import TextStream from './components/Recording/TextStream';
import RecordingManager from './components/Recording/RecordingManager';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/api';
import * as subscriptions from './graphql/subscriptions';
import * as queries from './graphql/queries';
import TermsAndConditions from './components/AuthUI/TermsAndConditions';
import { CONNECTION_STATE_CHANGE, ConnectionState } from 'aws-amplify/api';
import { Hub } from 'aws-amplify/utils';
import PriceTable from './components/Account/PriceTable';

import { withAuthenticator, Authenticator, CheckboxField } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';

import config from './amplifyconfiguration.json';
Amplify.configure(config);

const client = generateClient();

const components = {
  Header: () => <Header />,
  SignUp: {
    FormFields() {
      return (
        <>
          <Authenticator.SignUp.FormFields />
          <CheckboxField
            name="acknowledgement"
            value="yes"
            label={
              <>
                I agree with the <a href="https://www.termsfeed.com/public/uploads/2021/12/sample-terms-conditions-agreement.pdf" target="_blank" rel="noopener noreferrer">Terms and Conditions</a>
              </>
            }
            required={true}
          />
        </>
      );
    },
  },
};

const services = {
  async validateCustomSignUp(formData) {
    if (!formData.acknowledgement) {
      throw new Error('You must agree to the Terms and Conditions');
    }
  },
};

// Helper function to extract plain text from HTML
const extractPlainText = (html) => {
  const tempElement = document.createElement('div');
  tempElement.innerHTML = html;
  return tempElement.textContent?.trim() || '';
};

// Helper function to get the first sentence or a substring
const getFirstSentenceOrSubstring = (text, maxLength = 50) => {
  if (!text) return 'Empty';
  const firstSentence = text.split('.')[0].trim();
  return firstSentence.length > maxLength ? firstSentence.substring(0, maxLength) + '...' : firstSentence;
};

// Component to render list items (Notes or Transcripts)
const ListItem = ({ item, onClick, isNote }) => {
  const content = isNote ? item.note : item.transcript;
  const displayText = getFirstSentenceOrSubstring(content);

  return (
    <div className="list-item" onClick={() => onClick(item)}>
      {displayText}
    </div>
  );
};

function App({ signOut, user }) {
  const [showNotes, setShowNotes] = useState(true);
  const [showEditPanel, setShowEditPanel] = useState(false);
  const [showRecordingPopup, setShowRecordingPopup] = useState(false);
  const [recordingType, setRecordingType] = useState('');
  const [showDictationPopup, setShowDictationPopup] = useState(false);
  const [showContentPopup, setShowContentPopup] = useState(false);
  const [selectedContent, setSelectedContent] = useState('');
  const [showPopupMenu, setShowPopupMenu] = useState(false);
  const [clipboardContent, setClipboardContent] = useState('');
  const [editContent, setEditContent] = useState('');
  const [showCopyMessage, setShowCopyMessage] = useState(false);
  const [showPopupCopyMessage, setShowPopupCopyMessage] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [notes, setNotes] = useState([]);
  const [transcripts, setTranscripts] = useState([]);

  const clipboardTextareaRef = useRef(null);
  const copyMessageTimeoutRef = useRef(null);

  // Define handleTextStreamUpdate before using it
  const handleTextStreamUpdate = useCallback((newText) => {
    setStreamingText(newText);
    setClipboardContent(newText);
  }, []);

  const recordingManager = useMemo(() => RecordingManager({ onTextStreamUpdate: handleTextStreamUpdate }));

  // Fetch initial notes and transcripts
  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const notesData = await client.graphql({
          query: queries.listNotes,
          variables: { filter: { owner: { eq: user.username } } }
        });
        const fetchedNotes = notesData.data.listNotes.items;
        setNotes(fetchedNotes.filter(item => item.note && item.note.trim() !== "").slice(0, 10));
        setTranscripts(fetchedNotes.filter(item => item.transcript && item.transcript.trim() !== "").slice(0, 10));
      } catch (error) {
        console.error("Error fetching notes:", error);
      }
    };

    fetchNotes();
  }, [user.username]);

  // Subscribe to updates of Notes and Transcripts
  useEffect(() => {
    // Hub listener for connection state changes
    const hubListener = Hub.listen('api', (data) => {
      const { payload } = data;
      if (payload.event === CONNECTION_STATE_CHANGE) {
        const connectionState = payload.data.connectionState;
        console.log('Connection state:', connectionState);
      }
    });

    // GraphQL subscription
    const subscription = client.graphql({ 
      query: subscriptions.onUpdateNotesByOwner,
      variables: { owner: user.username }
    }).subscribe({
      next: ({ data }) => {
        console.log('Received data from subscription:', data);
        const updatedData = data.onUpdateNotesByOwner;
        
        // Handle note update
        if (updatedData.note && updatedData.note.trim() !== "") {
          console.log('New note:', updatedData);
          setNotes(prevNotes => {
            const updatedNotes = [updatedData, ...prevNotes.filter(note => note.timestamp !== updatedData.timestamp)];
            return updatedNotes.slice(0, 10); // Keep only the most recent 10 notes
          });
        }
        
        // Handle transcript update
        if (updatedData.transcript && updatedData.transcript.trim() !== "") {
          console.log('New transcript:', updatedData);
          setTranscripts(prevTranscripts => {
            const updatedTranscripts = [updatedData, ...prevTranscripts.filter(transcript => transcript.timestamp !== updatedData.timestamp)];
            return updatedTranscripts.slice(0, 10); // Keep only the most recent 10 transcripts
          });
        }
      },
      error: (error) => console.warn(error)
    });

    // Cleanup function
    return () => {
      subscription.unsubscribe();
    };
  }, [user.username]);

  // Toggle the visibility of the edit panel
  const toggleEditPanel = () => {
    setShowEditPanel(prev => !prev);
    if (!showEditPanel) setEditContent('');
  };

  // Toggle recording popup visibility
  const toggleRecordingPopup = (type) => {
    setRecordingType(type);
    setShowRecordingPopup(prev => !prev);
  };

  // Toggle dictation popup visibility
  const toggleDictationPopup = () => {
    setShowDictationPopup(prev => !prev);
  };

  // Show or hide content popup
  const toggleContentPopup = (content) => {
    setSelectedContent(showNotes ? content.note : content.transcript);
    setShowContentPopup(prev => !prev);
    setShowPopupMenu(false);
  };

  // Show or hide popup menu
  const togglePopupMenu = (e) => {
    e.stopPropagation();
    setShowPopupMenu(prev => !prev);
  };

  // Copy text to clipboard and show feedback message
  const handleCopy = (isPopupMenu = false) => {
    const plainText = extractPlainText(selectedContent);
    navigator.clipboard.writeText(plainText)
      .then(() => {
        setShowPopupMenu(false);
        const setCopyMessage = isPopupMenu ? setShowPopupCopyMessage : setShowCopyMessage;
        setCopyMessage(true);
        if (copyMessageTimeoutRef.current) clearTimeout(copyMessageTimeoutRef.current);
        copyMessageTimeoutRef.current = setTimeout(() => setCopyMessage(false), 1000);
      })
      .catch(err => alert('Failed to copy!'));
  };

  // Send content to clipboard and update state
  const handleSendToClipboard = () => {
    const plainText = extractPlainText(selectedContent);
    setClipboardContent(plainText);
    setShowPopupMenu(false);
    setShowContentPopup(false);
  };

  // Handle copy-paste action from clipboard
  const handleCopyPaste = useCallback((e) => {
    const plainText = extractPlainText(clipboardContent);
    navigator.clipboard.writeText(plainText);
    setShowCopyMessage(true);
    if (copyMessageTimeoutRef.current) clearTimeout(copyMessageTimeoutRef.current);
    copyMessageTimeoutRef.current = setTimeout(() => setShowCopyMessage(false), 1000);
  }, [clipboardContent]);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      if (copyMessageTimeoutRef.current) clearTimeout(copyMessageTimeoutRef.current);
    };
  }, []);

  // Handle keydown events for closing popups
  const handleKeyDown = (event) => {
    if (event.key === 'Escape') setShowContentPopup(false);
  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Render notes or transcripts based on current state
  const renderItems = () => {
    const items = showNotes ? notes : transcripts;
    return items.map(item => (
      <ListItem key={item.timestamp} item={item} onClick={toggleContentPopup} isNote={showNotes} />
    ));
  };

  const updateClipboardContent = useCallback((newContent) => {
    setClipboardContent(newContent);
  }, []);

  return (
    <Router>
      <div className="app">
        <Navbar 
          username={user.username}
          onSignOut={signOut}
        />

        <main className="app-main">
          <Routes>
            <Route path="/" element={
              <>
                {/* Left panel: Toggle between Notes and Transcripts */}
                <section className="left-panel">
                  <h2 className="panel-header">History</h2>
                  <TogglePanel showNotes={showNotes} setShowNotes={setShowNotes} />

                  {/* Render list of items based on selected toggle */}
                  <div className="list-container">
                    {renderItems()}
                  </div>
                </section>

                {/* Clipboard container: Displays the current note with actions */}
                <section className="clipboard-container">
                  <h2 className="section-header">Current Note</h2>
                  <ClipboardButtons 
                    toggleRecordingPopup={toggleRecordingPopup} 
                    toggleDictationPopup={toggleDictationPopup}
                    toggleEditPanel={toggleEditPanel} 
                  />

                  {/* Clipboard area for note taking */}
                  <Clipboard clipboardTextareaRef={clipboardTextareaRef} clipboardContent={clipboardContent} handleCopyPaste={handleCopyPaste} setClipboardContent={setClipboardContent} showCopyMessage={showCopyMessage} />
                </section>

                {/* Edit panel for updating notes */}
                <EditPanel 
                  showEditPanel={showEditPanel} 
                  editContent={editContent} 
                  setEditContent={setEditContent} 
                  clipboardContent={clipboardContent}
                  userId={user.username}
                  onTextStreamUpdate={handleTextStreamUpdate}
                />
              </>
            } />
            <Route path="/account" element={<Account />} />
            <Route path="/feedback" element={<Feedback />} />
            <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
            <Route path="/pricingplans" element={<PriceTable />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        {/* Popup for recording options */}
        {showRecordingPopup && (
          <Recording
            toggleRecordingPopup={toggleRecordingPopup}
            recordingType={recordingType}
            isRecording={recordingManager.isRecording}
            isPaused={recordingManager.isPaused}
            startRecording={recordingManager.startRecording}
            stopRecording={recordingManager.stopRecording}
            pauseRecording={recordingManager.pauseRecording}
            resumeRecording={recordingManager.resumeRecording}
          />
        )}

        {/* Popup for dictation options */}
        {showDictationPopup && (
          <Dictation
            toggleDictationPopup={toggleDictationPopup}
            onTextStreamUpdate={handleTextStreamUpdate}
          />
        )}

        {/* Content popup for displaying selected note or transcript */}
        {showContentPopup && (
          <ContentPopup 
            setShowContentPopup={setShowContentPopup} 
            setShowPopupMenu={setShowPopupMenu} 
            showNotes={showNotes} 
            showPopupMenu={showPopupMenu} 
            togglePopupMenu={togglePopupMenu} 
            handleCopy={handleCopy} 
            handleSendToClipboard={handleSendToClipboard} 
            selectedContent={selectedContent} 
            showPopupCopyMessage={showPopupCopyMessage} 
          />
        )}
      </div>
    </Router>
  );
}

export default withAuthenticator(App, {
  components,
});