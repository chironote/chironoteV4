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
import CookieConsent from './components/CookieConsent/CookieConsent';
import CreditPopup from './components/Recording/CreditLimit';
import IntroTour from './components/IntroTour/IntroTour';
import ErrorBanner from './components/ErrorBanner';
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
import { trackPageView } from './utils/analytics'; // Import our custom tracking
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
    // Standard GA pageview based on path
    ReactGA.send({ hitType: "pageview", page: location.pathname + location.search });

    // Custom, more descriptive page view event
    let descriptivePageName = '';
    const path = location.pathname;

    if (path === '/') {
      descriptivePageName = 'LandingPage_View';
    } else if (path.startsWith('/app')) {
      // For /app, you might want to distinguish further if there are key sub-sections
      // For now, a general 'App' view. If /app is the main recording/dictation area:
      descriptivePageName = 'App_Main_View'; 
    } else if (path.startsWith('/account')) {
      descriptivePageName = 'AccountPage_View';
    }
    // Add more 'else if' blocks here for other distinct sections of your application
    // e.g., if you had a dedicated /settings page, /help, etc.

    if (descriptivePageName) {
      trackPageView(descriptivePageName);
    } else {
      // Fallback for paths not explicitly named, using a cleaned-up version of the path
      // This helps catch any new/unhandled routes
      const fallbackPageName = path.substring(1).replace(/\//g, '_') || 'UnknownPage_View';
      trackPageView(fallbackPageName.charAt(0).toUpperCase() + fallbackPageName.slice(1) + '_View');
    }
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

  // Get ISO week number and year for grouping
  const weekStart = getWeekStartDate(date);
  const weekLabel = weekStart.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
  
  return { 
    day: weekday, 
    time: time, 
    weekStart: weekStart.getTime(),
    weekLabel: weekLabel
  };
};

// Helper function to get the start of the week (Monday)
const getWeekStartDate = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  // Adjust to make Monday the first day (0 = Sunday, 1 = Monday, etc.)
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  // Reset to midnight
  monday.setHours(0, 0, 0, 0);
  return monday;
};

// Helper function to group items by week
const groupItemsByWeek = (items) => {
  const groupedItems = {};
  
  items.forEach(item => {
    const { weekStart, weekLabel } = formatTimestamp(item.timestamp);
    if (!groupedItems[weekStart]) {
      groupedItems[weekStart] = {
        weekStart,
        weekLabel,
        items: []
      };
    }
    groupedItems[weekStart].items.push(item);
  });
  
  return Object.values(groupedItems).sort((a, b) => b.weekStart - a.weekStart);
};

// Component to render list items (Notes or Transcripts)
const ListItem = ({ item, onClick, isNote, onDragStart, isNew, onMouseEnter }) => {
  const content = (isNote ? item.note : item.transcript) || '';
  const displayText = item.noteLabel || getFirstSentenceOrSubstring(content);

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
  const [selectedTimestamp, setSelectedTimestamp] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null); // Add selectedItem to track full item object
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
  const [isWebSocketConnecting, setIsWebSocketConnecting] = useState(false);
  const [collapsedWeeks, setCollapsedWeeks] = useState(new Set());
  const [showErrorBanner, setShowErrorBanner] = useState(false); // Control ErrorBanner visibility
  
  // Dictation specific states
  const [isDictationLoading, setIsDictationLoading] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const clipboardTextareaRef = useRef(null);
  const copyMessageTimeoutRef = useRef(null);

  const handleTextStreamUpdate = useCallback((newText) => {
    setStreamingText(newText);
    setClipboardContent(newText);
    // Don't automatically close the recording popup here
    // setShowRecordingPopup(false);
  }, []);

  const handleTransitionToMainApp = useCallback(() => {
    // Close the recording popup when transcript generation is complete
    setShowRecordingPopup(false);
  }, []);

  const recordingManager = RecordingManager({ 
    onTextStreamUpdate: handleTextStreamUpdate,
    onTransitionToMainApp: handleTransitionToMainApp
  });

  // Initialize dictation functionality
  const dictation = Dictation({
    onTextStreamUpdate: handleTextStreamUpdate,
    setClipboardContent,
    username: user.username
  });

  // Update local states from dictation component
  useEffect(() => {
    setIsDictationLoading(dictation.isDictationLoading);
    setIsTranscribing(dictation.isTranscribing);
    setIsWebSocketConnecting(dictation.isWebSocketConnecting);
  }, [
    dictation.isDictationLoading, 
    dictation.isTranscribing, 
    dictation.isWebSocketConnecting
  ]);

  useEffect(() => {
    const fetchNotes = async () => {
      setIsLoading(true);
      try {
      // TODO: NOTELABEL FEATURE - This query will automatically include noteLabel 
      // after running `amplify push` and `amplify codegen`
      const notesData = await client.graphql({
        query: queries.listNotes,
        variables: { 
          owner: user.username,
          sortDirection: "DESC",
          limit: 120  // Increased from 50 to 120 to ensure we have enough after filtering
        }
      });
        const fetchedNotes = notesData.data.listNotes.items;
        
        const filteredNotes = fetchedNotes.filter(item => item.note && item.note.trim() !== "");
        const filteredTranscripts = fetchedNotes.filter(item => item.transcript && item.transcript.trim() !== "");
        
        // Since we're already getting data in DESC order, just take the first 100
        setNotes(filteredNotes.slice(0, 100));
        setTranscripts(filteredTranscripts.slice(0, 100));
        setQueryLoaded(true);

        // Initialize collapsed weeks - collapse all except the most recent week
        if (filteredNotes.length > 0 || filteredTranscripts.length > 0) {
          // Get all items and find the most recent week
          const allItems = [...filteredNotes, ...filteredTranscripts];
          const groupedWeeks = groupItemsByWeek(allItems);
          
          if (groupedWeeks.length > 0) {
            // Get the most recent week start timestamp
            const mostRecentWeekStart = groupedWeeks[0].weekStart;
            
            // Create a set of all week starts except the most recent
            const initialCollapsedWeeks = new Set(
              groupedWeeks
                .slice(1) // Skip the first (most recent) week
                .map(week => week.weekStart)
            );
            
            setCollapsedWeeks(initialCollapsedWeeks);
          }
        }
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
        setIsWebSocketConnecting(connectionState === 'connecting');
      }
    });

    // TODO: NOTELABEL FEATURE - This subscription will automatically include noteLabel 
    // after running `amplify push` and `amplify codegen`
    const subscription = client.graphql({ 
      query: subscriptions.onUpdateNotesByOwner,
      variables: { owner: user.username }
    }).subscribe({
      next: ({ data }) => {
        console.log('Received data from subscription:', data);
        const updatedData = data.onUpdateNotesByOwner;
        
        if (updatedData.note && updatedData.note.trim() !== "") {
          setNotes(prevNotes => {
            const updatedNotes = [updatedData, ...prevNotes.filter(note => note.timestamp !== updatedData.timestamp)];
            setNewItems(new Set([...newItems, updatedData.timestamp]));
            return updatedNotes.slice(0, 100);
          });
        }
        
        if (updatedData.transcript && updatedData.transcript.trim() !== "") {
          setTranscripts(prevTranscripts => {
            const updatedTranscripts = [updatedData, ...prevTranscripts.filter(transcript => transcript.timestamp !== updatedData.timestamp)];
            setNewItems(new Set([...newItems, updatedData.timestamp]));
            return updatedTranscripts.slice(0, 100);
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
    const screenWidth = window.innerWidth;
    
    // For medium screens (780px-1200px), close history panel when opening edit panel
    if (screenWidth >= 780 && screenWidth < 1200) {
      if (!showEditPanel) {
        // Opening edit panel - close history panel
        setIsCollapsed(true);
      }
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
    setSelectedContent(showNotes ? item.note : item.transcript);
    // Store the timestamp for use in the ContentPopup
    setSelectedTimestamp(item.timestamp);
    setShowContentPopup(prev => !prev);
    setShowPopupMenu(false);
  };

  const togglePopupMenu = (e) => {
    e.stopPropagation();
    setShowPopupMenu(prev => !prev);
  };

  const togglePanel = () => {
    const screenWidth = window.innerWidth;
    
    // For medium screens (780px-1200px), close edit panel when opening history panel
    if (screenWidth >= 780 && screenWidth < 1200) {
      if (isCollapsed) {
        // Opening history panel - close edit panel
        setShowEditPanel(false);
      }
    }
    
    setIsCollapsed(!isCollapsed);
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

  const handleLabelUpdate = async (newLabel) => {
    console.log('🏷️ handleLabelUpdate called with:', { newLabel, selectedItem: selectedItem ? { owner: selectedItem.owner, timestamp: selectedItem.timestamp, hasNote: !!selectedItem.note, hasTranscript: !!selectedItem.transcript } : null });
    
    if (!selectedItem) {
      console.warn('❌ handleLabelUpdate: No selectedItem found');
      return;
    }
    
    const uniqueId = selectedItem.owner + selectedItem.timestamp;
    console.log('🔍 Using unique ID for updates:', uniqueId);
    
    try {
      // Update backend database using updateNotes mutation (noteLabel field is included in schema)
      console.log('🚀 Attempting backend update...');
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
      console.log('✅ Backend update successful');
      
      // Update local state immediately for responsive UI
      console.log('🔄 Updating local state...');
      
      // Update notes array if the item has note content
      if (selectedItem.note && selectedItem.note.trim() !== "") {
        console.log('📝 Updating notes array');
        setNotes(prevNotes => {
          const updatedNotes = prevNotes.map(note => 
            (note.owner + note.timestamp) === uniqueId 
              ? { ...note, noteLabel: newLabel }
              : note
          );
          console.log('📝 Notes array updated, found match:', updatedNotes.some(note => (note.owner + note.timestamp) === uniqueId && note.noteLabel === newLabel));
          return updatedNotes;
        });
      }
      
      // Update transcripts array if the item has transcript content
      if (selectedItem.transcript && selectedItem.transcript.trim() !== "") {
        console.log('📄 Updating transcripts array');
        setTranscripts(prevTranscripts => {
          const updatedTranscripts = prevTranscripts.map(transcript => 
            (transcript.owner + transcript.timestamp) === uniqueId 
              ? { ...transcript, noteLabel: newLabel }
              : transcript
          );
          console.log('📄 Transcripts array updated, found match:', updatedTranscripts.some(transcript => (transcript.owner + transcript.timestamp) === uniqueId && transcript.noteLabel === newLabel));
          return updatedTranscripts;
        });
      }
      
      // Update the selected item
      console.log('🎯 Updating selectedItem');
      setSelectedItem(prev => ({ ...prev, noteLabel: newLabel }));
      
      console.log('✅ handleLabelUpdate completed successfully');
      
    } catch (error) {
      console.error('❌ Error updating note label:', error);
      console.error('❌ Error details:', {
        message: error.message,
        graphQLErrors: error.errors,
        networkError: error.networkError
      });
      
      // Still update local state for immediate UI feedback even if backend fails
      console.log('🔄 Backend failed, updating local state only...');
      
      // Update notes array if the item has note content
      if (selectedItem.note && selectedItem.note.trim() !== "") {
        setNotes(prevNotes => 
          prevNotes.map(note => 
            (note.owner + note.timestamp) === uniqueId 
              ? { ...note, noteLabel: newLabel }
              : note
          )
        );
      }
      
      // Update transcripts array if the item has transcript content
      if (selectedItem.transcript && selectedItem.transcript.trim() !== "") {
        setTranscripts(prevTranscripts => 
          prevTranscripts.map(transcript => 
            (transcript.owner + transcript.timestamp) === uniqueId 
              ? { ...transcript, noteLabel: newLabel }
              : transcript
          )
        );
      }
      
      // Update the selected item
      setSelectedItem(prev => ({ ...prev, noteLabel: newLabel }));
      
      // TODO: Add user-friendly error notification to the UI
      alert('Failed to save label to database. Changes are visible locally but may not persist.');
    }
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
    
    // Only enable keyboard shortcuts on desktop (window width > 768px)
    if (window.innerWidth > 768) {
      // Ctrl+B shortcut to toggle edit panel and focus on edit text field
      if (event.ctrlKey && event.key === 'b') {
        event.preventDefault();
        const screenWidth = window.innerWidth;
        
        // For medium screens (780px-1200px), close history panel when opening edit panel
        if (screenWidth >= 780 && screenWidth < 1200) {
          if (!showEditPanel) {
            // Opening edit panel - close history panel
            setIsCollapsed(true);
          }
        }
        
        // Toggle edit panel
        setShowEditPanel(prev => !prev);
        // If we're opening the panel, we need to wait for it to render before focusing
        if (!showEditPanel) {
          setTimeout(() => {
            const editTextarea = document.querySelector('.edit-textarea');
            if (editTextarea) editTextarea.focus();
          }, 100);
        }
      }
      
      // Ctrl+Backspace shortcut to clear the clipboard textarea
      if (event.ctrlKey && event.key === 'Backspace') {
        event.preventDefault();
        // Clear clipboard content
        setClipboardContent("");
      }
      
      // Ctrl+` (backtick) shortcut to toggle the left side panel
      if (event.ctrlKey && event.key === '`') {
        event.preventDefault();
        // Only toggle if not disabled during recording or transcript generation
        if (!(showRecordingPopup || recordingManager.isRecording || 
              recordingManager.isPreparingTranscript || recordingManager.isGeneratingSummary)) {
          const screenWidth = window.innerWidth;
          
          console.log('Ctrl+` pressed - Screen width:', screenWidth, 'isCollapsed:', isCollapsed, 'showEditPanel:', showEditPanel);
          
          // For medium screens (780px-1200px), close edit panel when opening history panel
          if (screenWidth >= 780 && screenWidth < 1200) {
            if (isCollapsed) {
              console.log('Medium screen: About to open history panel, closing edit panel');
              // Opening history panel - close edit panel
              setShowEditPanel(false);
            }
          }
          
          // Toggle the left panel by directly updating the state
          setIsCollapsed(prev => !prev);
        }
      }
    }
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

  const toggleWeekCollapse = (weekStart) => {
    setCollapsedWeeks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(weekStart)) {
        newSet.delete(weekStart);
      } else {
        newSet.add(weekStart);
      }
      return newSet;
    });
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
    
    const groupedByWeek = groupItemsByWeek(items);
    
    return groupedByWeek.map(week => (
      <div key={week.weekStart} className="week-group">
        <div 
          className="week-header" 
          onClick={() => toggleWeekCollapse(week.weekStart)}
        >
          <span className="week-label">Week of {week.weekLabel}</span>
          <span className="collapse-icon">
            {collapsedWeeks.has(week.weekStart) ? '▶' : '▼'}
          </span>
        </div>
        
        <div className={`week-items ${collapsedWeeks.has(week.weekStart) ? 'collapsed' : ''}`}>
          {week.items.map(item => (
            <ListItem
              key={item.timestamp}
              item={item}
              onClick={toggleContentPopup}
              isNote={showNotes}
              onDragStart={setDraggedContent}
              isNew={newItems.has(item.timestamp)}
              onMouseEnter={() => removeHighlight(item.timestamp)}
            />
          ))}
        </div>
      </div>
    ));
  };

  const updateClipboardContent = useCallback((newContent) => {
    setClipboardContent(newContent);
  }, []);

  return (
    <div className={`app ${recordingManager.isProcessing ? 'processing-active' : ''}`}>
      <IntroTour />
      <Navbar 
        username={user.username}
        onSignOut={signOut}
      />
      <ErrorBanner isVisible={showErrorBanner} />

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
            <div 
              className={`mobile-toggle-button ${showRecordingPopup || recordingManager.isRecording || recordingManager.isPreparingTranscript || recordingManager.isGeneratingSummary ? 'disabled' : ''}`} 
              onClick={(showRecordingPopup || recordingManager.isRecording || recordingManager.isPreparingTranscript || recordingManager.isGeneratingSummary) ? undefined : togglePanel}
            >
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
                isWebSocketConnecting={isWebSocketConnecting}
                startDictation={dictation.toggleDictation}
                dictationReady={dictation.isInitialized}
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

            {(showRecordingPopup || recordingManager.isPreparingTranscript || recordingManager.isGeneratingSummary) && (
              <Recording
                toggleRecordingPopup={toggleRecordingPopup}
                recordingType={recordingType}
                isRecording={recordingManager.isRecording}
                isPaused={recordingManager.isPaused}
                isPreparingTranscript={recordingManager.isPreparingTranscript}
                isGeneratingSummary={recordingManager.isGeneratingSummary}
                startRecording={recordingManager.startRecording}
                stopRecording={recordingManager.stopRecording}
                discardRecording={recordingManager.discardRecording}
                pauseRecording={recordingManager.pauseRecording}
                resumeRecording={recordingManager.resumeRecording}
              />
            )}

            {dictation.creditPopupElement}
            
            {showDictationPopup && (
              <div className="create-note-popup" onClick={toggleDictationPopup}>
                <div className="popup-content" onClick={(e) => e.stopPropagation()}>
                  <h2>Dictation</h2>
                  <p>Click the button below to start or stop dictation.</p>
                  <button 
                    className={`dictation-button ${isTranscribing ? 'recording' : ''}`}
                    onClick={dictation.toggleDictation}
                    disabled={isDictationLoading}
                  >
                    {isDictationLoading ? 'Initializing...' : isTranscribing ? 'Stop Dictation' : 'Start Dictation'}
                  </button>
                </div>
              </div>
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
                timestamp={selectedTimestamp}
                noteLabel={selectedItem?.noteLabel}
                onLabelUpdate={handleLabelUpdate}
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

// Custom wrapper to handle initialState parameter
function AuthWrapper() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialAuthState = searchParams.get('initialState');
  
  // Configure authenticator props based on URL parameters
  const authenticatorProps = {
    components,
    services,
    initialState: initialAuthState === 'signUp' ? 'signUp' : 'signIn'
  };
  
  // Clear URL parameters after reading them
  useEffect(() => {
    if (initialAuthState) {
      // Remove the query parameter without causing a navigation
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, [initialAuthState]);
  
  return withAuthenticator(AuthenticatedApp, authenticatorProps)();
}

const ProtectedApp = () => <AuthWrapper />;

function App() {
  return (
    <Router>
      <RouteTracker />
      <PWARedirect />
      <CookieConsent />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/app/*" element={<ProtectedApp />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
