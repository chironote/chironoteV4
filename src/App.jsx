import React, { useState, useEffect, useRef, useCallback } from 'react'; 
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation, useNavigate } from 'react-router-dom';
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
import * as mutations from './graphql/mutations';
import { CONNECTION_STATE_CHANGE } from 'aws-amplify/api';
import { Hub } from 'aws-amplify/utils';
import { getCurrentUser } from 'aws-amplify/auth';
import PriceTable from './components/Account/PriceTable';
import ReactGA from 'react-ga4';
import { RealtimeTranscriber } from 'assemblyai';
import RecordRTC from 'recordrtc';
import NoSleep from 'nosleep.js';

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

// PWA detection component
function PWARedirect() {
  const navigate = useNavigate();
  const location = useLocation();
  
  useEffect(() => {
    // Check if app is running in standalone mode (as a PWA)
    const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
                 window.navigator.standalone || 
                 document.referrer.includes('android-app://');
    
    // If it's a PWA and we're on the landing page, redirect to /app
    if (isPWA && location.pathname === '/') {
      navigate('/app');
    }
  }, [navigate, location]);
  
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
  const [isCollapsed, setIsCollapsed] = useState(window.innerWidth <= 768);
  
  // Dictation specific states
  const [isDictationLoading, setIsDictationLoading] = useState(false);
  const [isDictationActive, setIsDictationActive] = useState(false);
  const [assemblyAIToken, setAssemblyAIToken] = useState(null);
  const [tokenExpiry, setTokenExpiry] = useState(null);
  const [userSubscription, setUserSubscription] = useState(null);
  const [transcription, setTranscription] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [timer, setTimer] = useState(0);
  
  // Dictation specific refs
  const rtRef = useRef(null);
  const recorder = useRef(null);
  const streamRef = useRef(null);
  const noSleepRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const tokenRefreshTimeoutRef = useRef(null);

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

  // Fetch AssemblyAI token
  const fetchAssemblyAIToken = async () => {
    try {
      setIsDictationLoading(true);
      const response = await fetch('https://llck5m4mzd6sa6do3joadjzzs40jtoef.lambda-url.us-east-2.on.aws', {
        method: 'GET'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const { token } = await response.json();
      const now = new Date();
      // Set expiry to 2.9 hours (just under 3 hours to be safe)
      const expiry = new Date(now.getTime() + 2.9 * 60 * 60 * 1000);
      
      setAssemblyAIToken(token);
      setTokenExpiry(expiry);
      
      // Schedule token refresh
      scheduleTokenRefresh(expiry);
      setIsDictationLoading(false);
      
      return token;
    } catch (error) {
      console.error('Error fetching AssemblyAI token:', error);
      setIsDictationLoading(false);
      return null;
    }
  };

  const scheduleTokenRefresh = (expiry) => {
    if (tokenRefreshTimeoutRef.current) {
      clearTimeout(tokenRefreshTimeoutRef.current);
    }
    
    const now = new Date();
    const timeUntilRefresh = expiry.getTime() - now.getTime();
    
    if (timeUntilRefresh > 0) {
      tokenRefreshTimeoutRef.current = setTimeout(() => {
        fetchAssemblyAIToken();
      }, timeUntilRefresh);
    } else {
      // If token is already expired, fetch immediately
      fetchAssemblyAIToken();
    }
  };

  // Fetch token on app start
  useEffect(() => {
    fetchAssemblyAIToken();
    
    return () => {
      if (tokenRefreshTimeoutRef.current) {
        clearTimeout(tokenRefreshTimeoutRef.current);
      }
    };
  }, []);

  // Fetch user subscription data
  const fetchUserSubscription = async () => {
    try {
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

  // Update user subscription hours
  const updateUserSubscriptionHours = async (hoursUsed) => {
    try {
      const updatedSubscription = await client.graphql({
        query: mutations.updateUserSubscription,
        variables: {
          input: {
            owner: user.username,
            hoursleft: userSubscription.hoursleft - hoursUsed
          }
        }
      });
      setUserSubscription(updatedSubscription.data.updateUserSubscription);
    } catch (error) {
      console.error("Error updating user subscription:", error);
    }
  };

  // Initialize NoSleep
  useEffect(() => {
    noSleepRef.current = new NoSleep();
    return () => {
      if (noSleepRef.current) {
        noSleepRef.current.disable();
      }
    };
  }, []);

  // Setup transcription
  const setupTranscription = (token) => {
    return new Promise((resolve, reject) => {
      rtRef.current = new RealtimeTranscriber({
        token: token,
        sampleRate: 16000,
        endUtteranceSilenceThreshold: 1500,
      });
      rtRef.current.connect();
      
      rtRef.current.on('open', resolve);
      rtRef.current.on('error', reject);
      
      const texts = {};
      rtRef.current.on("transcript", (message) => {
        texts[message.audio_start] = message.text;
        const sortedTexts = Object.entries(texts)
          .sort(([a], [b]) => a - b)
          .map(([, text]) => text)
          .join(' ');
        setTranscription(sortedTexts);
        setClipboardContent(sortedTexts);
      });
    });
  };

  // Timer functions
  const startTimer = () => {
    setTimer(0);
    timerIntervalRef.current = setInterval(() => {
      setTimer(prevTimer => prevTimer + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
  };

  // Start dictation
  const startDictation = async () => {
    try {
      setIsDictationLoading(true);
      setClipboardContent(""); // Clear content before loading
      
      // Check subscription
      const subscription = await fetchUserSubscription();
      if (!subscription || subscription.hoursleft <= 0) {
        console.error('User has no remaining hours');
        alert('You have no remaining dictation hours. Please upgrade your subscription.');
        setIsDictationLoading(false);
        return;
      }

      // Check if token needs refresh
      const now = new Date();
      if (!assemblyAIToken || !tokenExpiry || now >= tokenExpiry) {
        await fetchAssemblyAIToken();
      }

      await setupTranscription(assemblyAIToken);

      // Request mic access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        }
      });
      streamRef.current = stream;

      // Configure recorder
      const rawUaString = navigator.userAgent;
      let uaString = rawUaString.toLowerCase();
      let mimeType = /iphone|ipad/i.test(uaString) ? 'audio/wav;codecs=pcm' : 'audio/webm;codecs=pcm';
      let recorderType = /iphone|ipad/i.test(uaString) ? RecordRTC.StereoAudioRecorder : RecordRTC.StereoAudioRecorder;
      
      recorder.current = new RecordRTC(stream, {
        type: 'audio',
        mimeType: mimeType,
        recorderType: recorderType,
        timeSlice: 250,
        desiredSampRate: 16000,
        numberOfAudioChannels: 1,
        bufferSize: 4096,
        audioBitsPerSecond: 128000,
        ondataavailable: async (blob) => {
          if(!rtRef.current) return;
          const buffer = await blob.arrayBuffer();
          rtRef.current.sendAudio(buffer);
        },
      });

      // Start recording
      recorder.current.startRecording();
      setIsTranscribing(true);
      setIsDictationActive(true);
      
      if (noSleepRef.current) {
        noSleepRef.current.enable();
      }
      
      startTimer();
      setIsDictationLoading(false);
    } catch (error) {
      console.error('Error starting dictation:', error);
      setIsDictationLoading(false);
      setIsDictationActive(false);
      alert('Failed to start dictation. Please try again.');
    }
  };

  // Stop dictation
  const stopDictation = () => {
    if (recorder.current && recorder.current.state !== 'stopped') {
      recorder.current.stopRecording(() => {
        if (rtRef.current) {
          rtRef.current.close();
        }
        
        if (noSleepRef.current) {
          noSleepRef.current.disable();
        }
        
        stopTimer();
        
        const hoursUsed = timer / 3600; // Convert seconds to hours
        updateUserSubscriptionHours(hoursUsed);
        
        setIsTranscribing(false);
        setIsDictationActive(false);
        
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      });
    }
  };

  // Toggle dictation state
  const toggleDictation = () => {
    if (isTranscribing) {
      stopDictation();
    } else {
      startDictation();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recorder.current && recorder.current.state !== 'stopped') {
        recorder.current.stopRecording();
      }
      
      if (rtRef.current) {
        rtRef.current.close();
      }
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      if (noSleepRef.current) {
        noSleepRef.current.disable();
      }
      
      stopTimer();
      
      if (tokenRefreshTimeoutRef.current) {
        clearTimeout(tokenRefreshTimeoutRef.current);
      }
    };
  }, []);

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
        setNotes(filteredNotes.slice(0, 25));
        setTranscripts(filteredTranscripts.slice(0, 25));
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
            return updatedNotes.slice(0, 25);
          });
        }
        
        if (updatedData.transcript && updatedData.transcript.trim() !== "") {
          console.log('New transcript:', updatedData.transcript);
          setTranscripts(prevTranscripts => {
            const updatedTranscripts = [updatedData, ...prevTranscripts.filter(transcript => transcript.timestamp !== updatedData.timestamp)];
            setNewItems(new Set([...newItems, updatedData.timestamp]));
            return updatedTranscripts.slice(0, 25);
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
    let contentToCopy;
    if (isPopupMenu) {
      contentToCopy = selectedContent || clipboardContent;
    } else {
      // When copying from clipboard buttons, directly use textarea value
      contentToCopy = clipboardTextareaRef.current?.value || '';
    }
    const plainText = extractPlainText(contentToCopy);
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
            <section className={`left-panel ${isCollapsed ? 'collapsed' : ''}`}>
              <div className="fade-content">
                <TogglePanel showNotes={showNotes} setShowNotes={setShowNotes} />
                <div className="list-container">
                  {renderItems()}
                </div>
              </div>
            </section>
            <div className="mobile-toggle-overlay"></div>
            <div className="mobile-toggle-button" onClick={togglePanel}>
              {isCollapsed ? <span className="material-symbols-rounded">sort</span> : <span className="material-symbols-rounded">left_panel_close</span>}
            </div>
            <section className="clipboard-container">
              <h2 className="panel-header">Your Clipboard</h2>
              <ClipboardButtons 
                toggleRecordingPopup={toggleRecordingPopup} 
                toggleDictationPopup={toggleDictationPopup}
                toggleEditPanel={toggleEditPanel}
                showEditPanel={showEditPanel}
                setClipboardContent={setClipboardContent}
                handleCopy={handleCopy}
                showCopyMessage={showCopyMessage}
                isDictationLoading={isDictationLoading}
                isTranscribing={isTranscribing}
                startDictation={toggleDictation}
              />
              <Clipboard
                clipboardTextareaRef={clipboardTextareaRef}
                clipboardContent={clipboardContent}
                setClipboardContent={setClipboardContent}
                streamContent={streamingText}
                setShowCopyMessage={setShowCopyMessage}
                isDisabled={isDictationLoading}
                isTranscribing={isTranscribing}
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
      <PWARedirect />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/app/*" element={<ProtectedApp />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
