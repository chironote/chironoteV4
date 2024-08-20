import React, { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';
import { NOTES, TRANSCRIPTS } from './constants/constants';
import Account from './components/Account/Account';
import Feedback from './components/Feedback/Feedback';
import Header from './components/Header/Header';
import Recording from './components/Recording/Recording';
import TogglePanel from './components/TogglePanel';
import ClipboardButtons from './components/ClipboardButtons';
import EditPanel from './components/EditPanel';
import Clipboard from './components/Clipboard';
import ContentPopup from './components/ContentPopup';
import { Amplify, API, graphqlOperation } from 'aws-amplify';

import { withAuthenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';

import awsExports from './aws-exports';
Amplify.configure(awsExports);


// Helper function to extract plain text from HTML
const extractPlainText = (html) => {
  const tempElement = document.createElement('div');
  tempElement.innerHTML = html;
  return tempElement.textContent?.trim() || '';
};

// Component to render list items (Notes or Transcripts)
const ListItem = ({ item, onClick }) => (
  <div key={item} className="list-item" onClick={() => onClick(item)}>
    {item.split('.')[0]}
  </div>
);

function App({ signOut, user }) {
  const [currentPage, setCurrentPage] = useState('main');
  const [showNotes, setShowNotes] = useState(true);
  const [showEditPanel, setShowEditPanel] = useState(false);
  const [showRecordingPopup, setShowRecordingPopup] = useState(false);
  const [recordingType, setRecordingType] = useState('');
  const [showContentPopup, setShowContentPopup] = useState(false);
  const [selectedContent, setSelectedContent] = useState('');
  const [showPopupMenu, setShowPopupMenu] = useState(false);
  const [clipboardContent, setClipboardContent] = useState('');
  const [editContent, setEditContent] = useState('');
  const [showCopyMessage, setShowCopyMessage] = useState(false);
  const [showPopupCopyMessage, setShowPopupCopyMessage] = useState(false);

  const clipboardTextareaRef = useRef(null);
  const copyMessageTimeoutRef = useRef(null);

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

  // Show or hide content popup
  const toggleContentPopup = (content) => {
    setSelectedContent(content);
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
    const items = showNotes ? NOTES : TRANSCRIPTS;
    return items.map(item => (
      <ListItem key={item} item={item} onClick={toggleContentPopup} />
    ));
  };

  return (
    <div className="app">
      {/* Modify the Header component to include user info and sign out button */}
      <Header 
        setCurrentPage={setCurrentPage} 
        currentPage={currentPage}
        username={user.username}
        onSignOut={signOut}
      />

      <main className="app-main">
        {/* Conditionally render the main content based on the current page */}
        {currentPage === 'main' && (
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
              <ClipboardButtons toggleRecordingPopup={toggleRecordingPopup} showEditPanel={toggleRecordingPopup} toggleEditPanel={toggleEditPanel} />

              {/* Clipboard area for note taking */}
              <Clipboard clipboardTextareaRef={clipboardTextareaRef} clipboardContent={clipboardContent} handleCopyPaste={handleCopyPaste} setClipboardContent={setClipboardContent} showCopyMessage={showCopyMessage} />
            </section>

            {/* Edit panel for updating notes */}
            <EditPanel showEditPanel={showEditPanel} editContent={editContent} setEditContent={setEditContent} setClipboardContent={setClipboardContent} />
          </>
        )}

        {/* Conditionally render the Account or Feedback pages */}
        {currentPage === 'account' && <Account setCurrentPage={setCurrentPage} />}
        {currentPage === 'feedback' && <Feedback />}
      </main>

      {/* Popup for recording options */}
      {showRecordingPopup && (
        <Recording
          toggleRecordingPopup={toggleRecordingPopup}
          recordingType={recordingType}
        />
      )}

      {/* Content popup for displaying selected note or transcript */}
      {showContentPopup && (
        <ContentPopup setShowContentPopup={setShowContentPopup} setShowPopupMenu={setShowPopupMenu} showNotes={showNotes} showPopupMenu={showPopupMenu} togglePopupMenu={togglePopupMenu} handleCopy={handleCopy} handleSendToClipboard={handleSendToClipboard} selectedContent={selectedContent} showPopupCopyMessage={showPopupCopyMessage} />
      )}
    </div>
  );
}

export default withAuthenticator(App);