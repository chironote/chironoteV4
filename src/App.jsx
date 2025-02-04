import React, { useState, useEffect, useRef, useCallback } from 'react'; 
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
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
import LandingPage from './components/LandingPage/LandingPage';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/api';
import * as subscriptions from './graphql/subscriptions';
import * as queries from './graphql/queries';
import { CONNECTION_STATE_CHANGE } from 'aws-amplify/api';
import { Hub } from 'aws-amplify/utils';
import PriceTable from './components/Account/PriceTable';
import ReactGA from 'react-ga4';

import { withAuthenticator, Authenticator, CheckboxField } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';

import config from './amplifyconfiguration.json';
Amplify.configure(config);

const client = generateClient();

// Analytics wrapper component to track page views
function RouteTracker() {
  const location = useLocation();

  useEffect(() => {
    // Send pageview with current path
    ReactGA.send({ hitType: "pageview", page: location.pathname });
  }, [location]);

  return null;
}

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
                I agree with the <a href="https://public-docs-and-agreements.s3.us-east-2.amazonaws.com/PrivacyTermsConditions.pdf" target="_blank" rel="noopener noreferrer">Terms, Conditions and Privacy Policy</a>
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
const getFirstSentenceOrSubstring = (text, maxLength = 89) => {
  if (!text) return 'Empty';
  
  if (text.length <= maxLength) return text;
  
  const substring = text.substring(0, maxLength);
  const lastSpaceIndex = substring.lastIndexOf(' ');
  
  if (lastSpaceIndex === -1) return substring + '...';
  
  return substring.substring(0, lastSpaceIndex) + '...';
};

// **Updated Helper Function to Format Timestamp**
const formatTimestamp = (timestamp) => {
  const numTimestamp = Number(timestamp);
  const date = new Date(numTimestamp);
  
  // Get weekday and time separately
  const weekday = date.toLocaleString(undefined, {
    weekday: 'short'
  });
  
  const time = date.toLocaleString(undefined, {
    hour: 'numeric',
    minute: 'numeric',
    hour12: true
  });

  return { day: weekday, time: time };
};

// Component to render list items (Notes or Transcripts)
const ListItem = ({ item, onClick, isNote, onDragStart, isNew, onMouseEnter }) => {
  const content = isNote ? item.note : item.transcript;
  const displayText = getFirstSentenceOrSubstring(content);

  const handleDragStart = (e) => {
    e.dataTransfer.setData('text/plain', content);
    onDragStart(content);
  };

  // **Format the timestamp**
  const { day, time } = formatTimestamp(item.timestamp);

  return (
    <div
      className={`list-item ${isNew ? 'highlight' : ''}`}
      onClick={() => onClick(item)}
      draggable
      onDragStart={handleDragStart}
      onMouseEnter={onMouseEnter}
      style={{ display: 'flex', alignItems: 'center' }}
    >
      <div className="timestamp">
        <span className="day">{day}</span>
        <span className="time">{time}</span>
      </div>
      <div className="content">{displayText}</div>
    </div>
  );
};

function AuthenticatedApp({ signOut, user }) {
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
  const [draggedContent, setDraggedContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [newItems, setNewItems] = useState(new Set());
  const [queryLoaded, setQueryLoaded] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const clipboardTextareaRef = useRef(null);
  const copyMessageTimeoutRef = useRef(null);

  const handleTextStreamUpdate = useCallback((newText) => {
    setStreamingText(newText);
    setClipboardContent(newText);
    setShowRecordingPopup(false);
  }, []);

  const recordingManager = RecordingManager({ 
    onTextStreamUpdate: handleTextStreamUpdate
  });

  useEffect(() => {
    const fetchNotes = async () => {
      setIsLoading(true);
      try {
      const notesData = await client.graphql({
        query: queries.listNotes,
        variables: { 
          owner: user.username,
          sortDirection: "DESC",
          limit: 50  // Fetch more items to ensure we have enough after filtering
        }
      });
        const fetchedNotes = notesData.data.listNotes.items;
        console.log('Raw fetched notes:', fetchedNotes);
        
        const filteredNotes = fetchedNotes.filter(item => item.note && item.note.trim() !== "");
        const filteredTranscripts = fetchedNotes.filter(item => item.transcript && item.transcript.trim() !== "");
        
        console.log('Filtered notes:', filteredNotes);
        console.log('Filtered transcripts:', filteredTranscripts);
        
        // Since we're already getting data in DESC order, just take the first 10
        setNotes(filteredNotes.slice(0, 10));
        setTranscripts(filteredTranscripts.slice(0, 10));
        setQueryLoaded(true);
      } catch (error) {
        console.error("Error fetching notes:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNotes();
  }, [user.username]);

  useEffect(() => {
    const hubListener = Hub.listen('api', (data) => {
      const { payload } = data;
      if (payload.event === CONNECTION_STATE_CHANGE) {
        const connectionState = payload.data.connectionState;
        console.log('Connection state:', connectionState);
      }
    });

    const subscription = client.graphql({ 
      query: subscriptions.onUpdateNotesByOwner,
      variables: { owner: user.username }
    }).subscribe({
      next: ({ data }) => {
        console.log('Received data from subscription:', data);
        const updatedData = data.onUpdateNotesByOwner;
        
        if (updatedData.note && updatedData.note.trim() !== "") {
          console.log('New note:', updatedData.note);
          setNotes(prevNotes => {
            const updatedNotes = [updatedData, ...prevNotes.filter(note => note.timestamp !== updatedData.timestamp)];
            setNewItems(new Set([...newItems, updatedData.timestamp]));
            return updatedNotes.slice(0, 10);
          });
        }
        
        if (updatedData.transcript && updatedData.transcript.trim() !== "") {
          console.log('New transcript:', updatedData.transcript);
          setTranscripts(prevTranscripts => {
            const updatedTranscripts = [updatedData, ...prevTranscripts.filter(transcript => transcript.timestamp !== updatedData.timestamp)];
            setNewItems(new Set([...newItems, updatedData.timestamp]));
            return updatedTranscripts.slice(0, 10);
          });
        }
      },
      error: (error) => console.warn(error)
    });

    return () => {
      subscription.unsubscribe();
      hubListener();
    };
  }, [user.username, newItems]);

  const toggleEditPanel = () => {
    setShowEditPanel(prev => !prev);
    if (!showEditPanel) setEditContent('');
  };

  const toggleRecordingPopup = (type) => {
    if (recordingManager.isRecording) {
      recordingManager.stopRecording();
    } else {
      setRecordingType(type);
      setShowRecordingPopup(prev => !prev);
    }
  };

  const toggleDictationPopup = () => {
    setShowDictationPopup(prev => !prev);
  };

  const toggleContentPopup = (content) => {
    setSelectedContent(showNotes ? content.note : content.transcript);
    setShowContentPopup(prev => !prev);
    setShowPopupMenu(false);
  };

  const togglePopupMenu = (e) => {
    e.stopPropagation();
    setShowPopupMenu(prev => !prev);
  };

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

  const handleSendToClipboard = () => {
    const plainText = extractPlainText(selectedContent);
    setClipboardContent(plainText);
    setShowPopupMenu(false);
    setShowContentPopup(false);
  };

  const handleCopyPaste = useCallback((e) => {
    const plainText = extractPlainText(clipboardContent);
    navigator.clipboard.writeText(plainText);
    setShowCopyMessage(true);
    if (copyMessageTimeoutRef.current) clearTimeout(copyMessageTimeoutRef.current);
    copyMessageTimeoutRef.current = setTimeout(() => setShowCopyMessage(false), 1000);
  }, [clipboardContent]);

  useEffect(() => {
    return () => {
      if (copyMessageTimeoutRef.current) clearTimeout(copyMessageTimeoutRef.current);
    };
  }, []);

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') setShowContentPopup(false);
  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const removeHighlight = (timestamp) => {
    setNewItems(prevNewItems => {
      const updatedNewItems = new Set(prevNewItems);
      updatedNewItems.delete(timestamp);
      return updatedNewItems;
    });
  };

  const togglePanel = () => {
    setIsCollapsed(!isCollapsed);
  };

  const renderItems = () => {
    const items = showNotes ? notes : transcripts;
    if (isLoading) {
      return <div className="loading-message">Loading recent history</div>;
    }
    if (items.length === 0) {
      return (
        <div className="empty-list-message">
          Start recording to generate your first {showNotes ? 'note' : 'transcript'}
        </div>
      );
    }
    return items.map(item => (
      <ListItem
        key={item.timestamp}
        item={item}
        onClick={toggleContentPopup}
        isNote={showNotes}
        onDragStart={setDraggedContent}
        isNew={newItems.has(item.timestamp)}
        onMouseEnter={() => removeHighlight(item.timestamp)}
      />
    ));
  };

  const updateClipboardContent = useCallback((newContent) => {
    setClipboardContent(newContent);
  }, []);

  return (
    <div className="app">
      <Navbar 
        username={user.username}
        onSignOut={signOut}
      />

      <Routes>
        <Route path="/" element={
          <main className="app-main">
            <section className={`left-panel ${isCollapsed ? 'collapsed' : ''} ${queryLoaded ? 'left-panel-animate' : ''}`}>
              <div className="right-align-div">
                <div className="toggle-panel" onClick={togglePanel}>
                  {isCollapsed ? <span className="material-symbols-rounded">history</span> : '◀'}
                </div>
              </div>
              <div className="fade-content">
                <h2 className="panel-header">History</h2>
                <TogglePanel showNotes={showNotes} setShowNotes={setShowNotes} />
                <div className="list-container">
                  {renderItems()}
                </div>
              </div>
            </section>

            <section className="clipboard-container">
              <h2 className="section-header">Current Note</h2>
              <ClipboardButtons 
                toggleRecordingPopup={toggleRecordingPopup} 
                toggleDictationPopup={toggleDictationPopup}
                toggleEditPanel={toggleEditPanel}
                showEditPanel={showEditPanel}
             />
              <Clipboard
                clipboardTextareaRef={clipboardTextareaRef}
                clipboardContent={clipboardContent}
                handleCopyPaste={handleCopyPaste}
                setClipboardContent={setClipboardContent}
                showCopyMessage={showCopyMessage}
                draggedContent={draggedContent}
              />
            </section>

            <EditPanel 
              showEditPanel={showEditPanel} 
              editContent={editContent} 
              setEditContent={setEditContent} 
              clipboardContent={clipboardContent}
              setClipboardContent={setClipboardContent}
              userId={user.username}
              onTextStreamUpdate={handleTextStreamUpdate}
            />

            {showRecordingPopup && (
              <Recording
                toggleRecordingPopup={toggleRecordingPopup}
                recordingType={recordingType}
                isRecording={recordingManager.isRecording}
                isPaused={recordingManager.isPaused}
                isPreparingTranscript={recordingManager.isPreparingTranscript}
                isGeneratingSummary={recordingManager.isGeneratingSummary}
                startRecording={recordingManager.startRecording}
                stopRecording={recordingManager.stopRecording}
                pauseRecording={recordingManager.pauseRecording}
                resumeRecording={recordingManager.resumeRecording}
              />
            )}

            {showDictationPopup && (
              <Dictation
                toggleDictationPopup={toggleDictationPopup}
                onTextStreamUpdate={handleTextStreamUpdate}
              />
            )}

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
          </main>
        } />
        <Route path="/account" element={<Account />} />
        <Route path="/feedback" element={<Feedback />} />
        <Route path="/pricingplans" element={<PriceTable />} />
      </Routes>
    </div>
  );
}

const ProtectedApp = withAuthenticator(AuthenticatedApp, {
  components,
  services,
});

function App() {
  return (
    <Router>
      <RouteTracker />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/app/*" element={<ProtectedApp />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}


export default App;
